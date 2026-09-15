import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { APP_CONFIG } from '../../core/config/app-config';
import { RegistrationFlowComponent } from './registration-flow.component';
import type { ApplicantDto } from './applicant.types';

const applicant: ApplicantDto = {
  id: 'applicant-1',
  identityUserId: 'user-1',
  givenName: 'Rafi',
  familyName: 'Islam',
  email: 'rafi@example.com',
  dateOfBirth: '2005-03-14',
  isEmailVerified: false,
  isMobileVerified: false,
};

describe('RegistrationFlowComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegistrationFlowComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { apiBaseUrl: 'http://localhost:8080' } },
      ],
    }).compileComponents();
  });

  it('starts on the profile step', () => {
    const fixture = TestBed.createComponent(RegistrationFlowComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance['step']()).toBe('profile');
  });

  it('advances to verify once registration completes', () => {
    const fixture = TestBed.createComponent(RegistrationFlowComponent);
    fixture.detectChanges();

    fixture.componentInstance['onRegistered'](applicant);

    expect(fixture.componentInstance['step']()).toBe('verify');
    expect(fixture.componentInstance['applicant']()).toEqual(applicant);
  });

  it('advances to complete once verification succeeds', () => {
    const fixture = TestBed.createComponent(RegistrationFlowComponent);
    fixture.detectChanges();

    fixture.componentInstance['onRegistered'](applicant);
    fixture.componentInstance['onVerified']();

    expect(fixture.componentInstance['step']()).toBe('complete');
  });
});
