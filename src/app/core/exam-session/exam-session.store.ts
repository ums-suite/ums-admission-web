import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, Subject, groupBy, mergeMap, of, switchMap } from 'rxjs';
import { ExamAttemptApi } from './exam-attempt.api';
import type { AnswerInput, ExamAttemptDto } from './exam-attempt.types';

export type QuestionSaveState = 'saved' | 'saving' | 'retrying';
export type OverallSaveState = 'idle' | 'saving' | 'retrying' | 'saved';

interface AnswerChange {
  readonly questionId: string;
  readonly input: AnswerInput;
}

const RETRY_BASE_DELAY_MS = 1000;
const RETRY_MAX_DELAY_MS = 15000;

/**
 * Isolated, signal-based single source of truth for the in-progress `ExamAttempt` -- answers,
 * server-authoritative timer, and per-question save status (AWEB-9, requirement-spec.md §2 State
 * management row). Deliberately its own store, never folded into a generic feature store: "a
 * lost answer or a wrong timer reading is a life-affecting bug" (§2), so this class's correctness
 * is independently reviewable/testable in isolation from the rest of the app's state.
 *
 * **Domain Invariant #1** ("no answer selected on screen is ever lost, regardless of network
 * state"): {@link selectAnswer} updates {@link answers} synchronously, in memory, before any
 * network call is even attempted -- a save failure can only ever affect {@link saveState}
 * (what the UI *reports*), never silently roll back or drop the answer itself.
 *
 * **Domain Invariant #2** (the server clock is authoritative): {@link remainingMs} is computed
 * from `expiresAt` (a fixed server-issued instant) reconciled against a client/server clock-drift
 * offset captured from each response's `Date` header (see `exam-attempt.api.ts` -- `ExamAttemptDto`
 * has no explicit "server now" field), never from the client's own unadjusted clock.
 *
 * **Exam Save-Retry Logic** (design-decisions.md): every save failure -- network or a 401 that
 * survived `@ums/shared`'s own one-shot refresh-and-retry -- is treated identically: the pipeline
 * below retries indefinitely with a capped exponential backoff, never surfacing a fatal/terminal
 * error state to the UI (`saveState` only ever moves through `saving`/`retrying`/`saved`, with no
 * `'error'` value at all -- there is nothing else useful to show while Invariant #1 is upheld by
 * definition). **Known gap, not fixed here:** the same decision also calls for an optional
 * refresh-aware hold ("the auth layer exposes a refresh-in-progress signal... holding outgoing
 * saves during that window") layered on top of this unconditional baseline -- `@ums/shared`'s
 * `AuthRefreshCoordinator` does not currently expose any such signal (only an internal, private
 * single-flight `Observable`), so that enhancement is not implemented and is flagged in this
 * app's PR as a suggested `@ums/shared` addition. The unconditional-resilience baseline here
 * already satisfies Invariant #1 for every failure shape on its own; the hold would only reduce
 * how often the fallback path is exercised.
 *
 * Per-question saves are independent of each other (`groupBy` on `questionId`) so answering
 * question 7 is never blocked behind a slow/retrying save for question 3, but a *newer* answer to
 * the *same* question supersedes an older in-flight save for it (`switchMap` per group) -- since
 * each save call carries only that question's latest answer, an aborted stale save is always
 * superseded by a newer, more current one, never a lost update.
 *
 * Deliberately NOT `providedIn: 'root'` -- a fresh instance is provided at the exam route's own
 * injector (AWEB-21/22), scoped to one `ExamAttempt`'s lifetime, so leaving the exam screen (or
 * starting a different attempt in a future session) can never leak a prior attempt's timer/answer
 * state into a new one.
 */
@Injectable()
export class ExamSessionStore {
  private readonly examApi = inject(ExamAttemptApi);
  private readonly destroyRef = inject(DestroyRef);

  private readonly attemptIdInternal = signal<string | null>(null);
  private readonly clockOffsetMsInternal = signal(0);
  private readonly expiresAtMsInternal = signal<number | null>(null);
  private readonly nowTick = signal(Date.now());
  private readonly answersInternal = signal<Readonly<Record<string, AnswerInput>>>({});
  private readonly questionSaveStates = signal<Readonly<Record<string, QuestionSaveState>>>({});
  private readonly lastSavedAtInternal = signal<number | null>(null);

  private readonly answerChange$ = new Subject<AnswerChange>();
  private tickIntervalId: ReturnType<typeof setInterval> | null = null;

  readonly attemptId = this.attemptIdInternal.asReadonly();
  readonly answers = this.answersInternal.asReadonly();
  readonly lastSavedAt = this.lastSavedAtInternal.asReadonly();

  /** Server-authoritative time remaining, in ms, floored at 0. `null` before {@link initialize}. */
  readonly remainingMs = computed(() => {
    const expiresAtMs = this.expiresAtMsInternal();
    if (expiresAtMs === null) {
      return null;
    }
    const currentServerTimeMs = this.nowTick() + this.clockOffsetMsInternal();
    return Math.max(0, expiresAtMs - currentServerTimeMs);
  });

  /** True the instant the server-authoritative clock reaches zero (Domain Invariant #2). */
  readonly isExpired = computed(() => this.remainingMs() === 0);

