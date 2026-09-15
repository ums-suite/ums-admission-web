import {
  isApplicantProfileFormValid,
  validateApplicantProfileForm,
  type ApplicantProfileFormValues,
} from './applicant-profile.validation';

function values(overrides: Partial<ApplicantProfileFormValues> = {}): ApplicantProfileFormValues {
  return {
    presentAddress: '12 Green Road, Dhaka',
    guardianName: '',
    guardianRelation: '',
    guardianContact: '',
    ...overrides,
  };
}

describe('validateApplicantProfileForm', () => {
  it('reports no errors when only the required address is filled in', () => {
    const errors = validateApplicantProfileForm(values());
    expect(isApplicantProfileFormValid(errors)).toBeTrue();
  });

  it('requires the present address', () => {
    expect(validateApplicantProfileForm(values({ presentAddress: '' })).presentAddress).toBe(
      'validation.presentAddress.required',
    );
    expect(validateApplicantProfileForm(values({ presentAddress: '   ' })).presentAddress).toBe(
      'validation.presentAddress.required',
    );
  });

  it('leaves guardian fields optional when none of them are filled in', () => {
    const errors = validateApplicantProfileForm(values());
    expect(errors.guardianName).toBeUndefined();
    expect(errors.guardianRelation).toBeUndefined();
    expect(errors.guardianContact).toBeUndefined();
  });

  it('requires all three guardian fields once any one of them is filled in', () => {
    const errors = validateApplicantProfileForm(values({ guardianName: 'Karim Rahman' }));
    expect(errors.guardianName).toBeUndefined();
    expect(errors.guardianRelation).toBe('validation.guardianRelation.required');
    expect(errors.guardianContact).toBe('validation.guardianContact.required');
  });

  it('requires guardianName once only guardianRelation is filled in', () => {
    const errors = validateApplicantProfileForm(values({ guardianRelation: 'Father' }));
    expect(errors.guardianName).toBe('validation.guardianName.required');
  });

  it('requires guardianName once only guardianContact is filled in', () => {
    const errors = validateApplicantProfileForm(values({ guardianContact: '+8801700000000' }));
    expect(errors.guardianName).toBe('validation.guardianName.required');
    expect(errors.guardianRelation).toBe('validation.guardianRelation.required');
  });

  it('reports no errors when the full guardian section is filled in', () => {
    const errors = validateApplicantProfileForm(
      values({
        guardianName: 'Karim Rahman',
        guardianRelation: 'Father',
        guardianContact: '+8801700000000',
      }),
    );
    expect(isApplicantProfileFormValid(errors)).toBeTrue();
  });
});
