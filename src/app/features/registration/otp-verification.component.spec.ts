import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { APP_CONFIG } from '../../core/config/app-config';
import { OtpVerificationComponent } from './otp-verification.component';

describe('OtpVerificationComponent', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<OtpVerificationComponent>>;
  let httpMock: HttpTestingController;
  const baseUrl = 'http://localhost:8080';

  function create(mobile?: string) {
    fixture = TestBed.createComponent(OtpVerificationComponent);
    fixture.componentRef.setInput('applicantId', 'applicant-1');
    fixture.componentRef.setInput('email', 'rafi@example.com');
    if (mobile) {
      fixture.componentRef.setInput('mobile', mobile);
    }
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OtpVerificationComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { apiBaseUrl: baseUrl } },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('defaults to the email channel', () => {
    create();
    expect(fixture.componentInstance['channel']()).toBe('Email');
    expect(fixture.componentInstance['destination']).toBe('rafi@example.com');
  });

  it('can switch to the mobile channel when one was supplied', () => {
    create('+8801712345678');
    fixture.componentInstance['switchChannel']('Mobile');
    expect(fixture.componentInstance['destination']).toBe('+8801712345678');
  });

  it('requests a code and starts the resend cooldown on success', () => {
    create();
    fixture.componentInstance['requestCode']();
    httpMock.expectOne(`${baseUrl}/api/v1/admission/applicants/applicant-1/otp`).flush(null);

    expect(fixture.componentInstance['codeRequested']()).toBeTrue();
    expect(fixture.componentInstance['resendCooldownSeconds']()).toBeGreaterThan(0);
  });

  it('only enables verification once a full code is completed', () => {
    create();
    fixture.componentInstance['requestCode']();
    httpMock.expectOne(`${baseUrl}/api/v1/admission/applicants/applicant-1/otp`).flush(null);

    expect(fixture.componentInstance['completedCode']()).toBe('');
    fixture.componentInstance['onCodeCompleted']('123456');
    expect(fixture.componentInstance['completedCode']()).toBe('123456');
  });

  it('emits (verified) on a successful verification', () => {
    create();
    let verifiedCount = 0;
    fixture.componentInstance.verified.subscribe(() => verifiedCount++);

    fixture.componentInstance['requestCode']();
    httpMock.expectOne(`${baseUrl}/api/v1/admission/applicants/applicant-1/otp`).flush(null);
    fixture.componentInstance['onCodeCompleted']('123456');
    fixture.componentInstance['verifyCode']();

    httpMock.expectOne(`${baseUrl}/api/v1/admission/applicants/applicant-1/verify`).flush(null);

    expect(verifiedCount).toBe(1);
  });

  it('surfaces a server error and clears the completed code on an incorrect verification', () => {
    create();
    fixture.componentInstance['requestCode']();
    httpMock.expectOne(`${baseUrl}/api/v1/admission/applicants/applicant-1/otp`).flush(null);
    fixture.componentInstance['onCodeCompleted']('000000');
    fixture.componentInstance['verifyCode']();

    httpMock
      .expectOne(`${baseUrl}/api/v1/admission/applicants/applicant-1/verify`)
      .flush(
        { title: 'The verification code is incorrect.' },
        { status: 422, statusText: 'Unprocessable' },
      );

    expect(fixture.componentInstance['errorMessage']()).toBe('The verification code is incorrect.');
    expect(fixture.componentInstance['completedCode']()).toBe('');
  });
});
