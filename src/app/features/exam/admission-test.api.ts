import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { ProvisionalModuleApiBase } from '../../core/http/provisional-module-api.base';
import type { AdmissionTestDto } from './admission-test.types';

/**
 * Interim client for `Admission`'s `AdmissionTest` read route (AWEB-21) -- see
 * `admission-test.types.ts` for the confirmed gaps this is built against.
 */
@Injectable({ providedIn: 'root' })
export class AdmissionTestApi extends ProvisionalModuleApiBase {
  /** `GET /api/v1/admission/tests/by-campaign/{campaignId}`. */
  getByCampaign(campaignId: string): Observable<AdmissionTestDto> {
    return this.normalizeErrors(
      this.http.get<AdmissionTestDto>(this.apiUrl(`admission/tests/by-campaign/${campaignId}`)),
    );
  }
}
