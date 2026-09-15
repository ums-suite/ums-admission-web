import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { UmsBadgeComponent, UmsButtonComponent, UmsModalComponent } from '@ums/design-system';
import type { BadgeVariant } from '@ums/design-system';
import type { UmsApiError } from '@ums/shared';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { MeritListApi } from './merit-list.api';
import type { MeritListDto, MeritOutcome } from './merit-list.types';

type ScreenState = 'loading' | 'not-found' | 'ready' | 'error';

const OUTCOME_BADGE_VARIANT: Readonly<Record<MeritOutcome, BadgeVariant>> = {
  Admitted: 'success',
  Waitlisted: 'warning',
  Rejected: 'neutral',
};

/**
 * Merit list generation, review, and explicit approval workflow (AWEB-34, requirement-spec.md
 * §3.8: "an explicit, auditable approval step, never an automatic publish straight from
 * evaluation"). See `merit-list.types.ts` for the confirmed 2-state (`Draft` -> `Approved`)
 * server-side machine this is built against -- there is no separate "review" endpoint, so
 * "review" here means reading every generated entry in full (rendered as a plain table, nothing
 * hidden behind pagination for this exact reason) before the officer ever reaches the approval
 * control.
 *
 * The approval control mirrors AWEB-24's own "explicit, hard-to-misclick confirmation" pattern
 * (a required acknowledgment checkbox gates the actual confirm button inside a modal) --
 * appropriate here for the same reason: approval is irreversible and this app's own domain
 * requirement explicitly forbids it ever happening automatically.
 */
@Component({
  selector: 'app-merit-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UmsBadgeComponent, UmsButtonComponent, UmsModalComponent, TranslatePipe],
  templateUrl: './merit-list.component.html',
})
export class MeritListComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly meritListApi = inject(MeritListApi);

  protected readonly state = signal<ScreenState>('loading');
  protected readonly meritList = signal<MeritListDto | null>(null);
  protected readonly generating = signal(false);
  protected readonly approving = signal(false);
  protected readonly confirmApproveOpen = signal(false);
  protected readonly confirmAcknowledged = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  private campaignId: string | null = null;

  ngOnInit(): void {
    this.campaignId = this.route.snapshot.paramMap.get('campaignId');
    if (!this.campaignId) {
      this.state.set('error');
      return;
    }

    this.meritListApi.getByCampaign(this.campaignId).subscribe({
      next: (meritList) => {
        this.meritList.set(meritList);
        this.state.set('ready');
      },
      error: (error: UmsApiError) => {
        this.state.set(error.status === 404 ? 'not-found' : 'error');
      },
    });
  }

  protected generate(): void {
    const campaignId = this.campaignId;
    if (!campaignId) {
      return;
    }
    this.generating.set(true);
    this.errorMessage.set(null);
    this.meritListApi.generate(campaignId).subscribe({
      next: (meritList) => {
        this.generating.set(false);
        this.meritList.set(meritList);
        this.state.set('ready');
      },
      error: (error: UmsApiError) => {
        this.generating.set(false);
        this.errorMessage.set(error.message || null);
      },
    });
  }

  protected openConfirmApprove(): void {
    this.confirmAcknowledged.set(false);
    this.confirmApproveOpen.set(true);
  }

  protected onConfirmApproveClosed(): void {
    this.confirmApproveOpen.set(false);
  }

  protected confirmApprove(): void {
    const meritList = this.meritList();
    if (!meritList || !this.confirmAcknowledged()) {
      return;
    }
    this.approving.set(true);
    this.meritListApi.approve(meritList.id).subscribe({
      next: (updated) => {
        this.approving.set(false);
        this.confirmApproveOpen.set(false);
        this.meritList.set(updated);
      },
      error: (error: UmsApiError) => {
        this.approving.set(false);
        this.confirmApproveOpen.set(false);
        this.errorMessage.set(error.message || null);
      },
    });
  }

  protected badgeVariant(outcome: MeritOutcome): BadgeVariant {
    return OUTCOME_BADGE_VARIANT[outcome];
  }
}
