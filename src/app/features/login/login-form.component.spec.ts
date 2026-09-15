import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideApi } from '@ums/shared';
import { LoginFormComponent } from './login-form.component';

const tokenPair = {
  accessToken: 'access-1',
  accessTokenExpiresAt: '2026-01-01T00:15:00Z',
  refreshToken: 'refresh-1',
  refreshTokenExpiresAt: '2026-01-08T00:00:00Z',
  sessionId: 'session-1',
};

describe('LoginFormComponent', () => {
  let httpMock: HttpTestingController;
  let router: Router;
  const baseUrl = 'http://localhost:8080';

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideApi(baseUrl),
        provideRouter([
          { path: 'login', component: LoginFormComponent },
          { path: 'app', children: [{ path: 'wizard', component: LoginFormComponent }] },
        ]),
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('does not call the API when submitted empty', async () => {
    const harness = await RouterTestingHarness.create('/login');
    const component = harness.routeDebugElement?.componentInstance as LoginFormComponent;
    component['onSubmit']();
    httpMock.expectNone(`${baseUrl}/api/v1/identity/auth/login`);
    expect(Object.keys(component['errors']).length).toBeGreaterThan(0);
  });

  it('navigates to the authenticated home on a successful login with no returnUrl', async () => {
    const harness = await RouterTestingHarness.create('/login');
    const component = harness.routeDebugElement?.componentInstance as LoginFormComponent;
    component['identifier'].set('jdoe');
    component['password'].set('correct-horse');
    component['onSubmit']();

    httpMock.expectOne(`${baseUrl}/api/v1/identity/auth/login`).flush(tokenPair);
    await harness.fixture.whenStable();

    expect(router.url).toBe('/app');
  });

  it('navigates to returnUrl when the applicant was redirected here by authGuard', async () => {
    const harness = await RouterTestingHarness.create('/login?returnUrl=%2Fapp%2Fwizard');
    const component = harness.routeDebugElement?.componentInstance as LoginFormComponent;
    component['identifier'].set('jdoe');
    component['password'].set('correct-horse');
    component['onSubmit']();

    httpMock.expectOne(`${baseUrl}/api/v1/identity/auth/login`).flush(tokenPair);
    await harness.fixture.whenStable();

    expect(router.url).toBe('/app/wizard');
  });

  it('surfaces a specific server error message on a failed login', async () => {
    const harness = await RouterTestingHarness.create('/login');
    const component = harness.routeDebugElement?.componentInstance as LoginFormComponent;
    component['identifier'].set('jdoe');
    component['password'].set('wrong-password');
    component['onSubmit']();

    httpMock
      .expectOne(`${baseUrl}/api/v1/identity/auth/login`)
      .flush({ title: 'Invalid credentials.' }, { status: 401, statusText: 'Unauthorized' });

    expect(component['serverErrorMessage']()).toBe('Invalid credentials.');
  });
});
