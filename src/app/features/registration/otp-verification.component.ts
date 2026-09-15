import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { UmsButtonComponent, UmsOtpInputComponent } from '@ums/design-system';
import type { UmsApiError } from '@ums/shared';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { TranslationService } from '../../core/i18n/translation.service';
import { ApplicantApi } from './applicant.api';
import type { OtpChannel } from './applicant.types';

const RESEND_COOLDOWN_SECONDS = 30;

/**
 * OTP-based verification of the applicant's chosen channel (AWEB-10, requirement-spec.md §3.1:
 * "OTP-based verification of the chosen channel before any Applicant profile work begins" --
 * here, before the registration flow is considered complete). Two channels are available
 * (email always, mobile if one was supplied) per `Applicant.IsVerified`'s "either is sufficient"
 * domain rule (`ums-core`'s own `Applicant.cs` doc comment) -- this screen defaults to email
 * (always present) and offers switching to mobile when available, rather than requiring both.
 */
@Component({
  selector: 'app-otp-verification',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UmsButtonComponent, UmsOtpInputComponent, TranslatePipe],
  templateUrl: './otp-verification.component.html',
})
export class OtpVerificationComponent {
  private readonly applicantApi = inject(ApplicantApi);
  private readonly translation = inject(TranslationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly applicantId = input.required<string>();
  readonly email = input.required<string>();
  readonly mobile = input<string | undefined>(undefined);

  readonly verified = output();

  protected readonly channel = signal<OtpChannel>('Email');
  protected readonly codeRequested = signal(false);
  protected readonly requesting = signal(false);
  protected readonly verifying = signal(false);
  /** The live, possibly-incomplete, space-padded value from the OTP input boxes. */
  protected readonly codeInputValue = signal('');
  /** Only set once every box holds a real digit (`UmsOtpInputComponent`'s `(completed)` event) -- never a partial code. */
  protected readonly completedCode = signal('');
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly resendCooldownSeconds = signal(0);

  private cooldownIntervalId: ReturnType<typeof setInterval> | null = null;

  protected get destination(): string {
    return this.channel() === 'Email' ? this.email() : (this.mobile() ?? '');
  }

  protected switchChannel(channel: OtpChannel): void {
    this.channel.set(channel);
    this.codeRequested.set(false);
    this.codeInputValue.set('');
    this.completedCode.set('');
    this.errorMessage.set(null);
  }

  protected onCodeCompleted(code: string): void {
    this.completedCode.set(code);
  }

  protected requestCode(): void {
    this.requesting.set(true);
    this.errorMessage.set(null);

    this.applicantApi.requestOtp(this.applicantId(), this.channel()).subscribe({
      next: () => {
        this.requesting.set(false);
        this.codeRequested.set(true);
        this.startResendCooldown();
      },
      // ApplicantApi already normalizes every failure through @ums/shared's toUmsApiError.
      error: (error: UmsApiError) => {
        this.requesting.set(false);
        this.errorMessage.set(error.message || this.translation.t('otp.serverError.generic'));
      },
    });
  }

  protected verifyCode(): void {
    this.verifying.set(true);
    this.errorMessage.set(null);

    this.applicantApi
      .verifyOtp(this.applicantId(), this.channel(), this.completedCode())
      .subscribe({
        next: () => {
          this.verifying.set(false);
          this.verified.emit();
        },
        error: (error: UmsApiError) => {
          this.verifying.set(false);
          this.completedCode.set('');
          this.errorMessage.set(error.message || this.translation.t('otp.serverError.generic'));
        },
      });
  }

  private startResendCooldown(): void {
    this.stopResendCooldown();
    this.resendCooldownSeconds.set(RESEND_COOLDOWN_SECONDS);
    this.cooldownIntervalId = setInterval(() => {
      const remaining = this.resendCooldownSeconds() - 1;
      this.resendCooldownSeconds.set(Math.max(0, remaining));
      if (remaining <= 0) {
        this.stopResendCooldown();
      }
    }, 1000);
    this.destroyRef.onDestroy(() => this.stopResendCooldown());
  }

  private stopResendCooldown(): void {
    if (this.cooldownIntervalId !== null) {
      clearInterval(this.cooldownIntervalId);
      this.cooldownIntervalId = null;
    }
  }
}
