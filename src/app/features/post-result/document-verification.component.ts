import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { UmsBadgeComponent, UmsCardComponent } from '@ums/design-system';
import type { BadgeVariant } from '@ums/design-system';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { ApplicationApi } from '../wizard/application.api';
import type {
  ApplicationDocumentDto,
  ApplicationDocumentStatus,
} from '../wizard/application.types';

type ScreenState = 'loading' | 'ready' | 'error';

const STATUS_BADGE_VARIANT: Readonly<Record<ApplicationDocumentStatus, BadgeVariant>> = {
  Pending: 'warning',
  Approved: 'success',
  Rejected: 'danger',
};

/**
 * Document verification status tracker (AWEB-30, requirement-spec.md §3.7: "Document verification
 * status (physical/officer-reviewed) is surfaced back to the applicant as it progresses, so 'what
 * happens now' is never a mystery after paying").
 *
 * **Confirmed gap**: `ApplicationDocumentDto` (already established in `application.types.ts` from
 * the AWEB-13..17 research pass) carries only a *current* `status`/`rejectionReason` -- there is
 * no review-history/timeline endpoint or field anywhere in `ums-core`'s `Admission` module. This
 * screen is therefore a present-status view (never a "history"/progress-log to render) -- the
 * one exception is the plain per-document status badge itself, which already satisfies the
 * "never a single ambiguous checkbox" posture the wizard's own upload step (AWEB-16) established.
 * Flagged in the PR as a suggested `Admission` addition (a review-timestamp/history field) rather
 * than inventing client-side history data that doesn't exist server-side.
 */
@Component({
  selector: 'app-document-verification',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UmsBadgeComponent, UmsCardComponent, TranslatePipe],
  templateUrl: './document-verification.component.html',
})
export class DocumentVerificationComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly applicationApi = inject(ApplicationApi);

  protected readonly state = signal<ScreenState>('loading');
  protected readonly documents = signal<readonly ApplicationDocumentDto[]>([]);

  protected readonly approvedCount = computed(
    () => this.documents().filter((d) => d.status === 'Approved').length,
  );
  protected readonly totalCount = computed(() => this.documents().length);

  ngOnInit(): void {
    const applicationId = this.route.snapshot.paramMap.get('applicationId');
    if (!applicationId) {
      this.state.set('error');
      return;
    }

    this.applicationApi.getApplication(applicationId).subscribe({
      next: (application) => {
        this.documents.set(application.documents);
        this.state.set('ready');
      },
      error: () => this.state.set('error'),
    });
  }

  protected badgeVariant(status: ApplicationDocumentStatus): BadgeVariant {
    return STATUS_BADGE_VARIANT[status];
  }
}
