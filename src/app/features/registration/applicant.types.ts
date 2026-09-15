/**
 * Wire shapes modeled directly off `ums-core`'s `Admission` module
 * (`UMS.Modules.Admission.Application.Applicants.ApplicantDto`/`RegisterApplicantRequest`,
 * `UMS.Modules.Admission.Domain.Applicants.OtpChannel`) -- verified against real source, not
 * guessed (see this app's README "Known @ums/shared contract gap").
 */
export type OtpChannel = 'Email' | 'Mobile';

export interface RegisterApplicantRequest {
  readonly givenName: string;
  readonly familyName: string;
  readonly email: string;
  readonly mobile?: string;
  /** ISO 8601 date-only, e.g. "2005-03-14" (.NET `DateOnly` over the wire). */
  readonly dateOfBirth: string;
}

export interface ApplicantDto {
  readonly id: string;
  readonly identityUserId: string;
  readonly givenName: string;
  readonly familyName: string;
  readonly email: string;
  readonly mobile?: string;
  readonly dateOfBirth: string;
  readonly isEmailVerified: boolean;
  readonly isMobileVerified: boolean;
  readonly presentAddress?: string;
  readonly guardianName?: string;
  readonly guardianRelation?: string;
  readonly guardianContact?: string;
}

/**
 * AWEB-12 profile-completion payload (requirement-spec.md §3.1: "guardian info as required by
 * campaign rules"). **Confirmed cross-team gap, not a guess** (direct inspection of `ums-core`'s
 * own `Applicant.cs`/`ApplicantDto.cs`/`ApplicantEndpoints.cs`): the Admission module has no
 * guardian-related field anywhere (name, relation, contact, or otherwise), no `presentAddress`
 * field, and -- critically -- **no HTTP endpoint at all** to update an `Applicant` after
 * registration. `Applicant.UpdateProfile(givenName, familyName, mobile)` exists as a domain method
 * but is never called from any endpoint; there is no `PUT /api/v1/admission/applicants/{id}` or
 * `/me` route wired up. (`Student`'s own `Guardian` concept in `GuardianEndpoints.cs` is a
 * different, post-enrollment thing, unrelated to `Applicant`.) This request/response shape and the
 * `updateProfile()` call in `applicant.api.ts` are built against the *intended* REST shape this
 * ticket needs, ready for a mechanical swap the moment `Admission` ships the real endpoint and
 * fields -- flagged prominently in this app's PR/README as a blocking backend gap, not silently
 * worked around.
 */
export interface UpdateApplicantProfileRequest {
  readonly presentAddress?: string;
  readonly guardianName?: string;
  readonly guardianRelation?: string;
  readonly guardianContact?: string;
}
