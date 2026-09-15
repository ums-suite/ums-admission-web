import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

/**
 * Shared placeholder leaf for a not-yet-built feature route (AWEB-6 routing shell). Reused
 * across every authenticated-funnel section (wizard, payment, admit card, exam, result,
 * post-result, officer) so the route tree/guard structure can land now and each feature ticket
 * later swaps only its own leaf's `loadComponent`, not the tree around it.
 *
 * The label comes from the route's own `data.label` rather than one hardcoded string per usage,
 * so this file never needs editing as new sections are wired up in `app.routes.ts`.
 */
@Component({
  selector: 'app-feature-placeholder',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<main class="feature-placeholder">
    <p>{{ label() }} — coming soon.</p>
  </main>`,
})
export class FeaturePlaceholderComponent {
  private readonly route = inject(ActivatedRoute);

  protected readonly label = toSignal(
    this.route.data.pipe(map((data) => (data['label'] as string | undefined) ?? 'This section')),
    { initialValue: 'This section' },
  );
}