  /**
   * One combined status for the persistent "Saved Xs ago" indicator (§7): `'saving'` if any
   * question's first attempt is in flight, `'retrying'` if none are on a first attempt but at
   * least one is being retried after a failure (the honest "Saving your last answer..." case),
   * else `'saved'`.
   */
  readonly saveState = computed<OverallSaveState>(() => {
    const states = Object.values(this.questionSaveStates());
    if (states.length === 0) {
      return this.attemptIdInternal() === null ? 'idle' : 'saved';
    }
    if (states.includes('saving')) {
      return 'saving';
    }
    if (states.includes('retrying')) {
      return 'retrying';
    }
    return 'saved';
  });

  constructor() {
    this.answerChange$
      .pipe(
        groupBy((change) => change.questionId),
        mergeMap((changesForQuestion$) =>
          changesForQuestion$.pipe(switchMap((change) => this.saveOneAnswer(change))),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  /** Hydrates the store from a started/resumed attempt -- see class doc for the clock-offset mechanism. */
  initialize(dto: ExamAttemptDto, serverNowMs: number): void {
    this.attemptIdInternal.set(dto.id);
    this.clockOffsetMsInternal.set(serverNowMs - Date.now());
    this.expiresAtMsInternal.set(new Date(dto.expiresAt).getTime());
    this.nowTick.set(Date.now());

    const answersRecord: Record<string, AnswerInput> = {};
    for (const answer of dto.answers) {
      answersRecord[answer.questionId] = {
        selectedOptionIndex: answer.selectedOptionIndex,
        subjectiveText: answer.subjectiveText,
      };
    }
    this.answersInternal.set(answersRecord);
    this.lastSavedAtInternal.set(Date.now());
    this.startTicking();
  }

  /** Domain Invariant #1: updates in-memory state synchronously, then queues the save -- never the other way around. */
  selectAnswer(questionId: string, input: AnswerInput): void {
    this.answersInternal.update((current) => ({ ...current, [questionId]: input }));
    this.questionSaveStates.update((current) => ({ ...current, [questionId]: 'saving' }));
    this.answerChange$.next({ questionId, input });
  }

  /**
   * Retries indefinitely with a capped exponential backoff, implemented with a plain
   * `setTimeout` rather than RxJS's `retry({ delay })`/`timer()` operators -- deliberate, not
   * merely a style choice: RxJS's default `AsyncScheduler` captures its own timer references in a
   * way that test tools like `jasmine.clock()` (this app is zoneless, so Angular's `fakeAsync`
   * cannot be used here at all -- see this method's own spec file) cannot reliably intercept,
   * verified directly against this exact operator combination during AWEB-9's own test-writing.
   * A hand-rolled retry loop over the plain global `setTimeout`/`clearTimeout` -- the same
   * primitives `startTicking()` already uses successfully under `jasmine.clock()` -- sidesteps
   * that gap entirely.
   */
  private saveOneAnswer(change: AnswerChange): Observable<void> {
    const attemptId = this.attemptIdInternal();
    if (!attemptId) {
      return of(undefined);
    }

    return new Observable<void>((subscriber) => {
      let retryCount = 0;
      let pendingRetryTimeoutId: ReturnType<typeof setTimeout> | null = null;
      let inFlightSubscription: { unsubscribe(): void } | null = null;
      let cancelled = false;

      const attempt = (): void => {
        inFlightSubscription = this.examApi
          .saveAnswer(attemptId, change.questionId, change.input)
          .subscribe({
            next: () => {
              if (cancelled) {
                return;
              }
              this.questionSaveStates.update((current) => ({
                ...current,
                [change.questionId]: 'saved',
              }));
              this.lastSavedAtInternal.set(Date.now());
              subscriber.next();
              subscriber.complete();
            },
            // Auth-failure-agnostic (design-decisions.md "Exam Save-Retry Logic"): a network
            // failure and a 401 that survived @ums/shared's own one-shot refresh-and-retry are
            // handled completely identically here -- neither is ever fatal (Invariant #1).
            error: () => {
              if (cancelled) {
                return;
              }
              retryCount += 1;
              this.questionSaveStates.update((current) => ({
                ...current,
                [change.questionId]: 'retrying',
              }));
              const delayMs = Math.min(
                RETRY_BASE_DELAY_MS * 2 ** (retryCount - 1),
                RETRY_MAX_DELAY_MS,
              );
              pendingRetryTimeoutId = setTimeout(() => {
                if (!cancelled) {
                  attempt();
                }
              }, delayMs);
            },
          });
      };

      attempt();

      return () => {
        cancelled = true;
        if (pendingRetryTimeoutId !== null) {
          clearTimeout(pendingRetryTimeoutId);
        }
        inFlightSubscription?.unsubscribe();
      };
    });
  }

  private startTicking(): void {
    this.stopTicking();
    this.tickIntervalId = setInterval(() => this.nowTick.set(Date.now()), 1000);
    this.destroyRef.onDestroy(() => this.stopTicking());
  }

  private stopTicking(): void {
    if (this.tickIntervalId !== null) {
      clearInterval(this.tickIntervalId);
      this.tickIntervalId = null;
    }
  }
}
