/**
 * Wire shapes for `Admission`'s `Application`/`AdmissionCampaign` (AWEB-13..17). Verified directly
 * against `ums-core` source (`Application.cs`, `ApplicationDto.cs`, `AdmissionCampaign.cs`,
 * `CampaignDto.cs`, `ApplicationEndpoints.cs`, `CampaignEndpoints.cs`) by a dedicated research pass
 * for this ticket chain -- not the earlier tickets' "best current guess" status.
 *
 * **Confirmed divergence from requirement-spec.md's glossary**: the real `ApplicationStatus` state
 * machine is `Draft -> Locked -> Confirmed` (plus a terminal `Declined`) -- there is no separate
 * `Submitted` status; `POST /applications/{id}/submit` transitions `Draft` directly to `Locked` in
 * one step. This app treats "submit" and "lock" as the same user-facing action (AWEB-17) rather
 * than inventing a client-side `Submitted` state the backend doesn't have.
 *
 * **Confirmed cross-team gap**: there is no `GET /api/v1/admission/campaigns/` list endpoint and
 * no "list my applications" endpoint -- only `GET /campaigns/{id}` (must already know the id) and
 * `GET /applications/{id}`. A returning applicant has no server-side way to discover their own
 * in-progress `Application` or the currently-active `AdmissionCampaign` to apply to. Flagged
 * prominently in this app's PR; worked around client-side in `wizard-draft.store.ts` by persisting
 * the created `applicationId` locally, keyed by `campaignId` -- same-browser resume only, not the
 * spec's full cross-device resume guarantee, until `Admission` ships a query-by-applicant endpoint.
 */
export type ApplicationStatus = 'Draft' | 'Locked' | 'Confirmed' | 'Declined';
export type ApplicationDocumentStatus = 'Pending' | 'Approved' | 'Rejected';

export interface ProgramChoiceDto {
  readonly programId: string;
  readonly rank: number;
}

export interface ApplicationDocumentDto {
  readonly id: string;
  readonly documentType: string;
  readonly fileReference: string;
  readonly status: ApplicationDocumentStatus;
  readonly rejectionReason?: string;
}

export interface ApplicationDto {
  readonly id: string;
  readonly applicantId: string;
  readonly campaignId: string;
  readonly status: ApplicationStatus;
  readonly applicationNumber?: string;
  readonly programChoices: readonly ProgramChoiceDto[];
  readonly documents: readonly ApplicationDocumentDto[];
  readonly applicationFeeInvoiceId?: string;
  readonly isApplicationFeePaid: boolean;
  readonly confirmationFeeInvoiceId?: string;
  readonly isConfirmationFeePaid: boolean;
  readonly assignedTestSlotId?: string;
  readonly rollNumber?: string;
  readonly admitCardDocumentId?: string;
}

/**
 * `POST /api/v1/admission/applications/{id}/confirm` (AWEB-29) -- verified directly against
 * `ums-core` source (`ApplicationEndpoints.cs`, `ApplicationService.ConfirmAsync`): own-Application
 * only, requires `Application.Status == Locked`. Lazily creates the confirmation-fee `Invoice` on
 * first call (`confirmationFeeInvoiceId` is populated from that point on, mirroring
 * `applicationFeeInvoiceId`'s own already-established shape) -- idempotent by construction
 * (`OriginatingApplicationId` keys the `Student` record creation this same call eventually
 * triggers), so calling it again after paying is always safe, never a double-charge or duplicate
 * `Student` record.
 *
 * **Confirmed gap**: there is no deadline field anywhere on this response or on `ApplicationDto`
 * -- requirement-spec.md §3.7's "deadline prominently and persistently displayed" therefore has no
 * backend data source today, exactly the same class of gap already documented for
 * `AdmissionTestDto`'s missing test-slot start time (`admission-test.types.ts`). Flagged in the PR
 * rather than inventing a fake date; AWEB-29's screen instead shows a persistent, prominent
 * (but date-free) urgency notice.
 *
 * **Confirmed gap**: the created `Student` record's id/summary is never surfaced back through this
 * response (`ApplicationService.ConfirmAsync` discards `IStudentRecordProvisioner.CreateAsync`'s
 * result entirely) -- see AWEB-31's enrollment-handoff screen for how this is worked around.
 */
export interface ConfirmationAttemptResult {
  readonly application: ApplicationDto;
  readonly confirmationFeeInvoiceId?: string;
  readonly confirmed: boolean;
}

export interface CreateApplicationRequest {
  readonly campaignId: string;
}

export interface ProgramChoiceRequest {
  readonly programId: string;
  readonly rank: number;
}

export interface UploadDocumentRequest {
  readonly documentType: string;
  readonly fileReference: string;
}

/**
 * `CampaignDto` as confirmed against `ums-core` -- notably, it carries `RequiredDocumentTypes`
 * (used by AWEB-16) but **no eligibility-rule data of any shape**. `EligibilityRule` exists
 * server-side but is write-only from this API's perspective (`EligibilityRuleRequest` has no
 * corresponding read shape). AWEB-14's "live inline eligibility feedback" requirement therefore
 * has no backend data source today -- flagged as a cross-team gap in the PR; `eligibilityRules` is
 * kept here as an optional, forward-compatible field this app can start using the moment
 * `Admission` exposes one, never populated by the real backend as it stands.
 */
export interface CampaignDto {
  readonly id: string;
  readonly name: string;
  readonly programIds: readonly string[];
  readonly applicationWindowStart: string;
  readonly applicationWindowEnd: string;
  readonly applicationFeeType: string;
  readonly confirmationFeeType: string;
  readonly isConfigurationLocked: boolean;
  readonly requiredDocumentTypes: readonly string[];
  /** Not populated by the real backend today -- see class doc. */
  readonly eligibilityRules?: readonly CampaignEligibilityRuleDto[];
}

export interface CampaignEligibilityRuleDto {
  readonly programId: string;
  readonly minimumScore: number;
  readonly isGpaScale: boolean;
  readonly requiredBoard?: string;
}

export interface AcademicRecordRequest {
  readonly board: string;
  readonly examName: string;
  readonly passingYear: number;
  readonly score: number;
  readonly isGpaScale: boolean;
}
