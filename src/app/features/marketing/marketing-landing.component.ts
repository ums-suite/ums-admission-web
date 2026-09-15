import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Pre-login campaign landing placeholder.
 *
 * requirement-spec.md §2 (Rendering row): "SSR for pre-application marketing/info pages
 * (campaign landing, eligibility info) that benefit from SEO" -- this route is the one this app
 * actually server-renders/prerenders (see app.routes.server.ts). Everything behind `/app` is
 * CSR-only (the authenticated funnel) and must never be added here.
 *
 * This is a scaffold-only placeholder (AWEB-1) proving the SSR/CSR split boots end-to-end; the
 * real editorial marketing content is out of this ticket's scope.
 */
@Component({
  selector: 'app-marketing-landing',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="marketing-landing">
      <h1>{{ appName }}</h1>
      <p>Applicant admission portal — registration, application, exam, and results.</p>
    </main>
  `,
  styles: `
    .marketing-landing {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding: 2rem;
    }
  `,
})
export class MarketingLandingComponent {
  protected readonly appName = 'ums-admission-web';
}
