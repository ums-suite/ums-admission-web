import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { UmsButtonComponent, UmsCardComponent } from '@ums/design-system';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { AdmitCardApi } from './admit-card.api';
import type { GeneratedDocumentDto } from './admit-card.types';

type AdmitCardScreenState =
  'loading' | 'not-available' | 'preparing' | 'ready' | 'failed' | 'error';

/**
 * Admit card download screen (AWEB-20, requirement-spec.md §3.4). See `admit-card.types.ts` for
 * the confirmed cross-team gap: no "available from [date]" field exists anywhere server-side, so
 * this screen is a presence/status-driven state machine (not-generated -> preparing -> ready)
 * rather than a countdown to a literal date, with the gap flagged in the PR rather than inventing a
 * fake date.
 *
 * "QR/digitally-verifiable" (§3.4): renders the `GeneratedDocument`'s own
 * `digitalVerificationId` as a plain verification code rather than rendering an actual QR image --
 * no QR-rendering library exists yet in this app and adding one is a small, separable follow-up
 * (flagged in the PR) rather than blocking this ticket on a new dependency decision.
 */
@Component({
  selector: 'app-admit-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UmsButtonComponent, UmsCardComponent, TranslatePipe],
  templateUrl: './admit-card.component.html',
})
export class AdmitCardComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly admitCardApi = inject(AdmitCardApi);

  protected readonly state = signal<AdmitCardScreenState>('loading');
  protected readonly rollNumber = signal<string | null>(null);
  protected readonly assignedTestSlotId = signal<string | null>(null);
  protected readonly document = signal<GeneratedDocumentDto | null>(null);

  ngOnInit(): void {
    const applicationId = this.route.snapshot.paramMap.get('applicationId');
    if (!applicationId) {
      this.state.set('error');
      return;
    }

    this.admitCardApi.getAvailability(applicationId).subscribe({
      next: (availability) => {
        this.rollNumber.set(availability.rollNumber ?? null);
        this.assignedTestSlotId.set(availability.assignedTestSlotId ?? null);

        if (!availability.admitCardDocumentId) {
          this.state.set('not-available');
          return;
        }

        this.admitCardApi.getDocument(availability.admitCardDocumentId).subscribe({
          next: (document) => {
            this.document.set(document);
            this.state.set(this.stateForDocument(document));
          },
          error: () => this.state.set('error'),
        });
      },
      error: () => this.state.set('error'),
    });
  }

  /** Isolated for testability -- opens the pre-signed direct-to-object-storage URL in a new tab, never proxied through this app. */
  protected openDownload(url: string): void {
    window.open(url, '_blank', 'noopener');
  }

  private stateForDocument(document: GeneratedDocumentDto): AdmitCardScreenState {
    if (document.status === 'Ready') {
      return 'ready';
    }
    if (document.status === 'Failed' || document.status === 'Revoked') {
      return 'failed';
    }
    return 'preparing';
  }
}
