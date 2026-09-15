import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  UmsBadgeComponent,
  UmsButtonComponent,
  UmsCardComponent,
  UmsModalComponent,
  UmsOfflineBannerComponent,
} from '@ums/design-system';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { TranslationService } from '../../core/i18n/translation.service';
import { ExamAttemptApi } from '../../core/exam-session/exam-attempt.api';
import { ExamSessionStore } from '../../core/exam-session/exam-session.store';
import type { ExamAttemptDto, ExamQuestionDto } from '../../core/exam-session/exam-attempt.types';
import {
  formatRemainingTime,
  isAnnouncementCheckpoint,
  remainingTimeAnnouncement,
  timerTone as computeTimerTone,
} from './exam-timer.util';

type ScreenState = 'loading' | 'error' | 'ready';

const SUBJECTIVE_SAVE_DEBOUNCE_MS = 800;

/**
 * Exam in-progress screen (AWEB-22, requirement-spec.md §3.5, §7 "The exam screen: purpose-built,
 * not a repurposed form"). Wires {@link ExamSessionStore} (built in AWEB-9/23/25) to a real UI for
 * the first time -- question navigation (jump/flag), a persistent server-authoritative countdown
 * ({@link ExamSessionStore.remainingMs}), a persistent unambiguous auto-save indicator
 * ({@link ExamSessionStore.saveState}), and honest surfacing of every submit/connectivity/
 * session-conflict state the store already tracks.
 *
 * **Store lifetime**: `providers: [ExamSessionStore]` below gives this component its OWN store
 * instance (not the root-provided kind) -- the store's own class doc requires this ("scoped to
 * one ExamAttempt's lifetime... can never leak a prior attempt's timer/answer state into a new
 * one"). Navigating away and back always re-fetches and re-initializes fresh.
 *
 * **Exam-mode theme (requirement-spec.md §2/§7/§10.6): confirmed gap.** §10.6 resolves the
 * "higher-contrast, minimal-chrome" exam-mode theme to live in `@ums/design-system` as a theme
 * *variant*, but the installed package version exposes no such variant (`ThemeMode` is only
 * `'light' | 'dark' | 'system'`, `TypographyRegister` only `'marketing' | 'operational'` -- no
 * `'exam'` value of either). Flagged prominently in this app's PR as a suggested `@ums/design-
 * system` addition. In the meantime this screen approximates the effect within its own template
 * only (a single-column, low-decoration layout using existing tokens/components) -- not a forked
 * component set, per §2's own explicit ban on that. Separately, "hide the normal app shell/nav
 * while an exam is active" is a non-issue today: no persistent app shell/nav is mounted anywhere
 * in this app yet (`App`'s own template is a bare `<router-outlet>`), so there is no chrome to
 * hide in the first place.
 *
 * **Question content (confirmed, blocking gap -- see `exam-attempt.types.ts`'s `ExamQuestionDto`
 * class doc)**: `ExamAttemptApi.getAttemptQuestions` calls an assumed, unverified route. This
 * screen is built to degrade gracefully rather than block on it: {@link buildOrderedQuestions}
 * always renders one navigable grid entry per `selectedQuestionIds` entry regardless of whether
 * real content came back for it, and any question missing real content renders a
 * "content unavailable" placeholder instead of answer inputs -- the timer, save-status, and
 * submit machinery all keep working regardless of whether any question content loaded at all.
 */
