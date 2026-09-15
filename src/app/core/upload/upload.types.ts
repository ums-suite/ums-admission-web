/**
 * Wire shape modeled directly off `ums-core`'s `Documents` module
 * (`UMS.Modules.Documents.Application.Uploads.UploadedArtifactDto`/`UploadedArtifactStatus`) --
 * verified against real source, not guessed (see this app's README "Known @ums/shared contract
 * gap"). Field names are camelCase over the wire per `ums-core`'s System.Text.Json default.
 */
export type UploadedArtifactStatus = 'PendingUpload' | 'Ready' | 'Failed';

export interface UploadedArtifact {
  readonly id: string;
  readonly ownerId: string;
  readonly artifactType: string;
  readonly mimeType: string;
  readonly status: UploadedArtifactStatus;
  readonly sizeBytes?: number;
  readonly requestedAt: string;
  readonly readyAt?: string;
  /**
   * Present only on the response to the initial request-upload call -- a fresh, short-lived
   * pre-signed PUT URL (`ums-core`'s configured lifetime: 15 minutes, `UploadedArtifactService.
   * UploadUrlExpiry`; see this app's README for whether that's generously sized against §4's
   * low-bandwidth NFR). Absent on every later read.
   */
  readonly uploadUrl?: string;
  /** Present only once `Ready`; a fresh short-lived pre-signed GET URL. */
  readonly downloadUrl?: string;
}

export type UploadStage = 'requesting-url' | 'uploading' | 'confirming' | 'ready' | 'failed';

export interface DirectUploadProgress {
  readonly stage: UploadStage;
  /** 0-100, present only during the 'uploading' stage. */
  readonly percent?: number;
  readonly artifact?: UploadedArtifact;
  /** Present only when `stage === 'failed'` -- see `direct-upload.service.ts` for the specific-message policy. */
  readonly errorMessage?: string;
}
