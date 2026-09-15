/**
 * Wire shapes for the admit card (AWEB-20) -- verified directly against `ums-core` source
 * (`AdmissionTestEndpoints.cs`'s admit-card-availability route, `GenerationEndpoints.cs`,
 * `GeneratedDocument.cs`/`GeneratedDocumentDto`) by the same dedicated research pass as the
 * wizard/payment chains.
 *
 * **Confirmed**: `GET /api/v1/admission/tests/admit-card/{applicationId}` (ownership-guarded,
 * live-session-required) returns an anonymous `{ assignedTestSlotId, rollNumber,
 * admitCardDocumentId }` shape -- `admitCardDocumentId` is `null` until `AdmitCardService` runs
 * post-lock. `GET /api/v1/documents/{id}` then resolves the actual `GeneratedDocument` (status +
 * a presigned, short-lived `downloadUrl`, populated only once `status === 'Ready'`).
 *
 * **Confirmed gap**: there is no explicit "available from [date]" field anywhere in `Application`,
 * `AdmissionTest`, or `TestSlot` -- requirement-spec.md §3.4's "clearly time-gated ('available from
 * [date]')" has no backend date to render. Availability is purely event-driven (a document exists
 * once generation succeeds, nothing before). This app therefore renders a state machine driven
 * entirely by presence/status rather than a countdown to a known date -- "not yet generated" /
 * "being prepared" / "ready to download" -- and flags the missing date field as a cross-team gap in
 * the PR (the spec's literal "available from [date]" copy cannot be implemented without it).
 */
export type GeneratedDocumentStatus =
  'Pending' | 'Uploaded' | 'Ready' | 'Failed' | 'Revoked' | 'Superseded';

export interface AdmitCardAvailability {
  readonly assignedTestSlotId?: string;
  readonly rollNumber?: string;
  readonly admitCardDocumentId?: string;
}

export interface GeneratedDocumentDto {
  readonly id: string;
  readonly ownerId: string;
  readonly documentType: string;
  readonly status: GeneratedDocumentStatus;
  readonly digitalVerificationId: string;
  readonly language: string;
  /** Present only once `status === 'Ready'`; a fresh, short-lived pre-signed GET URL. */
  readonly downloadUrl?: string;
  readonly readyAt?: string;
}
