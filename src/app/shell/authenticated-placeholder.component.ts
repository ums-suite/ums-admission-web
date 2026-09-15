import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Placeholder root of the authenticated, CSR-only funnel (`/app/**`).
 *
 * requirement-spec.md §2 (Rendering row) / §10.1: "CSR for everything behind login
 * (registration, application wizard, exam, result check)". `app.routes.server.ts` maps every
 * `app/**` path to `RenderMode.Client` so nothing under this path is ever server-rendered.
 *
 * AWEB-1 only proves the split boots; AWEB-6 (Routing shell) replaces this stub with the real
 * role-gated authenticated shell and lazy feature routes.
 */
@Component({
  selector: 'app-authenticated-placeholder',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<main>
    <p>{{ message }}</p>
  </main>`,
})
export class AuthenticatedPlaceholderComponent {
  protected readonly message = 'Authenticated funnel (CSR) — scaffold placeholder.';
}
