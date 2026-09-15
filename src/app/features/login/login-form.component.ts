import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UmsButtonComponent, UmsFormFieldComponent, UmsInputComponent } from '@ums/design-system';
import { toUmsApiError } from '@ums/shared';
import { AuthService } from '../../core/auth/auth.service';
import { AUTH_ROUTES, RETURN_URL_QUERY_PARAM } from '../../core/auth/auth-routes.constants';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { TranslationService } from '../../core/i18n/translation.service';
import {
  isLoginFormValid,
  validateLoginForm,
  type LoginFormErrors,
  type LoginFormValues,
} from './login-form.validation';

/**
 * Login via the applicant's already-verified channel (AWEB-11, requirement-spec.md §3.1). MFA is
 * role-dependent per ADR-0005/0006 and not expected for the Applicant role by default (§3.1) --
 * no MFA step is built here; if a future policy change requires it, `AuthService.login()`'s
 * response is the natural place to detect and branch on that, without this component's basic
 * identifier/password submission needing to change shape.
 *
 * Redirects to {@link AUTH_ROUTES.authenticatedHome} on success, or to `returnUrl` if `authGuard`
 * sent the applicant here from a specific page they were trying to reach.
 */
@Component({
  selector: 'app-login-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UmsButtonComponent, UmsFormFieldComponent, UmsInputComponent, TranslatePipe],
  templateUrl: './login-form.component.html',
})
export class LoginFormComponent {
  private readonly authService = inject(AuthService);
  private readonly translation = inject(TranslationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly identifier = signal('');
  protected readonly password = signal('');
  protected readonly submitted = signal(false);
  protected readonly submitting = signal(false);
  protected readonly serverErrorMessage = signal<string | null>(null);

  protected get formValues(): LoginFormValues {
    return { identifier: this.identifier(), password: this.password() };
  }

  protected get errors(): LoginFormErrors {
    return this.submitted() ? validateLoginForm(this.formValues) : {};
  }

  protected onSubmit(): void {
    this.submitted.set(true);
    this.serverErrorMessage.set(null);

    const errors = validateLoginForm(this.formValues);
    if (!isLoginFormValid(errors)) {
      return;
    }

    this.submitting.set(true);
    this.authService.login(this.identifier().trim(), this.password()).subscribe({
      next: () => {
        this.submitting.set(false);
        const returnUrl = this.route.snapshot.queryParamMap.get(RETURN_URL_QUERY_PARAM);
        void this.router.navigateByUrl(returnUrl || AUTH_ROUTES.authenticatedHome);
      },
      // Unlike ApplicantApi (AWEB-10), AuthService talks to the generated IdentityApiService
      // directly and does not pre-normalize errors -- toUmsApiError() belongs here.
      error: (error: unknown) => {
        this.submitting.set(false);
        this.serverErrorMessage.set(
          toUmsApiError(error).message || this.translation.t('login.serverError.generic'),
        );
      },
    });
  }
}
