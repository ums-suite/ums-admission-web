import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { APP_CONFIG } from '../../core/config/app-config';
import { ApplicantProfileComponent } from './applicant-profile.component';

describe('ApplicantProfileComponent', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<ApplicantProfileComponent>>;
  let httpMock: HttpTestingController;
  const baseUrl = 'http://localhost:8080';

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApplicantProfileComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: APP_CONFIG, useValue: { apiBaseUrl: baseUrl } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ApplicantProfileComponent);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function flushInitialLoad(overrides: Partial<Record<string, unknown>> = {}): void {
    fixture.detectChanges();
    const req = httpMock.expectOne(`${baseUrl}/api/v1/admission/applicants/me`);
    req.flush({
      id: 'applicant-1',
      identityUserId: 'user-1',
      givenName: 'Rafi',
      familyName: 'Islam',
      email: 'rafi@example.com',
      dateOfBirth: '2005-03-14',
      isEmailVerified: true,
      isMobileVerified: false,
      ...overrides,
    });
    fixture.detectChanges();
  }

  it('creates and loads the current profile on init', () => {
    flushInitialLoad({ presentAddress: '12 Green Road, Dhaka' });
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
    expect(component['loading']()).toBeFalse();
    expect(component['presentAddress']()).toBe('12 Green Road, Dhaka');
  });

  it('shows no validation errors before the first submit attempt', () => {
    flushInitialLoad();
    expect(fixture.componentInstance['errors']).toEqual({});
  });

  it('does not call the API when submitted with a blank required address', () => {
    flushInitialLoad({ presentAddress: '' });
    const component = fixture.componentInstance;
    component['onSubmit']();
    expect(Object.keys(component['errors']).length).toBeGreaterThan(0);
    httpMock.expectNone(`${baseUrl}/api/v1/admission/applicants/applicant-1`);
  });

  it('saves the profile and shows the saved confirmation on success', () => {
    flushInitialLoad({ presentAddress: '12 Green Road, Dhaka' });
    const component = fixture.componentInstance;

    component['onSubmit']();

    const req = httpMock.expectOne(`${baseUrl}/api/v1/admission/applicants/applicant-1`);
    expect(req.request.method).toBe('PUT');
    req.flush({
      id: 'applicant-1',
      identityUserId: 'user-1',
      givenName: 'Rafi',
      familyName: 'Islam',
      email: 'rafi@example.com',
      dateOfBirth: '2005-03-14',
      isEmailVerified: true,
      isMobileVerified: false,
      presentAddress: '12 Green Road, Dhaka',
    });

    expect(component['saved']()).toBeTrue();
    expect(component['submitting']()).toBeFalse();
  });

  it('surfaces a server error message instead of marking saved on failure', () => {
    flushInitialLoad({ presentAddress: '12 Green Road, Dhaka' });
    const component = fixture.componentInstance;

    component['onSubmit']();

    httpMock
      .expectOne(`${baseUrl}/api/v1/admission/applicants/applicant-1`)
      .flush({ title: 'Something went wrong.' }, { status: 500, statusText: 'Server Error' });

    expect(component['saved']()).toBeFalse();
    expect(component['serverErrorMessage']()).toBe('Something went wrong.');
  });
});
