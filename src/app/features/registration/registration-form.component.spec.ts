import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { APP_CONFIG } from '../../core/config/app-config';
import { RegistrationFormComponent } from './registration-form.component';

describe('RegistrationFormComponent', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<RegistrationFormComponent>>;
  let httpMock: HttpTestingController;
  const baseUrl = 'http://localhost:8080';

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegistrationFormComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { apiBaseUrl: baseUrl } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RegistrationFormComponent);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('creates', () => {
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('shows no validation errors before the first submit attempt', () => {
    fixture.detectChanges();
    expect(fixture.componentInstance['errors']).toEqual({});
  });

  it('does not call the API when the form is submitted empty', () => {
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component['onSubmit']();
    expect(Object.keys(component['errors']).length).toBeGreaterThan(0);
    httpMock.expectNone(`${baseUrl}/api/v1/admission/applicants/`);
  });

  it('emits (registered) with the API response on a successful submission', () => {
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const emitted: unknown[] = [];
    component.registered.subscribe((value) => emitted.push(value));

    component['givenName'].set('Rafi');
    component['familyName'].set('Islam');
    component['email'].set('rafi@example.com');
    component['dateOfBirth'].set('2005-03-14');
    component['onSubmit']();

    const req = httpMock.expectOne(`${baseUrl}/api/v1/admission/applicants/`);
    req.flush({
      id: 'applicant-1',
      identityUserId: 'user-1',
      givenName: 'Rafi',
      familyName: 'Islam',
      email: 'rafi@example.com',
      dateOfBirth: '2005-03-14',
      isEmailVerified: false,
      isMobileVerified: false,
    });

    expect(emitted.length).toBe(1);
    expect(component['submitting']()).toBeFalse();
  });

  it('surfaces a server error message instead of emitting on failure', () => {
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const emitted: unknown[] = [];
    component.registered.subscribe((value) => emitted.push(value));

    component['givenName'].set('Rafi');
    component['familyName'].set('Islam');
    component['email'].set('rafi@example.com');
    component['dateOfBirth'].set('2005-03-14');
    component['onSubmit']();

    httpMock
      .expectOne(`${baseUrl}/api/v1/admission/applicants/`)
      .flush(
        { title: 'An account with this email already exists.' },
        { status: 409, statusText: 'Conflict' },
      );

    expect(emitted.length).toBe(0);
    expect(component['serverErrorMessage']()).toBe('An account with this email already exists.');
  });
});
