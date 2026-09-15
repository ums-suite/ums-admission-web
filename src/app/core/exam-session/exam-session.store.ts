import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, Subject, groupBy, mergeMap, of, switchMap } from 'rxjs';
import { ExamAttemptApi } from './exam-attempt.api';
import type { AnswerInput, ExamAttemptDto, ExamQuestionDto } from './exam-attempt.types';

export type QuestionSaveState = 'saved' | 'saving' | 'retrying';
export type OverallSaveState = 'idle' | 'saving' | 'retrying' | 'saved';
export type SubmitReason = 'manual' | 'timeout';
/**
 * `waiting-for-saves` is the edge-cases.md "Auto-Save In Flight Exactly When the Server-
 * Authoritative Exam Clock Expires" state -- surfaced to the UI as "Saving your last answer..."
 * rather than a bare spinner (design-decisions.md's own trade-off note: this delay must be
 * "honestly communicated via the existing save-status indicator rather than hidden").
 */
export type SubmitPhase = 'idle' | 'waiting-for-saves' | 'submitting' | 'retrying' | 'submitted';

interface AnswerChange {
  readonly questionId: string;
  readonly input: AnswerInput;
}

const RETRY_BASE_DELAY_MS = 1000;
const RETRY_MAX_DELAY_MS = 15000;

