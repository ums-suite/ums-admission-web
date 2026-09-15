import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { OtpVerificationComponent } from './otp-verification.component';
import { RegistrationFormComponent } from './registration-form.component';
import type { ApplicantDto } from './applicant.types';

type RegistrationStep = 'profile' | 'verify' | 'complete';

/**
 * Orchestrates AWEB-10's three steps: profile capture -> OTP verification -> completion.
 * A local `currentStep` signal is enough here (unlike the multi-step Application Wizard, AWEB-13,
 * which needs save-as-draft/cross-session resume) since registration is a short, one-sitting flow
 * with no save-and-leave requirement in the spec.
 */
@Component({
  selector: 'app-registration-flow',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RegistrationFormComponent, OtpVerificationComponent, TranslatePipe],
  template: `
    @switch (step()) {
      @case ('profile') {
        <app-registration-form (registered)="onRegistered($event)" />
      }
      @case ('verify') {
        @if (applicant(); as a) {
          <app-otp-verification
            [applicantId]="a.id"
            [email]="a.email"
            [mobile]="a.mobile"
            (verified)="onVerified()"
          />
        }
      }
      @case ('complete') {
        <section class="registration-complete">
          <h1>{{ 'registration.complete.title' | translate }}</h1>
          <p>{{ 'registration.complete.body' | translate }}</p>
        </section>
      }
    }
  `,
})
export class RegistrationFlowComponent {
  protected readonly step = signal<RegistrationStep>('profile');
  protected readonly applicant = signal<ApplicantDto | null>(null);

  protected onRegistered(applicant: ApplicantDto): void {
    this.applicant.set(applicant);
    this.step.set('verify');
  }

  protected onVerified(): void {
    this.step.set('complete');
  }
}
