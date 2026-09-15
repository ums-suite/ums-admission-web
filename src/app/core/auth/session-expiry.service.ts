import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TokenStorageService } from '@ums/shared';
import { AUTH_ROUTES, RETURN_URL_QUERY_PARAM } from './auth-routes.constants';

/**
 * Redirects to login the instant `@ums/shared`'s `TokenStorageService.sessionExpired$` fires --
 * i.e. a genuine refresh failure (expired/reused/revoked refresh token), never a deliberate
 * logout the app already knows about (AWEB-4, `@ums/shared`'s own docs on `sessionExpired$`).
 *
 * Deliberately NOT wired anywhere near the Exam Session Store: mid-exam, a refresh failure must
 * never force re-authentication (Domain rule §5) -- the exam flow's own resilient save-retry
 * (AWEB-9/AWEB-25) is the only thing that reacts to an auth failure while an `ExamAttempt` is in
 * progress. This service exists for every *other* screen, where "your session ended, please log
 * back in" is the correct and honest thing to tell the applicant.
 *
 * Provided at root and injected once from `App` (mirroring how `ThemeService` is injected there
 * purely so its constructor runs at bootstrap) so the subscription is live for the whole app
 * session, not re-created per route.
 */
@Injectable({ providedIn: 'root' })
export class SessionExpiryService {
  private readonly tokenStorage = inject(TokenStorageService);
  private readonly router = inject(Router);

  constructor() {
    this.tokenStorage.sessionExpired$.subscribe(() => {
      void this.router.navigate([AUTH_ROUTES.login], {
        queryParams: { [RETURN_URL_QUERY_PARAM]: this.router.url },
      });
    });
  }
}
