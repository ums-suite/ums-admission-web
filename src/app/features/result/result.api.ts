import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { ProvisionalModuleApiBase } from '../../core/http/provisional-module-api.base';

/**
 * Interim client for `Admission`'s public result-search endpoint (AWEB-26/27/28) -- see
 * `result.types.ts` for the confirmed route/gaps this is built against. Deliberately typed as
 * `Observable<unknown>` here (never `AdmissionResultSearchDto` directly): the whole point of
 * {@link isWellFormedResult} downstream is to distrust the response's shape rather than assume the
 * generic type parameter is honest, since the real endpoint gives this app no explicit readiness
 * field to lean on instead (see `result.types.ts`'s class doc).
 */
@Injectable({ providedIn: 'root' })
export class ResultApi extends ProvisionalModuleApiBase {
  searchByApplicationNumber(applicationNumber: string): Observable<unknown> {
    return this.normalizeErrors(
      this.http.get<unknown>(this.apiUrl('admission/results/search'), {
        params: { applicationNumber },
      }),
    );
  }

  searchByRollNumber(examId: string, rollNumber: string): Observable<unknown> {
    return this.normalizeErrors(
      this.http.get<unknown>(this.apiUrl('admission/results/search'), {
        params: { examId, rollNumber },
      }),
    );
  }
}
