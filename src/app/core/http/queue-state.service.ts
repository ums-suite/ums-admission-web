import { Injectable, computed, signal } from '@angular/core';
import type { QueueStatus } from './queue-status.types';

/**
 * The app-wide, most-recently-reported queue state (AWEB-7). A first-class, always-inspectable
 * signal rather than something only visible inside a single failed request's `catchError` --
 * AWEB-27's waiting-room screen reads this reactively, and any part of the app can check
 * `isQueued()` before deciding how to render a loading state, matching Domain Invariant #6
 * ("waiting-room state is always distinguishable from a broken app... an applicant must never be
 * left staring at an ambiguous spinner").
 *
 * Deliberately holds only the latest report, not a history -- the waiting room's job (AWEB-27) is
 * to keep this fresh via its own polling loop once queued, not to replay a queue's past state.
 */
@Injectable({ providedIn: 'root' })
export class QueueStateService {
  private readonly status = signal<QueueStatus | null>(null);

  readonly current = this.status.asReadonly();
  readonly isQueued = computed(() => this.status() !== null);

  report(status: QueueStatus): void {
    this.status.set(status);
  }

  /** Called once the applicant's turn arrives (a subsequent request succeeds) or the waiting room unmounts. */
  clear(): void {
    this.status.set(null);
  }
}
