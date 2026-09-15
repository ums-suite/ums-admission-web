import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Server render-mode map, enforcing requirement-spec.md §2/§10.1's SSR/CSR split:
 * pre-login marketing/campaign-landing pages are prerendered for SEO; the entire authenticated
 * funnel behind `/app` is CSR-only and must never be rendered on the server (a CSR screen
 * server-rendered even once would defeat the "state-integrity over SEO" rationale §10.1 gives
 * for the split, and risks leaking authenticated-only bundles into the prerender step).
 */
export const serverRoutes: ServerRoute[] = [
  {
    path: 'app/**',
    renderMode: RenderMode.Client,
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