@Component({
  selector: 'app-exam-attempt',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    UmsBadgeComponent,
    UmsButtonComponent,
    UmsCardComponent,
    UmsModalComponent,
    UmsOfflineBannerComponent,
    TranslatePipe,
  ],
  providers: [ExamSessionStore],
  templateUrl: './exam-attempt.component.html',
  styleUrl: './exam-attempt.component.scss',
})
export class ExamAttemptComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly examApi = inject(ExamAttemptApi);
  private readonly translation = inject(TranslationService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly store = inject(ExamSessionStore);

  protected readonly state = signal<ScreenState>('loading');
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly questionsLoadFailed = signal(false);
  protected readonly unavailableQuestionIds = signal<ReadonlySet<string>>(new Set());
  protected readonly currentIndex = signal(0);
  protected readonly announcement = signal('');
  protected readonly confirmSubmitOpen = signal(false);
  protected readonly confirmAcknowledged = signal(false);

  private readonly debounceHandles = new Map<string, ReturnType<typeof setTimeout>>();

  protected readonly questions = this.store.questions;
  protected readonly totalCount = computed(() => this.questions().length);
  protected readonly answeredCount = computed(() => Object.keys(this.store.answers()).length);
  protected readonly unansweredCount = computed(() => this.totalCount() - this.answeredCount());
  protected readonly flaggedCount = computed(() => this.store.flaggedQuestionIds().size);

  protected readonly currentQuestion = computed<ExamQuestionDto | null>(() => {
    const list = this.questions();
    return list[this.currentIndex()] ?? null;
  });

  protected readonly timerLabel = computed(() =>
    formatRemainingTime(this.store.remainingMs() ?? 0),
  );
  protected readonly tone = computed(() => computeTimerTone(this.store.remainingMs() ?? 0));

  protected readonly lastSavedLabel = computed(() => {
    const lastSavedAt = this.store.lastSavedAt();
    if (lastSavedAt === null) {
      return null;
    }
    const elapsedSeconds = Math.max(0, Math.round((Date.now() - lastSavedAt) / 1000));
    return elapsedSeconds < 5
      ? this.translation.t('exam.attempt.save.justNow')
      : this.translation.t('exam.attempt.save.secondsAgo', { seconds: elapsedSeconds });
  });

  constructor() {
    // Non-critical accessibility side-effect (NFR §4 "screen-reader-friendly timer
    // announcements") -- unlike ExamSessionStore's own ticking logic (see its class doc for why
    // it avoids effect() for jasmine.clock() testability reasons), nothing here gates a
    // correctness invariant, so ordinary flush-timing slack is harmless.
    effect(() => {
      const remainingMs = this.store.remainingMs();
      if (remainingMs !== null && isAnnouncementCheckpoint(remainingMs)) {
        this.announcement.set(remainingTimeAnnouncement(remainingMs));
      }
    });

    this.destroyRef.onDestroy(() => {
      for (const handle of this.debounceHandles.values()) {
        clearTimeout(handle);
      }
    });
  }

  ngOnInit(): void {
    const attemptId = this.route.snapshot.paramMap.get('id');
    if (!attemptId) {
      this.state.set('error');
      return;
    }

    this.examApi.getAttempt(attemptId).subscribe({
      next: ({ body: attempt, serverNowMs }) => {
        this.examApi.getAttemptQuestions(attemptId).subscribe({
          next: (fetched) => this.finishInitializing(attempt, serverNowMs, fetched),
          error: () => {
            this.questionsLoadFailed.set(true);
            this.finishInitializing(attempt, serverNowMs, []);
          },
        });
      },
      error: () => this.state.set('error'),
    });
  }

  private finishInitializing(
    attempt: ExamAttemptDto,
    serverNowMs: number,
    fetched: readonly ExamQuestionDto[],
  ): void {
    const { questions, unavailableIds } = buildOrderedQuestions(
      attempt.selectedQuestionIds,
      fetched,
    );
    this.unavailableQuestionIds.set(unavailableIds);
    this.store.initialize(attempt, serverNowMs, questions);
    this.state.set('ready');
  }

  protected goToQuestion(index: number): void {
    if (index >= 0 && index < this.totalCount()) {
      this.currentIndex.set(index);
    }
  }

  protected goToPrevious(): void {
    this.goToQuestion(this.currentIndex() - 1);
  }

  protected goToNext(): void {
    this.goToQuestion(this.currentIndex() + 1);
  }

  protected toggleFlag(): void {
    const question = this.currentQuestion();
    if (question) {
      this.store.toggleFlag(question.id);
    }
  }

  protected isFlagged(questionId: string): boolean {
    return this.store.flaggedQuestionIds().has(questionId);
  }

  protected isAnswered(questionId: string): boolean {
    return this.store.answers()[questionId] !== undefined;
  }

  protected isContentAvailable(questionId: string): boolean {
    return !this.unavailableQuestionIds().has(questionId);
  }

  protected selectOption(questionId: string, optionIndex: number): void {
    this.store.selectAnswer(questionId, { selectedOptionIndex: optionIndex });
  }

  protected selectedOptionIndex(questionId: string): number | undefined {
    return this.store.answers()[questionId]?.selectedOptionIndex;
  }

  protected subjectiveText(questionId: string): string {
    return this.store.answers()[questionId]?.subjectiveText ?? '';
  }

  /** Debounced on every keystroke, flushed immediately on blur -- requirement-spec.md §2 Auto-save row. */
  protected onSubjectiveInput(questionId: string, value: string): void {
    const existing = this.debounceHandles.get(questionId);
    if (existing !== undefined) {
      clearTimeout(existing);
    }
    this.debounceHandles.set(
      questionId,
      setTimeout(() => {
        this.debounceHandles.delete(questionId);
        this.store.selectAnswer(questionId, { subjectiveText: value });
      }, SUBJECTIVE_SAVE_DEBOUNCE_MS),
    );
  }

  protected onSubjectiveBlur(questionId: string, value: string): void {
    const existing = this.debounceHandles.get(questionId);
    if (existing !== undefined) {
      clearTimeout(existing);
      this.debounceHandles.delete(questionId);
    }
    this.store.selectAnswer(questionId, { subjectiveText: value });
  }

  protected openConfirmSubmit(): void {
    this.confirmAcknowledged.set(false);
    this.confirmSubmitOpen.set(true);
  }

  protected onConfirmSubmitClosed(): void {
    this.confirmSubmitOpen.set(false);
  }

  /** AWEB-24: an explicit, hard-to-misclick step -- the checkbox acknowledgment gates this, not just a bare "are you sure" click. */
  protected confirmManualSubmit(): void {
    if (!this.confirmAcknowledged()) {
      return;
    }
    this.confirmSubmitOpen.set(false);
    this.store.submit('manual');
  }

  protected goToDashboard(): void {
    void this.router.navigateByUrl('/app');
  }
}

/**
 * Reconciles `selectedQuestionIds` (always authoritative for which/how-many questions exist and
 * their fixed order) against whatever content `getAttemptQuestions` actually returned -- see this
 * component's own class doc for the confirmed gap this guards against.
 */
export function buildOrderedQuestions(
  selectedQuestionIds: readonly string[],
  fetched: readonly ExamQuestionDto[],
): { questions: readonly ExamQuestionDto[]; unavailableIds: ReadonlySet<string> } {
  const byId = new Map(fetched.map((question) => [question.id, question]));
  const unavailableIds = new Set<string>();
  const questions = selectedQuestionIds.map((id) => {
    const found = byId.get(id);
    if (found) {
      return found;
    }
    unavailableIds.add(id);
    const placeholder: ExamQuestionDto = {
      id,
      category: '',
      difficulty: 'Medium',
      text: '',
      options: [],
      isSubjective: false,
      maxScore: 0,
    };
    return placeholder;
  });
  return { questions, unavailableIds };
}
