import { Injectable, inject } from '@angular/core';
import { IdentityApiService, TokenStorageService, type UmsTokenPair } from '@ums/shared';
import { Observable, tap } from 'rxjs';

/**
 * This app's own login/logout facade over `@ums/shared`'s session primitives (AWEB-4,
 * requirement-spec.md §3.1/§5, ADR-0005). `@ums/shared`'s own README is explicit that it
 * deliberately does *not* ship this facade itself ("this package does not wrap it in an
 * 'AuthService' facade, to stay out of domain/flow logic per ADR-0017") -- building it is exactly
 * this ticket's job.
 *
 * Session mechanics (established by `@ums/shared`, not re-derived here): a signed access/refresh
 * token pair, held in `TokenStorageService`'s signal and persisted best-effort to `localStorage`;
 * `authInterceptor` attaches the bearer token and single-flights refresh-on-401;
 * `AuthRefreshCoordinator` owns the actual rotation call. This app never parses or attaches a
 * token by hand outside that existing machinery -- see `core/http/provide-core-http.ts` for how
 * it's wired into the HTTP layer.
 *
 * The generated `IdentityApiService`'s auth methods are untyped (`Observable<any>` -- see
 * `@ums/shared`'s own README "Known gap: request bodies are typed, response bodies mostly are
 * not"); this service is the one place that risk is contained, casting the response to
 * {@link UmsTokenPair} against the real `TokenPairResult` wire shape `@ums/shared`'s own
 * `auth.types.ts` already documents, so every other caller in this app gets a typed result.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly identityApi = inject(IdentityApiService);
  private readonly tokenStorage = inject(TokenStorageService);

  /** `POST /api/v1/identity/auth/login`. Stores the returned token pair on success. */
  login(identifier: string, password: string): Observable<UmsTokenPair> {
    return (
      this.identityApi.apiV1IdentityAuthLoginPost({
        identifier,
        password,
      }) as Observable<UmsTokenPair>
    ).pipe(tap((pair) => this.tokenStorage.setTokens(pair)));
  }

  /**
   * `POST /api/v1/identity/auth/logout` (this session only). Clears local session state
   * regardless of whether the server call succeeds -- a logout that fails server-side (e.g. the
   * network drops on the way out) must never leave the applicant looking logged-in on their own
   * device.
   */
  logout(): Observable<unknown> {
    return this.identityApi
      .apiV1IdentityAuthLogoutPost()
      .pipe(tap({ next: () => this.tokenStorage.clear(), error: () => this.tokenStorage.clear() }));
  }

  /** `POST /api/v1/identity/auth/logout-all` (every session/device) -- same local-clear guarantee as {@link logout}. */
  logoutAll(): Observable<unknown> {
    return this.identityApi
      .apiV1IdentityAuthLogoutAllPost()
      .pipe(tap({ next: () => this.tokenStorage.clear(), error: () => this.tokenStorage.clear() }));
  }
}
