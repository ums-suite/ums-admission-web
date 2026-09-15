import {
  isRegistrationFormValid,
  validateRegistrationForm,
  type RegistrationFormValues,
} from './registration-form.validation';

function values(overrides: Partial<RegistrationFormValues> = {}): RegistrationFormValues {
  return {
    givenName: 'Rafi',
    familyName: 'Islam',
    email: 'rafi@example.com',
    mobile: '',
    dateOfBirth: '2005-03-14',
    ...overrides,
  };
}

describe('validateRegistrationForm', () => {
  it('reports no errors for a fully valid submission with no mobile', () => {
    const errors = validateRegistrationForm(values());
    expect(isRegistrationFormValid(errors)).toBeTrue();
  });

  it('reports no errors for a fully valid submission with a mobile number', () => {
    const errors = validateRegistrationForm(values({ mobile: '+8801712345678' }));
    expect(isRegistrationFormValid(errors)).toBeTrue();
  });

  it('requires givenName', () => {
    expect(validateRegistrationForm(values({ givenName: '' })).givenName).toBeDefined();
    expect(validateRegistrationForm(values({ givenName: '   ' })).givenName).toBeDefined();
  });

  it('requires familyName', () => {
    expect(validateRegistrationForm(values({ familyName: '' })).familyName).toBeDefined();
  });

  it('requires a non-empty email', () => {
    expect(validateRegistrationForm(values({ email: '' })).email).toBe('validation.email.required');
  });

  it('rejects a malformed email', () => {
    expect(validateRegistrationForm(values({ email: 'not-an-email' })).email).toBe(
      'validation.email.invalid',
    );
    expect(validateRegistrationForm(values({ email: 'missing-at.com' })).email).toBe(
      'validation.email.invalid',
    );
  });

  it('leaves mobile optional -- an empty string is valid', () => {
    expect(validateRegistrationForm(values({ mobile: '' })).mobile).toBeUndefined();
  });

  it('rejects a mobile number that is too short, too long, or non-numeric', () => {
    expect(validateRegistrationForm(values({ mobile: '123' })).mobile).toBeDefined();
    expect(validateRegistrationForm(values({ mobile: '1'.repeat(20) })).mobile).toBeDefined();
    expect(validateRegistrationForm(values({ mobile: 'abcdefgh' })).mobile).toBeDefined();
  });

  it('accepts a mobile number with or without a leading +', () => {
    expect(validateRegistrationForm(values({ mobile: '01712345678' })).mobile).toBeUndefined();
    expect(validateRegistrationForm(values({ mobile: '+8801712345678' })).mobile).toBeUndefined();
  });

  it('requires a date of birth', () => {
    expect(validateRegistrationForm(values({ dateOfBirth: null })).dateOfBirth).toBe(
      'validation.dateOfBirth.required',
    );
  });

  it('rejects a date of birth in the future', () => {
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    const isoNextYear = nextYear.toISOString().slice(0, 10);

    expect(validateRegistrationForm(values({ dateOfBirth: isoNextYear })).dateOfBirth).toBe(
      'validation.dateOfBirth.future',
    );
  });

  it('collects multiple simultaneous errors', () => {
    const errors = validateRegistrationForm({
      givenName: '',
      familyName: '',
      email: '',
      mobile: 'bad',
      dateOfBirth: null,
    });
    expect(Object.keys(errors).sort()).toEqual(
      ['dateOfBirth', 'email', 'familyName', 'givenName', 'mobile'].sort(),
    );
    expect(isRegistrationFormValid(errors)).toBeFalse();
  });
});