/** edge-cases.md "Auto-Save In Flight Exactly When..." -- "a short, fixed grace window (low single-digit seconds)". */
const AUTO_SUBMIT_GRACE_WINDOW_MS = 4000;
const GRACE_WINDOW_POLL_INTERVAL_MS = 200;
const SUBMIT_RETRY_BASE_DELAY_MS = 1000;
const SUBMIT_RETRY_MAX_DELAY_MS = 15000;

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
 *
 * **AWEB-23 (auto-submit-on-timeout)**: {@link checkAutoSubmit} runs on every 1s tick and fires
 * {@link submit}`('timeout')` exactly once the instant {@link isExpired} is true -- never the
 * client's own `setTimeout`-at-`durationMinutes` guess, so a drifted or backgrounded tab's timer
 * can only ever be *late* to notice expiry (corrected the next tick), never early. This also
 * covers the crash-recovery case of resuming an already-expired attempt (`initialize()` starts
 * the same 1s ticker regardless of how much time is left), at the cost of at most a 1s delay
 * before the client notices -- an acceptable bound given the server's own timeout-sweep remains
 * the actual authoritative enforcement point regardless of when this client-side call fires.
 * Deliberately hooked into the same `setInterval` `startTicking()` already uses -- not a signal
 * `effect()` -- so this stays exercisable by the exact same `jasmine.clock()` mechanism the rest
 * of this store's timer logic already relies on for testability (see {@link saveOneAnswer}'s own
 * class doc for why `effect()`/RxJS timers are avoided here).
 *
 * **AWEB-25 (connectivity loss)**: {@link isOnline} mirrors `window.online`/`offline` events; the
 * per-question retry pipeline (see {@link saveOneAnswer}) already retries indefinitely regardless
 * of this signal (Invariant #1 holds even if a tab never learns it's back online), but every
 * pending backoff timer is also force-fired the instant an `online` event arrives, so
 * reconnection resumes saving immediately rather than waiting out whatever backoff delay was
 * already in progress.
 *
 * **AWEB-25 (two-tab/-session same-attempt)**: {@link hasSessionConflict} is a **same-device-only**
 * mitigation via `BroadcastChannel` leader election (the same class of mechanism design-
 * decisions.md's "Same-Device Cross-Tab Leader Election" names for the result/waiting-room
 * screens) -- **not** the edge-case's literal "server-side single-session enforcement": direct
 * inspection of `ums-core`'s `ExamAttemptService`/`ExamAttempt` domain confirms no session-lock
 * concept exists there at all (`TryLockAsync` is a one-shot submit-time conditional write, not a
 * held session lock covering the whole attempt) -- a genuine, blocking cross-team gap for the
 * *cross-device* case, flagged in this app's PR. This store's own mitigation only ever protects
 * against the common single-device "opened a second tab by accident" case.
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
  private readonly questionsInternal = signal<readonly ExamQuestionDto[]>([]);
  private readonly flaggedInternal = signal<ReadonlySet<string>>(new Set());
  private readonly submitPhaseInternal = signal<SubmitPhase>('idle');
  private readonly submittedAttemptInternal = signal<ExamAttemptDto | null>(null);
  private readonly isOnlineInternal = signal(
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );
  private readonly hasSessionConflictInternal = signal(false);

  private readonly answerChange$ = new Subject<AnswerChange>();
  private tickIntervalId: ReturnType<typeof setInterval> | null = null;
  private readonly forceRetryHandlers = new Map<string, () => void>();
  private autoSubmitTriggered = false;
  private lockChannel: BroadcastChannel | null = null;
  private readonly tabId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  private lockClaimedAtMs = 0;

  readonly attemptId = this.attemptIdInternal.asReadonly();
  readonly answers = this.answersInternal.asReadonly();
  readonly lastSavedAt = this.lastSavedAtInternal.asReadonly();
  readonly questions = this.questionsInternal.asReadonly();
  readonly flaggedQuestionIds = this.flaggedInternal.asReadonly();
  readonly submitPhase = this.submitPhaseInternal.asReadonly();
  readonly submittedAttempt = this.submittedAttemptInternal.asReadonly();
  /** AWEB-25: mirrors `navigator.onLine`, purely informational -- the save-retry pipeline never depends on this being accurate (Invariant #1 holds either way). */
  readonly isOnline = this.isOnlineInternal.asReadonly();
  /** AWEB-25 (two-tab case) -- see class doc's scope note. */
  readonly hasSessionConflict = this.hasSessionConflictInternal.asReadonly();

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

    this.setupConnectivityTracking();
  }

  /** Hydrates the store from a started/resumed attempt -- see class doc for the clock-offset mechanism. */
  initialize(
    dto: ExamAttemptDto,
    serverNowMs: number,
    questions: readonly ExamQuestionDto[] = [],
  ): void {
    this.attemptIdInternal.set(dto.id);
    this.clockOffsetMsInternal.set(serverNowMs - Date.now());
    this.expiresAtMsInternal.set(new Date(dto.expiresAt).getTime());
    this.nowTick.set(Date.now());
    this.questionsInternal.set(questions);

    const answersRecord: Record<string, AnswerInput> = {};
    for (const answer of dto.answers) {
      answersRecord[answer.questionId] = {
        selectedOptionIndex: answer.selectedOptionIndex,
        subjectiveText: answer.subjectiveText,
      };
    }
    this.answersInternal.set(answersRecord);
    this.lastSavedAtInternal.set(Date.now());

    if (dto.status === 'Submitted') {
      // Resuming a tab against an attempt that was already submitted elsewhere (crash-recovery
      // edge case) -- render the submitted-confirmation state immediately, never re-open a locked
      // attempt for further answer selection.
      this.submitPhaseInternal.set('submitted');
      this.submittedAttemptInternal.set(dto);
      return;
    }

    this.startTicking();
    this.setupSessionLock(dto.id);
  }

  /** Domain Invariant #1: updates in-memory state synchronously, then queues the save -- never the other way around. */
  selectAnswer(questionId: string, input: AnswerInput): void {
    if (this.submittedAttemptInternal() !== null) {
      // The attempt is locked (submitted, manually or on timeout) -- Domain Invariant #4's sibling
      // guarantee for exams: no further input is accepted once locked, defensively enforced here
      // even though the UI itself must already prevent reaching this call.
      return;
    }
    this.answersInternal.update((current) => ({ ...current, [questionId]: input }));
    this.questionSaveStates.update((current) => ({ ...current, [questionId]: 'saving' }));
    this.answerChange$.next({ questionId, input });
  }

  /** AWEB-22: flag-for-review is purely a local navigation aid, never sent to the server (no such concept exists on `ExamAttemptDto`/`SaveAnswerRequest`). */
  toggleFlag(questionId: string): void {
    this.flaggedInternal.update((current) => {
      const next = new Set(current);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  }

  /**
   * AWEB-23/24: manual ('manual') or timeout-triggered ('timeout') submission. Idempotent by
   * construction -- a second call while already submitting/submitted is a silent no-op, which is
   * exactly what protects against the edge-cases.md race where a manual submit and an
   * auto-submit-on-timeout could otherwise both fire for the same attempt.
   *
   * Domain Invariant #1 / edge-cases.md "Auto-Save In Flight Exactly When...": before calling the
   * real submit endpoint, waits (bounded by {@link AUTO_SUBMIT_GRACE_WINDOW_MS}) for every
   * in-flight/retrying question save to settle, so the server evaluates the applicant's actual
   * final answer set rather than a stale pre-save snapshot -- surfaced honestly via
   * `submitPhase() === 'waiting-for-saves'`, never a silent delay.
   */
  submit(reason: SubmitReason): void {
    if (this.submitPhaseInternal() !== 'idle') {
      return;
    }
    const attemptId = this.attemptIdInternal();
    if (!attemptId) {
      return;
    }

    const hasInFlightSave = (): boolean =>
      Object.values(this.questionSaveStates()).some((s) => s === 'saving' || s === 'retrying');

    if (!hasInFlightSave()) {
      this.finalizeSubmit(attemptId);
      return;
    }

    this.submitPhaseInternal.set('waiting-for-saves');
    const graceDeadlineMs = Date.now() + AUTO_SUBMIT_GRACE_WINDOW_MS;
    const pollId: ReturnType<typeof setInterval> = setInterval(() => {
      if (!hasInFlightSave() || Date.now() >= graceDeadlineMs) {
        clearInterval(pollId);
        this.finalizeSubmit(attemptId);
      }
    }, GRACE_WINDOW_POLL_INTERVAL_MS);
    void reason; // both reasons share identical finalize logic -- kept as a parameter for callers'/telemetry clarity only.
  }

  /**
   * The actual `submitAttempt` call, retried indefinitely with a capped backoff on failure --
   * never a fatal/terminal state (mirrors {@link saveOneAnswer}'s own posture): a submit call
   * failing at the exact moment connectivity drops (edge-cases.md "if time expires while offline")
   * must not leave the applicant believing their exam vanished. `submitPhase` reports 'retrying'
   * honestly during this window, exactly like the per-answer indicator does.
   */
  private finalizeSubmit(attemptId: string, retryCount = 0): void {
    this.submitPhaseInternal.set(retryCount === 0 ? 'submitting' : 'retrying');
    this.examApi.submitAttempt(attemptId).subscribe({
      next: ({ body }) => {
        this.submitPhaseInternal.set('submitted');
        this.submittedAttemptInternal.set(body);
        this.stopTicking();
        this.lockChannel?.close();
      },
      error: () => {
        // Reported the instant the failure happens, not deferred to the next scheduled attempt --
        // mirrors saveOneAnswer's own immediate 'retrying' report.
        this.submitPhaseInternal.set('retrying');
        const delayMs = Math.min(
          SUBMIT_RETRY_BASE_DELAY_MS * 2 ** retryCount,
          SUBMIT_RETRY_MAX_DELAY_MS,
        );
        setTimeout(() => this.finalizeSubmit(attemptId, retryCount + 1), delayMs);
      },
    });
  }

  private setupConnectivityTracking(): void {
    if (typeof window === 'undefined') {
      return;
    }
    const update = (): void => {
      this.isOnlineInternal.set(navigator.onLine);
      if (navigator.onLine) {
        // AWEB-25: "retries persisting them the instant connectivity returns" -- force-fires every
        // currently-backed-off save immediately rather than waiting out whatever exponential delay
        // was already scheduled.
        for (const forceRetry of this.forceRetryHandlers.values()) {
          forceRetry();
        }
      }
    };
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    this.destroyRef.onDestroy(() => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    });
  }

  /** AWEB-25 (two-tab case) -- see class doc's scope note for exactly what this does and does not cover. */
  private setupSessionLock(attemptId: string): void {
    if (typeof BroadcastChannel === 'undefined') {
      return;
    }
    this.lockClaimedAtMs = Date.now();
    this.lockChannel = new BroadcastChannel(`ums-admission-web:exam-lock:${attemptId}`);
    this.lockChannel.onmessage = (event: MessageEvent<{ tabId: string; claimedAtMs: number }>) => {
      const { tabId, claimedAtMs } = event.data;
      if (tabId === this.tabId) {
        return;
      }
      const otherClaimedFirst =
        claimedAtMs < this.lockClaimedAtMs ||
        (claimedAtMs === this.lockClaimedAtMs && tabId < this.tabId);
      if (otherClaimedFirst) {
        this.hasSessionConflictInternal.set(true);
      } else {
        // We claimed first -- re-announce so the later tab (re)detects the conflict, including a
        // tab that joins after our very first announcement.
        this.lockChannel?.postMessage({ tabId: this.tabId, claimedAtMs: this.lockClaimedAtMs });
      }
    };
    this.lockChannel.postMessage({ tabId: this.tabId, claimedAtMs: this.lockClaimedAtMs });
    this.destroyRef.onDestroy(() => this.lockChannel?.close());
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

      // AWEB-25: lets `setupConnectivityTracking`'s `online` handler force-fire this exact
      // question's pending backoff immediately, rather than waiting out an already-scheduled delay.
      this.forceRetryHandlers.set(change.questionId, () => {
        if (pendingRetryTimeoutId !== null) {
          clearTimeout(pendingRetryTimeoutId);
          pendingRetryTimeoutId = null;
          attempt();
        }
      });

      attempt();

      return () => {
        cancelled = true;
        this.forceRetryHandlers.delete(change.questionId);
        if (pendingRetryTimeoutId !== null) {
          clearTimeout(pendingRetryTimeoutId);
        }
        inFlightSubscription?.unsubscribe();
      };
    });
  }

  private checkAutoSubmit(): void {
    if (this.isExpired() && this.attemptIdInternal() !== null && !this.autoSubmitTriggered) {
      this.autoSubmitTriggered = true;
      this.submit('timeout');
    }
  }

  private startTicking(): void {
    this.stopTicking();
    this.tickIntervalId = setInterval(() => {
      this.nowTick.set(Date.now());
      this.checkAutoSubmit();
    }, 1000);
    this.destroyRef.onDestroy(() => this.stopTicking());
  }

  private stopTicking(): void {
    if (this.tickIntervalId !== null) {
      clearInterval(this.tickIntervalId);
      this.tickIntervalId = null;
    }
  }
}
