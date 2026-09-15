import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  UmsBadgeComponent,
  UmsButtonComponent,
  UmsCardComponent,
  UmsFormFieldComponent,
  UmsInputComponent,
} from '@ums/design-system';
import type { UmsApiError } from '@ums/shared';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { TranslationService } from '../../core/i18n/translation.service';
import { ApplicationApi } from '../wizard/application.api';
import type { CampaignDto } from '../wizard/application.types';
import { OfficerCampaignApi } from './officer-campaign.api';

/**
 * Campaign configuration screen (AWEB-32, requirement-spec.md §3.8, §5 "Role-gated UI") --
 * dates, eligibility rules, and fee-structure linkage for an `AdmissionCampaign`. Reachable only
 * via `officerGuard` on the parent `officer` route (ADR-0006; see that guard's own class doc for
 * the documented Role-vs-Permission gap this app inherits from `@ums/shared`).
 *
 * **Confirmed gaps, flagged in the PR** (see `CreateCampaignRequest`'s class doc in
 * `application.types.ts` for the full research-backed writeup): no list/update/delete endpoint
 * exists for a campaign or any of its eligibility rules/seat quotas -- every write here is
 * additive-only, and there is no way to query back what was already configured. This screen
 * therefore tracks "added this session" locally (mirroring `WizardDraftStore`'s own established
 * workaround for the analogous "no query-by-natural-key endpoint" gap) rather than pretending a
 * read-back exists.
 */
@Component({
  selector: 'app-campaign-config',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    UmsBadgeComponent,
    UmsButtonComponent,
    UmsCardComponent,
    UmsFormFieldComponent,
    UmsInputComponent,
    TranslatePipe,
  ],
  templateUrl: './campaign-config.component.html',
})
export class CampaignConfigComponent {
  private readonly applicationApi = inject(ApplicationApi);
  private readonly officerCampaignApi = inject(OfficerCampaignApi);
  private readonly translation = inject(TranslationService);

  protected readonly campaign = signal<CampaignDto | null>(null);
  protected readonly loadCampaignId = signal('');
  protected readonly loadError = signal<string | null>(null);

  // Create-campaign form fields.
  protected readonly name = signal('');
  protected readonly programIdsInput = signal('');
  protected readonly windowStart = signal('');
  protected readonly windowEnd = signal('');
  protected readonly applicationFeeType = signal('');
  protected readonly confirmationFeeType = signal('');
  protected readonly createError = signal<string | null>(null);
  protected readonly creating = signal(false);

  // Additive-write sub-forms.
  protected readonly ruleProgramId = signal('');
  protected readonly ruleMinimumScore = signal('');
  protected readonly ruleIsGpaScale = signal(true);
  protected readonly ruleRequiredBoard = signal('');
  protected readonly addedRules = signal<
    readonly { programId: string; minimumScore: number; isGpaScale: boolean }[]
  >([]);

  protected readonly quotaProgramId = signal('');
  protected readonly quotaAmount = signal('');
  protected readonly addedQuotas = signal<readonly { programId: string; quota: number }[]>([]);

  protected readonly documentType = signal('');

  protected readonly submittingRule = signal(false);
  protected readonly submittingQuota = signal(false);
  protected readonly submittingDocument = signal(false);

  protected loadCampaign(): void {
    const id = this.loadCampaignId().trim();
    if (!id) {
      return;
    }
    this.loadError.set(null);
    this.applicationApi.getCampaign(id).subscribe({
      next: (campaign) => this.campaign.set(campaign),
      error: (error: UmsApiError) =>
        this.loadError.set(error.message || this.translation.t('officer.campaign.loadError')),
    });
  }

  protected createCampaign(): void {
    const programIds = this.programIdsInput()
      .split(',')
      .map((id) => id.trim())
      .filter((id) => id.length > 0);

    if (!this.name().trim() || programIds.length === 0) {
      this.createError.set(this.translation.t('officer.campaign.create.validationError'));
      return;
    }

    this.creating.set(true);
    this.createError.set(null);
    this.officerCampaignApi
      .createCampaign({
        name: this.name().trim(),
        programIds,
        applicationWindowStart: this.windowStart(),
        applicationWindowEnd: this.windowEnd(),
        applicationFeeType: this.applicationFeeType().trim(),
        confirmationFeeType: this.confirmationFeeType().trim(),
      })
      .subscribe({
        next: (campaign) => {
          this.creating.set(false);
          this.campaign.set(campaign);
        },
        error: (error: UmsApiError) => {
          this.creating.set(false);
          this.createError.set(
            error.message || this.translation.t('officer.campaign.create.serverError'),
          );
        },
      });
  }

  protected addEligibilityRule(): void {
    const campaign = this.campaign();
    const programId = this.ruleProgramId().trim();
    const minimumScore = Number(this.ruleMinimumScore());
    if (!campaign || !programId || !Number.isFinite(minimumScore)) {
      return;
    }

    this.submittingRule.set(true);
    this.officerCampaignApi
      .addEligibilityRule(campaign.id, {
        programId,
        minimumScore,
        isGpaScale: this.ruleIsGpaScale(),
        requiredBoard: this.ruleRequiredBoard().trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.submittingRule.set(false);
          this.addedRules.update((rules) => [
            ...rules,
            { programId, minimumScore, isGpaScale: this.ruleIsGpaScale() },
          ]);
          this.ruleProgramId.set('');
          this.ruleMinimumScore.set('');
          this.ruleRequiredBoard.set('');
        },
        error: () => this.submittingRule.set(false),
      });
  }

  protected addSeatQuota(): void {
    const campaign = this.campaign();
    const programId = this.quotaProgramId().trim();
    const quota = Number(this.quotaAmount());
    if (!campaign || !programId || !Number.isFinite(quota)) {
      return;
    }

    this.submittingQuota.set(true);
    this.officerCampaignApi.addSeatQuota(campaign.id, { programId, quota }).subscribe({
      next: () => {
        this.submittingQuota.set(false);
        this.addedQuotas.update((quotas) => [...quotas, { programId, quota }]);
        this.quotaProgramId.set('');
        this.quotaAmount.set('');
      },
      error: () => this.submittingQuota.set(false),
    });
  }

  protected addRequiredDocument(): void {
    const campaign = this.campaign();
    const documentType = this.documentType().trim();
    if (!campaign || !documentType) {
      return;
    }

    this.submittingDocument.set(true);
    this.officerCampaignApi.addRequiredDocument(campaign.id, { documentType }).subscribe({
      next: (updated) => {
        this.submittingDocument.set(false);
        this.campaign.set(updated);
        this.documentType.set('');
      },
      error: () => this.submittingDocument.set(false),
    });
  }
}
