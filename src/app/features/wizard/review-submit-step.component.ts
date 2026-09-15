import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { Router } from '@angular/router';
import { UmsButtonComponent, UmsCardComponent, UmsModalComponent } from '@ums/design-system';
import type { UmsApiError } from '@ums/shared';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { TranslationService } from '../../core/i18n/translation.service';
import { WizardDraftStore } from './wizard-draft.store';

/**
 * Review & submit-lock step (AWEB-17, requirement-spec.md §3.2, §7 "print-quality summary card",
 * Domain Invariant #4: "an Application cannot be edited after submission-lock, and the UI must
 * make this irreversibility unmistakable *before* the applicant confirms"). Uses `UmsModalComponent`
 * directly rather than `UmsConfirmationDialogComponent` -- that component's reason field is
 * mandatory by design (an admin destructive-action pattern, per its own class doc), which doesn't
 * fit an applicant confirming their own submission with no "reason" to give; the modal's own
 * explicit, hard-to-misclick "Yes, submit and lock" button is this step's own confirmation control.
 */
@Component({
  selector: 'app-review-submit-step',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UmsButtonComponent, UmsCardComponent, UmsModalComponent, TranslatePipe],
  templateUrl: './review-submit-step.component.html',
})
export class ReviewSubmitStepComponent {
  protected readonly store = inject(WizardDraftStore);
  private readonly translation = inject(TranslationService);
  private readonly router = inject(Router);

  readonly back = output();

  protected readonly confirmDialogOpen = signal(false);
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected openConfirm(): void {
    this.errorMessage.set(null);
    this.confirmDialogOpen.set(true);
  }

  protected onConfirmed(): void {
    this.confirmDialogOpen.set(false);
    this.submitting.set(true);
    this.store.submit(
      () => void this.router.navigateByUrl('/app/payment'),
      (error: UmsApiError) => {
        this.submitting.set(false);
        this.errorMessage.set(error.message || this.translation.t('wizard.review.serverError'));
      },
    );
  }

  protected onCancelled(): void {
    this.confirmDialogOpen.set(false);
  }
}
