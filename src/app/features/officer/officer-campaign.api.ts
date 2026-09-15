import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { ProvisionalModuleApiBase } from '../../core/http/provisional-module-api.base';
import type {
  CampaignDto,
  CreateCampaignRequest,
  EligibilityRuleRequest,
  RequiredDocumentTypeRequest,
  SeatQuotaRequest,
} from '../wizard/application.types';

/**
 * Interim client for `Admission`'s officer-facing campaign-configuration write endpoints
 * (AWEB-32) -- see `CreateCampaignRequest`'s class doc in `application.types.ts` for the
 * confirmed routes/permissions and the gaps this is built against (no list/update/delete
 * endpoints of any kind, unconfirmed write-endpoint response shapes).
 */
@Injectable({ providedIn: 'root' })
export class OfficerCampaignApi extends ProvisionalModuleApiBase {
  /** `POST /api/v1/admission/campaigns/` -- `admission.campaign.manage`. */
  createCampaign(request: CreateCampaignRequest): Observable<CampaignDto> {
    return this.normalizeErrors(
      this.http.post<CampaignDto>(this.apiUrl('admission/campaigns/'), request),
    );
  }

  /** `POST /api/v1/admission/campaigns/{id}/eligibility-rules` -- `admission.campaign.manage`. */
  addEligibilityRule(campaignId: string, request: EligibilityRuleRequest): Observable<CampaignDto> {
    return this.normalizeErrors(
      this.http.post<CampaignDto>(
        this.apiUrl(`admission/campaigns/${campaignId}/eligibility-rules`),
        request,
      ),
    );
  }

  /** `POST /api/v1/admission/campaigns/{id}/seat-quotas` -- `admission.campaign.manage`. */
  addSeatQuota(campaignId: string, request: SeatQuotaRequest): Observable<CampaignDto> {
    return this.normalizeErrors(
      this.http.post<CampaignDto>(
        this.apiUrl(`admission/campaigns/${campaignId}/seat-quotas`),
        request,
      ),
    );
  }

  /** `POST /api/v1/admission/campaigns/{id}/required-documents` -- `admission.campaign.manage`. */
  addRequiredDocument(
    campaignId: string,
    request: RequiredDocumentTypeRequest,
  ): Observable<CampaignDto> {
    return this.normalizeErrors(
      this.http.post<CampaignDto>(
        this.apiUrl(`admission/campaigns/${campaignId}/required-documents`),
        request,
      ),
    );
  }
}
