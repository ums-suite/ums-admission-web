import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService, UmsToastContainerComponent } from '@ums/design-system';
import { SessionExpiryService } from './core/auth/session-expiry.service';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, UmsToastContainerComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  // Injected (not just imported) so ThemeService's constructor runs at bootstrap and applies the
  // `data-theme`/`data-register` attributes before first paint (AWEB-2, requirement-spec.md §2
  // Design system row / §7).
  private readonly theme = inject(ThemeService);

  // Injected purely so its constructor runs at bootstrap and its sessionExpired$ subscription is
  // live for the whole app session (AWEB-4).
  private readonly sessionExpiry = inject(SessionExpiryService);
}
