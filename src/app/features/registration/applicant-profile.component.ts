import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { UmsButtonComponent, UmsFormFieldComponent, UmsInputComponent } from '@ums/design-system';
import type { UmsApiError } from '@ums/shared';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { TranslationService } from '../../core/i18n/translation.service';
import { ApplicantApi } from './applicant.api';
import type { ApplicantDto } from './applicant.types';
import {
  isApplicantProfileFormValid,
  validateApplicantProfileForm,
  type ApplicantProfileFormErrors,
  type ApplicantProfileFormValues,
} from './applicant-profile.validation';

/**
 * Basic `ApplicantProfile` capture, the guardian-info half of requirement-spec.md §3.1 not already
 * covered by registration's name/DOB/contact step (AWEB-10) -- AWEB-12, reached only once logged
 * in (depends on AWEB-11), unlike registration's own one-sitting anonymous flow. Loads the
 * caller's current profile via `ApplicantApi.getMyProfile()` and saves via `updateProfile()`.
 *
 * This is deliberately its own screen rather than folded into the wizard shell (AWEB-13): the
 * wizard's own first step (program choices onward) assumes a complete `ApplicantProfile` already
 * exists, matching the ticket table's own `AWEB-13` "Depends On: AWEB-12" ordering.
 */
@Component({
  selector: 'app-applicant-profile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UmsButtonComponent, UmsFormFieldComponent, UmsInputComponent, TranslatePipe],
  templateUrl: './applicant-profile.component.html',
})
export class ApplicantProfileComponent implements OnInit {
  private readonly applicantApi = inject(ApplicantApi);
  private readonly translation = inject(TranslationService);
  private readonly router = inject(Router);

  protected readonly applicantId = signal<string | null>(null);
  protected readonly loading = signal(true);
  protected readonly presentAddress = signal('');
  protected readonly guardianName = signal('');
  protected readonly guardianRelation = signal('');
  protected readonly guardianContact = signal('');

  protected readonly submitted = signal(false);
  protected readonly submitting = signal(false);
  protected readonly saved = signal(false);
  protected readonly serverErrorMessage = signal<string | null>(null);

  protected get formValues(): ApplicantProfileFormValues {
    return {
      presentAddress: this.presentAddress(),
      guardianName: this.guardianName(),
      guardianRelation: this.guardianRelation(),
      guardianContact: this.guardianContact(),
    };
  }

  protected get errors(): ApplicantProfileFormErrors {
    return this.submitted() ? validateApplicantProfileForm(this.formValues) : {};
  }

  ngOnInit(): void {
    this.applicantApi.getMyProfile().subscribe({
      next: (applicant) => {
        this.loading.set(false);
        this.hydrate(applicant);
      },
      error: () => {
        this.loading.set(false);
        this.serverErrorMessage.set(this.translation.t('profile.loadError'));
      },
    });
  }

  protected onSubmit(): void {
    this.submitted.set(true);
    this.saved.set(false);
    this.serverErrorMessage.set(null);

    const errors = validateApplicantProfileForm(this.formValues);
    if (!isApplicantProfileFormValid(errors)) {
      return;
    }

    const applicantId = this.applicantId();
    if (!applicantId) {
      return;
    }

    this.submitting.set(true);
    this.applicantApi
      .updateProfile(applicantId, {
        presentAddress: this.presentAddress().trim(),
        guardianName: this.guardianName().trim() || undefined,
        guardianRelation: this.guardianRelation().trim() || undefined,
        guardianContact: this.guardianContact().trim() || undefined,
      })
      .subscribe({
        next: (applicant) => {
          this.submitting.set(false);
          this.saved.set(true);
          this.hydrate(applicant);
        },
        error: (error: UmsApiError) => {
          this.submitting.set(false);
          this.serverErrorMessage.set(
            error.message || this.translation.t('profile.serverError.generic'),
          );
        },
      });
  }

  protected continueToWizard(): void {
    void this.router.navigateByUrl('/app/wizard');
  }

  private hydrate(applicant: ApplicantDto): void {
    this.applicantId.set(applicant.id);
    this.presentAddress.set(applicant.presentAddress ?? '');
    this.guardianName.set(applicant.guardianName ?? '');
    this.guardianRelation.set(applicant.guardianRelation ?? '');
    this.guardianContact.set(applicant.guardianContact ?? '');
  }
}
