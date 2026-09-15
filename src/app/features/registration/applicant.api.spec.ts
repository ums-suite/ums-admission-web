import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { APP_CONFIG } from '../../core/config/app-config';
import { ApplicantApi } from './applicant.api';

describe('ApplicantApi', () => {
  let api: ApplicantApi;
  let httpMock: HttpTestingController;
  const baseUrl = 'http://localhost:8080';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { apiBaseUrl: baseUrl } },
      ],
    });
    api = TestBed.inject(ApplicantApi);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('registers at POST /api/v1/admission/applicants/', () => {
    api
      .register({
        givenName: 'Rafi',
        familyName: 'Islam',
        email: 'rafi@example.com',
        dateOfBirth: '2005-03-14',
      })
      .subscribe();

    const req = httpMock.expectOne(`${baseUrl}/api/v1/admission/applicants/`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      givenName: 'Rafi',
      familyName: 'Islam',
      email: 'rafi@example.com',
      dateOfBirth: '2005-03-14',
    });
    req.flush({ id: 'applicant-1', isEmailVerified: false, isMobileVerified: false });
  });

  it('requests an OTP at POST /api/v1/admission/applicants/{id}/otp', () => {
    api.requestOtp('applicant-1', 'Email').subscribe();
    const req = httpMock.expectOne(`${baseUrl}/api/v1/admission/applicants/applicant-1/otp`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ channel: 'Email' });
    req.flush(null);
  });

  it('verifies an OTP at POST /api/v1/admission/applicants/{id}/verify', () => {
    api.verifyOtp('applicant-1', 'Email', '123456').subscribe();
    const req = httpMock.expectOne(`${baseUrl}/api/v1/admission/applicants/applicant-1/verify`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ channel: 'Email', code: '123456' });
    req.flush(null);
  });

  it('reads the caller-owned profile at GET /api/v1/admission/applicants/me', () => {
    api.getMyProfile().subscribe();
    const req = httpMock.expectOne(`${baseUrl}/api/v1/admission/applicants/me`);
    expect(req.request.method).toBe('GET');
    req.flush({ id: 'applicant-1', isEmailVerified: true, isMobileVerified: false });
  });
});
