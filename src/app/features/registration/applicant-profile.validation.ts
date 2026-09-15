/** Pure validation for the applicant-profile-completion form (AWEB-12) -- see registration-form.validation.ts for the same pattern. */
export interface ApplicantProfileFormValues {
  readonly presentAddress: string;
  readonly guardianName: string;
  readonly guardianRelation: string;
  readonly guardianContact: string;
}

export interface ApplicantProfileFormErrors {
  readonly presentAddress?: string;
  readonly guardianName?: string;
  readonly guardianRelation?: string;
  readonly guardianContact?: string;
}

/**
 * "guardian info as required by campaign rules" (requirement-spec.md §3.1) -- campaign-specific
 * requiredness isn't modeled yet (no campaign-rules endpoint exists for this app to read), so this
 * validates the conservative default: once a guardian name is entered, a relation and a way to
 * contact them become required together (a name with no way to reach that person is not useful
 * profile data) rather than requiring the whole guardian section unconditionally.
 */
export function validateApplicantProfileForm(
  values: ApplicantProfileFormValues,
): ApplicantProfileFormErrors {
  const errors: { -readonly [K in keyof ApplicantProfileFormErrors]?: string } = {};

  if (!values.presentAddress.trim()) {
    errors.presentAddress = 'validation.presentAddress.required';
  }

  const hasAnyGuardianField =
    values.guardianName.trim() || values.guardianRelation.trim() || values.guardianContact.trim();

  if (hasAnyGuardianField) {
    if (!values.guardianName.trim()) {
      errors.guardianName = 'validation.guardianName.required';
    }
    if (!values.guardianRelation.trim()) {
      errors.guardianRelation = 'validation.guardianRelation.required';
    }
    if (!values.guardianContact.trim()) {
      errors.guardianContact = 'validation.guardianContact.required';
    }
  }

  return errors;
}

export function isApplicantProfileFormValid(errors: ApplicantProfileFormErrors): boolean {
  return Object.keys(errors).length === 0;
}
