import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';
import { TokenStorageService } from '@ums/shared';
import { AUTH_ROUTES, RETURN_URL_QUERY_PARAM } from './auth-routes.constants';

/**
 * Route-level "must be logged in" gate (AWEB-4). Scope note: this is a generic authenticated-vs-
 * anonymous check only -- role/permission-scoped gating for the Officer surface (§3.8, §5
 * "Role-gated UI") is AWEB-6's job, layered on top of this one, not duplicated here.
 *
 * Deliberately does NOT apply to an in-progress exam session: Domain rule §5/edge-cases.md's
 * "Auto-Save Request Racing a BFF Access-Token Refresh Mid-Exam" requires a token-refresh
 * failure mid-test to never force re-authentication -- the Exam Session Store (AWEB-9/AWEB-25)
 * handles that failure mode itself via resilient save-retry, and must never be short-circuited by
 * this guard re-navigating the applicant away from an active `ExamAttempt`.
 */
export const authGuard: CanActivateFn = (route, state) => {
  const tokenStorage = inject(TokenStorageService);
  const router = inject(Router);

  if (tokenStorage.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree([AUTH_ROUTES.login], {
    queryParams: { [RETURN_URL_QUERY_PARAM]: state.url },
  });
};

/**
 * The inverse of {@link authGuard} for anonymous-only screens (login/register) -- an already
 * logged-in applicant navigating back to `/app/login` is sent to {@link AUTH_ROUTES.authenticatedHome}
 * instead of being shown the login form again.
 */
export const guestGuard: CanActivateFn = () => {
  const tokenStorage = inject(TokenStorageService);
  const router = inject(Router);

  if (!tokenStorage.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree([AUTH_ROUTES.authenticatedHome]);
};
