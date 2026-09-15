import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ProvisionalModuleApiBase } from '../../core/http/provisional-module-api.base';
import type { ApplicantDto, OtpChannel, RegisterApplicantRequest } from './applicant.types';

/**
 * Interim client for `Admission`'s Applicant endpoints (AWEB-10) -- see this app's README "Known
 * @ums/shared contract gap". Routes verified directly against `ums-core`'s own
 * `UMS.Modules.Admission.Api.Endpoints.ApplicantEndpoints`:
 * - `POST /api/v1/admission/applicants/` (anonymous) -- register.
 * - `POST /api/v1/admission/applicants/{id}/otp` (anonymous) -- request a verification code.
 * - `POST /api/v1/admission/applicants/{id}/verify` (anonymous) -- verify it.
 * - `GET /api/v1/admission/applicants/me` (authenticated) -- the caller's own Applicant profile.
 *
 * **Important, verified cross-team gap (flagged in this app's PR/README, not fixed here):**
 * registration provisions the applicant's Identity `User` with a *randomly generated, never
 * returned or communicated* initial password (`ApplicantService.GenerateInitialPassword()`) --
 * and `ums-core`/`@ums/shared` currently has no password-reset/"set your password" endpoint at
 * all (`@ums/shared`'s own README: "the generated client's TOTP MFA / password-reset surfaces
 * don't exist because Identity itself hasn't built them yet"). This means a freshly-registered
 * applicant has no way to actually learn or set a password to log in with today. The
 * registration flow's final screen (`registration-flow.component.ts`) says this honestly rather
 * than implying login is immediately possible.
 */
@Injectable({ providedIn: 'root' })
export class ApplicantApi extends ProvisionalModuleApiBase {
  register(request: RegisterApplicantRequest): Observable<ApplicantDto> {
    return this.normalizeErrors(
      this.http.post<ApplicantDto>(this.apiUrl('admission/applicants/'), request),
    );
  }

  requestOtp(applicantId: string, channel: OtpChannel): Observable<void> {
    return this.normalizeErrors(
      this.http
        .post<unknown>(this.apiUrl(`admission/applicants/${applicantId}/otp`), { channel })
        .pipe(map(() => undefined)),
    );
  }

  verifyOtp(applicantId: string, channel: OtpChannel, code: string): Observable<void> {
    return this.normalizeErrors(
      this.http
        .post<unknown>(this.apiUrl(`admission/applicants/${applicantId}/verify`), {
          channel,
          code,
        })
        .pipe(map(() => undefined)),
    );
  }

  getMyProfile(): Observable<ApplicantDto> {
    return this.normalizeErrors(
      this.http.get<ApplicantDto>(this.apiUrl('admission/applicants/me')),
    );
  }
}
