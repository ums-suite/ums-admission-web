import { Location } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { CurrentUserService, TokenStorageService } from '@ums/shared';
import { routes } from './app.routes';

const tokenPair = {
  accessToken: 'access-1',
  accessTokenExpiresAt: '2026-01-01T00:15:00Z',
  refreshToken: 'refresh-1',
  refreshTokenExpiresAt: '2026-01-08T00:00:00Z',
  sessionId: 'session-1',
};

describe('app.routes (AWEB-6 routing shell)', () => {
  let router: Router;
  let location: Location;
  let tokenStorage: TokenStorageService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
    router = TestBed.inject(Router);
    location = TestBed.inject(Location);
    tokenStorage = TestBed.inject(TokenStorageService);
  });

  afterEach(() => localStorage.clear());

  it('redirects an unauthenticated applicant away from the wizard to login with a returnUrl', async () => {
    await router.navigateByUrl('/app/wizard');
    expect(location.path()).toContain('/app/login');
    expect(location.path()).toContain('returnUrl=%2Fapp%2Fwizard');
  });

  it('allows an authenticated applicant into the wizard', async () => {
    tokenStorage.setTokens(tokenPair);
    await router.navigateByUrl('/app/wizard');
    expect(location.path()).toBe('/app/wizard');
  });

  it('redirects an already-authenticated applicant away from /app/login', async () => {
    tokenStorage.setTokens(tokenPair);
    await router.navigateByUrl('/app/login');
    expect(location.path()).toBe('/app');
  });

  it('allows the result-check route through with no session at all', async () => {
    await router.navigateByUrl('/app/result');
    expect(location.path()).toBe('/app/result');
  });

  it('redirects an unauthenticated applicant away from the exam attempt screen to login', async () => {
    await router.navigateByUrl('/app/exam/attempt/attempt-1');
    expect(location.path()).toContain('/app/login');
  });

  it('allows an authenticated applicant into the exam pretest and attempt screens (AWEB-21/22)', async () => {
    tokenStorage.setTokens(tokenPair);
    await router.navigateByUrl('/app/exam/pretest/app-1');
    expect(location.path()).toBe('/app/exam/pretest/app-1');

    await router.navigateByUrl('/app/exam/attempt/attempt-1');
    expect(location.path()).toBe('/app/exam/attempt/attempt-1');
  });

  it('blocks a logged-in non-officer from the officer console', async () => {
    tokenStorage.setTokens(tokenPair);
    TestBed.inject(CurrentUserService); // ensure DI wiring resolves before navigation
    await router.navigateByUrl('/app/officer');
    expect(location.path()).toBe('/app');
  });
});
