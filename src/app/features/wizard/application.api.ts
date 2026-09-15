import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ProvisionalModuleApiBase } from '../../core/http/provisional-module-api.base';
import type {
  AcademicRecordRequest,
  ApplicationDto,
  CampaignDto,
  ProgramChoiceRequest,
  UploadDocumentRequest,
} from './application.types';

/**
 * Interim client for `Admission`'s `Application`/`Campaign` endpoints (AWEB-13..17) -- routes
 * confirmed directly against `ums-core`'s `ApplicationEndpoints.cs`/`CampaignEndpoints.cs` (see
 * `application.types.ts` class doc for the verification pass and confirmed gaps).
 */
@Injectable({ providedIn: 'root' })
export class ApplicationApi extends ProvisionalModuleApiBase {
  createApplication(campaignId: string): Observable<ApplicationDto> {
    return this.normalizeErrors(
      this.http.post<ApplicationDto>(this.apiUrl('admission/applications/'), { campaignId }),
    );
  }

  getApplication(applicationId: string): Observable<ApplicationDto> {
    return this.normalizeErrors(
      this.http.get<ApplicationDto>(this.apiUrl(`admission/applications/${applicationId}`)),
    );
  }

  /** `Draft`-only server-side; replaces the full ordered preference list in one call. */
  setProgramChoices(
    applicationId: string,
    choices: readonly ProgramChoiceRequest[],
  ): Observable<ApplicationDto> {
    return this.normalizeErrors(
      this.http.put<ApplicationDto>(
        this.apiUrl(`admission/applications/${applicationId}`),
        choices,
      ),
    );
  }

  uploadDocument(
    applicationId: string,
    request: UploadDocumentRequest,
  ): Observable<ApplicationDto> {
    return this.normalizeErrors(
      this.http.post<ApplicationDto>(
        this.apiUrl(`admission/applications/${applicationId}/documents`),
        request,
      ),
    );
  }

  /** `Draft -> Locked`, one step, irreversible (Domain Invariant #4) -- see application.types.ts for the confirmed no-separate-Submitted-state note. */
  submitApplication(applicationId: string): Observable<ApplicationDto> {
    return this.normalizeErrors(
      this.http.post<ApplicationDto>(
        this.apiUrl(`admission/applications/${applicationId}/submit`),
        {},
      ),
    );
  }

  getCampaign(campaignId: string): Observable<CampaignDto> {
    return this.normalizeErrors(
      this.http.get<CampaignDto>(this.apiUrl(`admission/campaigns/${campaignId}`)),
    );
  }

  /** `POST /api/v1/admission/applicants/{id}/academic-records` (AWEB-15). */
  addAcademicRecord(applicantId: string, request: AcademicRecordRequest): Observable<void> {
    return this.normalizeErrors(
      this.http
        .post<unknown>(this.apiUrl(`admission/applicants/${applicantId}/academic-records`), request)
        .pipe(map(() => undefined)),
    );
  }
}
