import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import {
  UmsButtonComponent,
  UmsDatePickerComponent,
  UmsFormFieldComponent,
  UmsInputComponent,
} from '@ums/design-system';
import type { UmsApiError } from '@ums/shared';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { TranslationService } from '../../core/i18n/translation.service';
import { ApplicantApi } from './applicant.api';
import type { ApplicantDto } from './applicant.types';
import {
  isRegistrationFormValid,
  validateRegistrationForm,
  type RegistrationFormErrors,
  type RegistrationFormValues,
} from './registration-form.validation';

/**
 * Basic `ApplicantProfile` capture (AWEB-10, requirement-spec.md §3.1) -- the first step of
 * registration, before any OTP verification. Calls `POST /api/v1/admission/applicants/`
 * (anonymous) via {@link ApplicantApi}.
 *
 * Uses plain signals for form state rather than `ReactiveFormsModule`, matching
 * `@ums/design-system`'s own established convention (its form primitives are signal-input/output,
 * not `ControlValueAccessor` -- see e.g. `UmsInputComponent`'s class doc).
 */
@Component({
  selector: 'app-registration-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    UmsButtonComponent,
    UmsDatePickerComponent,
    UmsFormFieldComponent,
    UmsInputComponent,
    TranslatePipe,
  ],
  templateUrl: './registration-form.component.html',
})
export class RegistrationFormComponent {
  private readonly applicantApi = inject(ApplicantApi);
  private readonly translation = inject(TranslationService);

  readonly registered = output<ApplicantDto>();

  protected readonly givenName = signal('');
  protected readonly familyName = signal('');
  protected readonly email = signal('');
  protected readonly mobile = signal('');
  protected readonly dateOfBirth = signal<string | null>(null);
  protected readonly maxDateOfBirth = new Date().toISOString().slice(0, 10);

  protected readonly submitted = signal(false);
  protected readonly submitting = signal(false);
  protected readonly serverErrorMessage = signal<string | null>(null);

  protected get formValues(): RegistrationFormValues {
    return {
      givenName: this.givenName(),
      familyName: this.familyName(),
      email: this.email(),
      mobile: this.mobile(),
      dateOfBirth: this.dateOfBirth(),
    };
  }

  protected get errors(): RegistrationFormErrors {
    return this.submitted() ? validateRegistrationForm(this.formValues) : {};
  }

  protected onSubmit(): void {
    this.submitted.set(true);
    this.serverErrorMessage.set(null);

    const errors = validateRegistrationForm(this.formValues);
    if (!isRegistrationFormValid(errors)) {
      return;
    }

    this.submitting.set(true);
    this.applicantApi
      .register({
        givenName: this.givenName().trim(),
        familyName: this.familyName().trim(),
        email: this.email().trim(),
        mobile: this.mobile().trim() || undefined,
        dateOfBirth: this.dateOfBirth() as string,
      })
      .subscribe({
        next: (applicant) => {
          this.submitting.set(false);
          this.registered.emit(applicant);
        },
        // ApplicantApi already normalizes every failure through @ums/shared's toUmsApiError
        // (ProvisionalModuleApiBase.normalizeErrors) -- this is a UmsApiError already, never a
        // raw HttpErrorResponse to re-normalize.
        error: (error: UmsApiError) => {
          this.submitting.set(false);
          this.serverErrorMessage.set(
            error.message || this.translation.t('registration.serverError.generic'),
          );
        },
      });
  }
}
