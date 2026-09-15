import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ProvisionalModuleApiBase } from '../http/provisional-module-api.base';
import type { UploadedArtifact } from './upload.types';

/**
 * Interim client for `Documents`' upload endpoints (AWEB-8) -- see this app's README "Known
 * @ums/shared contract gap" for why this hand-rolls `HttpClient` calls instead of using a
 * generated service. Routes verified directly against `ums-core`'s own
 * `UMS.Modules.Documents.Api.Endpoints.UploadEndpoints` (`DocumentsModule.cs`'s group prefix is
 * `/api/v1/documents`):
 * - `POST /api/v1/documents/uploads/` -- request a fresh pre-signed upload URL.
 * - `POST /api/v1/documents/uploads/{id}/confirm` -- confirm the direct-to-storage transfer
 *   completed; the server verifies existence/checksum server-side before marking `Ready`.
 * - `GET /api/v1/documents/uploads/{id}` -- read current status.
 */
@Injectable({ providedIn: 'root' })
export class DocumentsUploadApi extends ProvisionalModuleApiBase {
  requestUpload(
    ownerId: string,
    artifactType: string,
    mimeType: string,
  ): Observable<UploadedArtifact> {
    return this.normalizeErrors(
      this.http.post<UploadedArtifact>(this.apiUrl('documents/uploads/'), {
        ownerId,
        artifactType,
        mimeType,
      }),
    );
  }

  confirmUpload(artifactId: string): Observable<UploadedArtifact> {
    return this.normalizeErrors(
      this.http.post<UploadedArtifact>(this.apiUrl(`documents/uploads/${artifactId}/confirm`), {}),
    );
  }

  getUpload(artifactId: string): Observable<UploadedArtifact> {
    return this.normalizeErrors(
      this.http.get<UploadedArtifact>(this.apiUrl(`documents/uploads/${artifactId}`)),
    );
  }
}
