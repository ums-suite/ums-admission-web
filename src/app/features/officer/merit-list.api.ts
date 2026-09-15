import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { ProvisionalModuleApiBase } from '../../core/http/provisional-module-api.base';
import type { MeritListDto } from './merit-list.types';

/**
 * Interim client for `Admission`'s `MeritList` endpoints (AWEB-34) -- see `merit-list.types.ts`
 * for the confirmed routes/gaps this is built against.
 */
@Injectable({ providedIn: 'root' })
export class MeritListApi extends ProvisionalModuleApiBase {
  /** `POST /api/v1/admission/merit-lists/{campaignId}/generate` -- `admission.meritlist.generate`. */
  generate(campaignId: string): Observable<MeritListDto> {
    return this.normalizeErrors(
      this.http.post<MeritListDto>(this.apiUrl(`admission/merit-lists/${campaignId}/generate`), {}),
    );
  }

  /** `GET /api/v1/admission/merit-lists/by-campaign/{campaignId}` -- `admission.application.review`. */
  getByCampaign(campaignId: string): Observable<MeritListDto> {
    return this.normalizeErrors(
      this.http.get<MeritListDto>(this.apiUrl(`admission/merit-lists/by-campaign/${campaignId}`)),
    );
  }

  /** `POST /api/v1/admission/merit-lists/{id}/approve` -- `admission.meritlist.approve`. Irreversible, never automatic (Domain requirement §3.8). */
  approve(meritListId: string): Observable<MeritListDto> {
    return this.normalizeErrors(
      this.http.post<MeritListDto>(this.apiUrl(`admission/merit-lists/${meritListId}/approve`), {}),
    );
  }
}
