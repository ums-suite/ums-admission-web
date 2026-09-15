import { InjectionToken } from '@angular/core';
import { environment } from '../../../environments/environment';

/**
 * App-wide runtime configuration (AWEB-5). Kept deliberately tiny -- one field today -- but a
 * single injection token rather than importing `environment` directly from every consumer, so
 * a future per-deployment override (e.g. an index.html-injected `window.__APP_CONFIG__`) has one
 * seam to change rather than a repo-wide find/replace.
 */
export interface AppConfig {
  /**
   * The origin `ums-core`'s Host is served from. Passed to `@ums/shared`'s `provideApi()` (the
   * generated Identity/Audit/Organization client's `Configuration.basePath`) and to
   * `UMS_AUTH_CONFIG.baseUrl` (consumed by `AuthRefreshCoordinator` and `authInterceptor`) so both
   * always agree on the same base URL -- see `core/http/provide-core-http.ts`.
   */
  readonly apiBaseUrl: string;
}

export const APP_CONFIG = new InjectionToken<AppConfig>('APP_CONFIG');

export const DEFAULT_APP_CONFIG: AppConfig = {
  apiBaseUrl: environment.apiBaseUrl,
};
