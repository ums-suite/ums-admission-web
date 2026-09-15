import { isWellFormedResult } from './result.types';

describe('isWellFormedResult (Domain Invariant #5 compensating check)', () => {
  it('accepts a fully-formed Admitted payload', () => {
    expect(
      isWellFormedResult({
        applicantId: 'a1',
        applicationId: 'app1',
        programId: 'p1',
        outcome: 'Admitted',
      }),
    ).toBeTrue();
  });

  it('accepts Waitlisted and Rejected outcomes too', () => {
    expect(
      isWellFormedResult({
        applicantId: 'a1',
        applicationId: 'app1',
        programId: 'p1',
        outcome: 'Waitlisted',
      }),
    ).toBeTrue();
    expect(
      isWellFormedResult({
        applicantId: 'a1',
        applicationId: 'app1',
        programId: 'p1',
        outcome: 'Rejected',
      }),
    ).toBeTrue();
  });

  it('rejects null, non-object, and empty-object bodies', () => {
    expect(isWellFormedResult(null)).toBeFalse();
    expect(isWellFormedResult(undefined)).toBeFalse();
    expect(isWellFormedResult('not an object')).toBeFalse();
    expect(isWellFormedResult({})).toBeFalse();
  });

  it('rejects a payload missing a required field', () => {
    expect(isWellFormedResult({ applicantId: 'a1', applicationId: 'app1' })).toBeFalse();
  });

  it('rejects an unrecognized outcome value', () => {
    expect(
      isWellFormedResult({
        applicantId: 'a1',
        applicationId: 'app1',
        programId: 'p1',
        outcome: 'Pending',
      }),
    ).toBeFalse();
  });
});
