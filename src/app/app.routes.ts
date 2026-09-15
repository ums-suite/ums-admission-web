import { Routes } from '@angular/router';

/**
 * Root route table.
 *
 * Two registers per requirement-spec.md §2/§10.1:
 * - `''` (and other pre-login marketing/info paths added later): SSR/prerendered, editorial.
 * - `'app/**'`: the entire authenticated funnel (registration through enrollment handoff,
 *   plus the Officer surface) — always CSR, never server-rendered (see app.routes.server.ts).
 *
 * AWEB-1 wires the split with placeholder leaves; AWEB-6 builds the real routing shell (guards,
 * lazy feature routes) under `app/**`.
 */
export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/marketing/marketing-landing.component').then(
        (m) => m.MarketingLandingComponent,
      ),
  },
  {
    path: 'app',
    loadComponent: () =>
      import('./shell/authenticated-placeholder.component').then(
        (m) => m.AuthenticatedPlaceholderComponent,
      ),
  },
];
