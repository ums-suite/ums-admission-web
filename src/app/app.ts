import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService, UmsToastContainerComponent } from '@ums/design-system';

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
}
