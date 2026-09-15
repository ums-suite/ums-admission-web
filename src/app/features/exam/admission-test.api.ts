import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { ProvisionalModuleApiBase } from '../../core/http/provisional-module-api.base';
import type {
  AddQuestionRequest,
  AddTestSlotRequest,
  AdmissionTestDto,
  CreateAdmissionTestRequest,
  SelectionRuleRequest,
} from './admission-test.types';

/**
 * Interim client for `Admission`'s `AdmissionTest` endpoints -- the applicant-facing read route
 * (AWEB-21) plus the officer-facing question-bank/exam-rule write routes (AWEB-33). See
 * `admission-test.types.ts` for the confirmed routes/gaps this is built against.
 */
@Injectable({ providedIn: 'root' })
export class AdmissionTestApi extends ProvisionalModuleApiBase {
  /** `GET /api/v1/admission/tests/by-campaign/{campaignId}`. */
  getByCampaign(campaignId: string): Observable<AdmissionTestDto> {
    return this.normalizeErrors(
      this.http.get<AdmissionTestDto>(this.apiUrl(`admission/tests/by-campaign/${campaignId}`)),
    );
  }

  /** `POST /api/v1/admission/tests/` -- `admission.campaign.manage` (AWEB-33). */
  createTest(request: CreateAdmissionTestRequest): Observable<AdmissionTestDto> {
    return this.normalizeErrors(
      this.http.post<AdmissionTestDto>(this.apiUrl('admission/tests/'), request),
    );
  }

  /** `POST /api/v1/admission/tests/{id}/questions` -- `admission.campaign.manage` (AWEB-33). */
  addQuestion(testId: string, request: AddQuestionRequest): Observable<AdmissionTestDto> {
    return this.normalizeErrors(
      this.http.post<AdmissionTestDto>(this.apiUrl(`admission/tests/${testId}/questions`), request),
    );
  }

  /** `POST /api/v1/admission/tests/{id}/selection-rules` -- `admission.campaign.manage` (AWEB-33). */
  addSelectionRule(testId: string, request: SelectionRuleRequest): Observable<AdmissionTestDto> {
    return this.normalizeErrors(
      this.http.post<AdmissionTestDto>(
        this.apiUrl(`admission/tests/${testId}/selection-rules`),
        request,
      ),
    );
  }

  /** `POST /api/v1/admission/tests/{id}/slots` -- `admission.campaign.manage` (AWEB-33). */
  addSlot(testId: string, request: AddTestSlotRequest): Observable<AdmissionTestDto> {
    return this.normalizeErrors(
      this.http.post<AdmissionTestDto>(this.apiUrl(`admission/tests/${testId}/slots`), request),
    );
  }
}
