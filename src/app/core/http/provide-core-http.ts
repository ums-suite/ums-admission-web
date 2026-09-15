import { EnvironmentProviders, inject, makeEnvironmentProviders } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  authInterceptor,
  correlationIdInterceptor,
  localeInterceptor,
  provideApi,
  UMS_AUTH_CONFIG,
} from '@ums/shared';
import { APP_CONFIG } from '../config/app-config';
import { environment } from '../../../environments/environment';

/**
 * Wires this app's entire HTTP/API-client layer (AWEB-5, requirement-spec.md §2/§6).
 *
 * Interceptor order matters and mirrors `@ums/shared`'s own README ("Wiring it up"):
 * 1. {@link correlationIdInterceptor} first, so even a 401-triggered retry's very first attempt
 *    still carries a correlation id.
 * 2. {@link localeInterceptor} next, so every call (including the retry) carries the active
 *    locale.
 * 3. {@link authInterceptor} last, since it's the one that clones the request again for a retry
 *    and reads/attaches the bearer token.
 *
 * `provideApi` wires `@ums/shared`'s generated OpenAPI client (Identity/Audit/Organization today
 * -- see this repo's README "Known cross-team API-contract gaps" and `ums-shared/README.md`
 * "Status") with the same base URL as {@link UMS_AUTH_CONFIG}, so the generated client, the
 * refresh coordinator, and the interceptor chain above are all always pointed at the same origin.
 *
 * The base URL is read from `environment.apiBaseUrl` directly (rather than deferred through
 * `APP_CONFIG` injection) because `provideApi`'s `Configuration` is constructed once, synchronously,
 * at provider-registration time -- `APP_CONFIG` itself is still provided below so any other
 * consumer that needs the base URL at injection time (rather than bootstrap time) has one token to
 * depend on instead of importing `environment` directly.
 */
export function provideCoreHttp(): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: APP_CONFIG, useValue: { apiBaseUrl: environment.apiBaseUrl } },
    provideHttpClient(
      withInterceptors([correlationIdInterceptor, localeInterceptor, authInterceptor]),
    ),
    {
      provide: UMS_AUTH_CONFIG,
      useFactory: () => ({ baseUrl: inject(APP_CONFIG).apiBaseUrl }),
    },
    provideApi({ basePath: environment.apiBaseUrl }),
  ]);
}
