import { isLoginFormValid, validateLoginForm } from './login-form.validation';

describe('validateLoginForm', () => {
  it('reports no errors for a fully valid submission', () => {
    const errors = validateLoginForm({ identifier: 'jdoe', password: 'correct-horse' });
    expect(isLoginFormValid(errors)).toBeTrue();
  });

  it('requires a non-empty identifier', () => {
    expect(validateLoginForm({ identifier: '', password: 'x' }).identifier).toBe(
      'validation.identifier.required',
    );
    expect(validateLoginForm({ identifier: '   ', password: 'x' }).identifier).toBe(
      'validation.identifier.required',
    );
  });

  it('requires a non-empty password', () => {
    expect(validateLoginForm({ identifier: 'jdoe', password: '' }).password).toBe(
      'validation.password.required',
    );
  });

  it('never trims/validates password content beyond presence (never a client-side strength check)', () => {
    // A single space is a legitimate (if unusual) password value -- password rules are the
    // server's business, this form only ever guards against a literally empty submission.
    expect(validateLoginForm({ identifier: 'jdoe', password: ' ' }).password).toBeUndefined();
  });

  it('collects both errors when both are missing', () => {
    const errors = validateLoginForm({ identifier: '', password: '' });
    expect(Object.keys(errors).sort()).toEqual(['identifier', 'password']);
  });
});
