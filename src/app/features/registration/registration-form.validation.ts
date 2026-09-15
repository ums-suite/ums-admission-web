/** Pure validation for the registration form (AWEB-10) -- kept separate from the component so it's trivially unit-testable without TestBed/DOM. */
export interface RegistrationFormValues {
  readonly givenName: string;
  readonly familyName: string;
  readonly email: string;
  readonly mobile: string;
  readonly dateOfBirth: string | null;
}

export interface RegistrationFormErrors {
  readonly givenName?: string;
  readonly familyName?: string;
  readonly email?: string;
  readonly mobile?: string;
  readonly dateOfBirth?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Bangladeshi mobile numbers are the realistic majority case (requirement-spec.md §4's device/
// locale assumption) but this intentionally also accepts a generic 7-15 digit international
// number (optionally +-prefixed) rather than hard-rejecting every non-BD shape outright.
const MOBILE_PATTERN = /^\+?[0-9]{7,15}$/;

export function validateRegistrationForm(values: RegistrationFormValues): RegistrationFormErrors {
  const errors: { -readonly [K in keyof RegistrationFormErrors]?: string } = {};

  if (!values.givenName.trim()) {
    errors.givenName = 'validation.givenName.required';
  }

  if (!values.familyName.trim()) {
    errors.familyName = 'validation.familyName.required';
  }

  if (!values.email.trim()) {
    errors.email = 'validation.email.required';
  } else if (!EMAIL_PATTERN.test(values.email.trim())) {
    errors.email = 'validation.email.invalid';
  }

  const trimmedMobile = values.mobile.trim();
  if (trimmedMobile && !MOBILE_PATTERN.test(trimmedMobile)) {
    errors.mobile = 'validation.mobile.invalid';
  }

  if (!values.dateOfBirth) {
    errors.dateOfBirth = 'validation.dateOfBirth.required';
  } else if (Date.parse(values.dateOfBirth) > Date.now()) {
    errors.dateOfBirth = 'validation.dateOfBirth.future';
  }

  return errors;
}

export function isRegistrationFormValid(errors: RegistrationFormErrors): boolean {
  return Object.keys(errors).length === 0;
}
