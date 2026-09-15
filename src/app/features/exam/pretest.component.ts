import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UmsButtonComponent, UmsCardComponent } from '@ums/design-system';
import type { UmsApiError } from '@ums/shared';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { ApplicationApi } from '../wizard/application.api';
import { AdmissionTestApi } from './admission-test.api';
import { ExamAttemptApi } from '../../core/exam-session/exam-attempt.api';

type PretestState = 'loading' | 'ready' | 'starting' | 'already-started-unresolvable' | 'error';

const STORAGE_PREFIX = 'ums-admission-web:exam-attempt:';

/**
 * Pre-test screen (AWEB-21, requirement-spec.md §3.5): a mandatory, un-skippable
 * instructions/rules acknowledgement plus a basic device/connectivity check, gating the "Begin
 * Exam" control -- it stays disabled until every rule is explicitly acknowledged AND the device
 * reports itself online, matching §3.5's "mandatory, un-skippable" wording literally (there is no
 * way to reach the exam without passing through and acknowledging this screen first).
 *
 * **No literal countdown-to-start-time**: see `admission-test.types.ts`'s class doc for the
 * confirmed cross-team gap (no backend field names the assigned `TestSlot`'s start instant) --
 * this screen shows the assigned slot's identifier (already the same field the admit-card screen
 * surfaces) rather than inventing a fake countdown target.
 *
 * **Same-browser-only resume on a 409 conflict**: `ExamAttemptService.StartAsync` returns
 * `exam_attempt.already_started` (no attempt id in the error body) if one already exists for this
 * applicant/test -- mirroring `WizardDraftStore`/`PaymentAttemptStore`'s own established
 * localStorage-keyed workaround for the same class of "no query-by-natural-key endpoint" gap,
 * this component remembers a just-started attempt's id locally (keyed by testId) so returning to
 * this screen after a crash/reload can resume directly rather than re-hitting the same conflict
 * with no way forward. A different device/browser still has no way to discover it -- flagged in
 * the PR as the same cross-team gap already documented for the wizard/payment flows.
 */
@Component({
  selector: 'app-pretest',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UmsButtonComponent, UmsCardComponent, TranslatePipe],
  templateUrl: './pretest.component.html',
})
export class PretestComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly applicationApi = inject(ApplicationApi);
  private readonly testApi = inject(AdmissionTestApi);
  private readonly examApi = inject(ExamAttemptApi);

  protected readonly state = signal<PretestState>('loading');
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly testSlotId = signal<string | null>(null);
  private testId: string | null = null;

  protected readonly rulesAcknowledged = signal(false);
  protected readonly deviceCheckAcknowledged = signal(false);
  protected readonly isOnline = signal(typeof navigator === 'undefined' ? true : navigator.onLine);

  protected readonly canBegin = computed(
    () =>
      this.state() === 'ready' &&
      this.rulesAcknowledged() &&
      this.deviceCheckAcknowledged() &&
      this.isOnline(),
  );

  ngOnInit(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.isOnline.set(true));
      window.addEventListener('offline', () => this.isOnline.set(false));
    }

    const applicationId = this.route.snapshot.paramMap.get('applicationId');
    if (!applicationId) {
      this.state.set('error');
      return;
    }

    this.applicationApi.getApplication(applicationId).subscribe({
      next: (application) => {
        this.testSlotId.set(application.assignedTestSlotId ?? null);
        this.testApi.getByCampaign(application.campaignId).subscribe({
          next: (test) => {
            this.testId = test.id;
            this.state.set('ready');
          },
          error: () => this.state.set('error'),
        });
      },
      error: () => this.state.set('error'),
    });
  }

  protected begin(): void {
    const testId = this.testId;
    if (!this.canBegin() || !testId) {
      return;
    }
    this.state.set('starting');
    this.examApi.startAttempt(testId).subscribe({
      next: ({ body }) => {
        this.writeStoredAttemptId(testId, body.id);
        void this.router.navigate(['/app/exam/attempt', body.id]);
      },
      error: (error: UmsApiError) => this.handleStartError(testId, error),
    });
  }

  private handleStartError(testId: string, error: UmsApiError): void {
    const alreadyStarted = error.status === 409 || error.code === 'exam_attempt.already_started';
    if (!alreadyStarted) {
      this.errorMessage.set(error.message || null);
      this.state.set('error');
      return;
    }

    const storedAttemptId = this.readStoredAttemptId(testId);
    if (storedAttemptId) {
      void this.router.navigate(['/app/exam/attempt', storedAttemptId]);
      return;
    }
    this.state.set('already-started-unresolvable');
  }

  private readStoredAttemptId(testId: string): string | null {
    try {
      return localStorage.getItem(STORAGE_PREFIX + testId);
    } catch {
      return null;
    }
  }

  private writeStoredAttemptId(testId: string, attemptId: string): void {
    try {
      localStorage.setItem(STORAGE_PREFIX + testId, attemptId);
    } catch {
      // Best-effort only -- see WizardDraftStore's identical rationale.
    }
  }
}
