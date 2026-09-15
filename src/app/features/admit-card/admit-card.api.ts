import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { ProvisionalModuleApiBase } from '../../core/http/provisional-module-api.base';
import type { AdmitCardAvailability, GeneratedDocumentDto } from './admit-card.types';

/** Interim client for the admit-card flow (AWEB-20) -- see `admit-card.types.ts` for the confirmed routes/gaps. */
@Injectable({ providedIn: 'root' })
export class AdmitCardApi extends ProvisionalModuleApiBase {
  getAvailability(applicationId: string): Observable<AdmitCardAvailability> {
    return this.normalizeErrors(
      this.http.get<AdmitCardAvailability>(
        this.apiUrl(`admission/tests/admit-card/${applicationId}`),
      ),
    );
  }

  getDocument(documentId: string): Observable<GeneratedDocumentDto> {
    return this.normalizeErrors(
      this.http.get<GeneratedDocumentDto>(this.apiUrl(`documents/${documentId}`)),
    );
  }
}
