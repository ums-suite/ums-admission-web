import { HttpBackend, HttpClient, HttpErrorResponse, HttpEventType } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, filter, map, switchMap, tap } from 'rxjs';
import { DocumentsUploadApi } from './documents-upload.api';
import type { DirectUploadProgress, UploadedArtifact } from './upload.types';

/**
 * Direct-to-object-storage upload via `Documents`' pre-signed URLs (AWEB-8, requirement-spec.md
 * §2 Document-upload row, §5 file-upload hardening, ADR-0010) -- never proxies file bytes through
 * this app's own server tier; the three-step flow is exactly `Documents`' own documented contract
 * (`UploadedArtifactService`'s doc comment): request a pre-signed URL, PUT the file straight to
 * object storage, confirm completion (server-side existence/checksum verification).
 *
 * **Deliberately bypasses this app's entire interceptor chain for the PUT to the pre-signed
 * URL**, via `HttpBackend` (Angular's documented escape hatch for a request that must skip every
 * registered interceptor) rather than the DI'd `HttpClient`. This matters because `@ums/shared`'s
 * `authInterceptor` does not scope its bearer-token attachment to `UMS_AUTH_CONFIG.baseUrl` --
 * `attachBearerToken` only checks `isAuthEndpoint`/an existing `Authorization` header, never the
 * request's actual origin -- so a plain `HttpClient` call would leak this app's session's bearer
 * token (plus `X-Correlation-Id`/`?lang=`/`Accept-Language`) to whatever third-party object-
 * storage host issued the pre-signed URL. Flagged as a hardening suggestion for `@ums/shared`
 * upstream in this app's PR description (scope the attachment check to `req.url.startsWith(
 * config.baseUrl)`); worked around here in the meantime since leaking a session token to a
 * third-party host is a real, not merely cosmetic, correctness/security concern regardless of
 * whether it also breaks the pre-signed URL's own signature validation.
 *
 * Per design-decisions.md's "Pre-Signed Upload URL Lifetime" resolution: no client-side
 * bandwidth-probing or resumable/multipart machinery is built here -- the fix is a correctly-sized
 * URL window (see README for the verified 15-minute server-side value and the open question of
 * whether that's generous enough against §4's low-bandwidth NFR) plus the specific, actionable
 * failure messaging below for the rare residual case.
 */
@Injectable({ providedIn: 'root' })
export class DirectUploadService {
  private readonly documentsApi = inject(DocumentsUploadApi);
  // See class doc: HttpBackend bypasses every registered interceptor.
  private readonly rawHttp = new HttpClient(inject(HttpBackend));

  upload(file: File, ownerId: string, artifactType: string): Observable<DirectUploadProgress> {
    return new Observable<DirectUploadProgress>((subscriber) => {
      subscriber.next({ stage: 'requesting-url' });

      const subscription = this.documentsApi
        .requestUpload(ownerId, artifactType, file.type)
        .pipe(
          switchMap((artifact) => {
            if (!artifact.uploadUrl) {
              throw new Error(
                'UMS_UPLOAD_NO_URL: Documents did not return a pre-signed upload URL.',
              );
            }
            subscriber.next({ stage: 'uploading', percent: 0 });
            return this.putToObjectStorage(artifact.uploadUrl, file, (percent) =>
              subscriber.next({ stage: 'uploading', percent }),
            ).pipe(map(() => artifact));
          }),
          switchMap((artifact) => {
            subscriber.next({ stage: 'confirming', artifact });
            return this.documentsApi.confirmUpload(artifact.id);
          }),
        )
        .subscribe({
          next: (confirmed) => subscriber.next(this.toFinalProgress(confirmed)),
          error: (error: unknown) => {
            subscriber.next({ stage: 'failed', errorMessage: describeUploadFailure(error) });
            subscriber.complete();
          },
          complete: () => subscriber.complete(),
        });

      return () => subscription.unsubscribe();
    });
  }

  private toFinalProgress(artifact: UploadedArtifact): DirectUploadProgress {
    if (artifact.status === 'Ready') {
      return { stage: 'ready', artifact };
    }
    return {
      stage: 'failed',
      artifact,
      errorMessage:
        'We could not verify your upload. Please try uploading this file again -- nothing else on your application was affected.',
    };
  }

  /** Observable-native (never Promise-wrapped) so it composes synchronously with the outer switchMap chain. */
  private putToObjectStorage(
    uploadUrl: string,
    file: File,
    onProgress: (percent: number) => void,
  ): Observable<void> {
    return this.rawHttp
      .put(uploadUrl, file, {
        headers: { 'Content-Type': file.type },
        reportProgress: true,
        observe: 'events',
      })
      .pipe(
        tap((event) => {
          if (event.type === HttpEventType.UploadProgress && event.total) {
            onProgress(Math.round((event.loaded / event.total) * 100));
          }
        }),
        filter((event) => event.type === HttpEventType.Response),
        map(() => undefined),
      );
  }
}

/**
 * Edge-cases.md "A Pre-Signed Document-Upload URL Expiring Mid-Transfer on a Slow Connection":
 * "specific, actionable retry messaging on the rare residual failure" -- distinguishes an
 * expired/rejected pre-signed URL (object storage's `403`) from an ordinary network drop, since
 * the applicant's correct next action differs (retry immediately vs. check their connection).
 */
function describeUploadFailure(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 403) {
      return 'Your upload link expired before the file finished transferring -- this can happen on a slow connection. Please try uploading again.';
    }
    if (error.status === 0) {
      return 'Your upload was interrupted, likely by a connection drop. Please check your connection and try again.';
    }
  }
  return 'Something went wrong while uploading. Please try again.';
}
