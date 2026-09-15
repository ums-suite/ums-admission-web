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
}
