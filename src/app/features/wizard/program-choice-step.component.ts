import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import { UmsBadgeComponent, UmsButtonComponent, UmsSelectComponent } from '@ums/design-system';
import type { SelectOption } from '@ums/design-system';
import type { UmsApiError } from '@ums/shared';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { TranslationService } from '../../core/i18n/translation.service';
import { OrganizationProgramApi, type OrganizationProgramDto } from './organization-program.api';
import { WizardDraftStore } from './wizard-draft.store';

/**
 * `ProgramChoice` ordered-preference-list step (AWEB-14, requirement-spec.md §3.2). Eligibility
 * feedback is rendered only when `CampaignDto.eligibilityRules` is actually present -- see
 * `application.types.ts` for the confirmed gap (the real backend never populates it today), so
 * this degrades gracefully to "no inline eligibility warning" rather than fabricating one.
 */
@Component({
  selector: 'app-program-choice-step',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UmsBadgeComponent, UmsButtonComponent, UmsSelectComponent, TranslatePipe],
  templateUrl: './program-choice-step.component.html',
})
export class ProgramChoiceStepComponent implements OnInit {
  private readonly programApi = inject(OrganizationProgramApi);
  protected readonly store = inject(WizardDraftStore);
  private readonly translation = inject(TranslationService);

  readonly next = output();

  protected readonly loadingPrograms = signal(true);
  protected readonly allPrograms = signal<readonly OrganizationProgramDto[]>([]);
  protected readonly selectedProgramIds = signal<readonly string[]>([]);
  protected readonly pendingProgramId = signal('');
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly offeredPrograms = computed(() => {
    const campaign = this.store.campaign();
    if (!campaign) {
      return [];
    }
    const offeredIds = new Set(campaign.programIds);
    return this.allPrograms().filter((program) => offeredIds.has(program.id));
  });

  protected readonly availableOptions = computed<readonly SelectOption[]>(() => {
    const chosen = new Set(this.selectedProgramIds());
    return this.offeredPrograms()
      .filter((program) => !chosen.has(program.id))
      .map((program) => ({ value: program.id, label: program.name }));
  });

  protected readonly orderedChoices = computed(() =>
    this.selectedProgramIds().map((id, index) => ({
      rank: index + 1,
      program: this.allPrograms().find((program) => program.id === id),
      programId: id,
      eligibilityWarning: this.eligibilityWarningFor(id),
    })),
  );

  ngOnInit(): void {
    this.programApi.listPrograms().subscribe({
      next: (programs) => {
        this.allPrograms.set(programs);
        this.loadingPrograms.set(false);
        const existing = this.store.application()?.programChoices ?? [];
        if (existing.length > 0) {
          this.selectedProgramIds.set(
            [...existing].sort((a, b) => a.rank - b.rank).map((choice) => choice.programId),
          );
        }
      },
      error: () => this.loadingPrograms.set(false),
    });
  }

  protected addChoice(): void {
    const programId = this.pendingProgramId();
    if (!programId) {
      return;
    }
    this.selectedProgramIds.update((ids) => [...ids, programId]);
    this.pendingProgramId.set('');
  }

  protected removeChoice(programId: string): void {
    this.selectedProgramIds.update((ids) => ids.filter((id) => id !== programId));
  }

  protected moveUp(index: number): void {
    if (index <= 0) {
      return;
    }
    this.selectedProgramIds.update((ids) => swap(ids, index, index - 1));
  }

  protected moveDown(index: number): void {
    this.selectedProgramIds.update((ids) =>
      index >= ids.length - 1 ? ids : swap(ids, index, index + 1),
    );
  }

  protected onSubmit(): void {
    this.errorMessage.set(null);
    const choices = this.selectedProgramIds().map((programId, index) => ({
      programId,
      rank: index + 1,
    }));
    if (choices.length === 0) {
      this.errorMessage.set(this.translation.t('wizard.programChoices.required'));
      return;
    }
    this.store.setProgramChoices(
      choices,
      () => this.next.emit(),
      (error: UmsApiError) =>
        this.errorMessage.set(
          error.message || this.translation.t('wizard.programChoices.serverError'),
        ),
    );
  }

  private eligibilityWarningFor(programId: string): string | null {
    const rules = this.store.campaign()?.eligibilityRules;
    if (!rules) {
      return null;
    }
    const rule = rules.find((r) => r.programId === programId);
    return rule ? this.translation.t('wizard.programChoices.eligibilityKnown') : null;
  }
}

function swap<T>(items: readonly T[], a: number, b: number): readonly T[] {
  const copy = [...items];
  [copy[a], copy[b]] = [copy[b], copy[a]];
  return copy;
}
