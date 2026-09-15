import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { UmsStepperComponent } from '@ums/design-system';
import type { StepperStep } from '@ums/design-system';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { TranslationService } from '../../core/i18n/translation.service';
import { AcademicHistoryStepComponent } from './academic-history-step.component';
import { DocumentUploadStepComponent } from './document-upload-step.component';
import { ProgramChoiceStepComponent } from './program-choice-step.component';
import { ReviewSubmitStepComponent } from './review-submit-step.component';
import { WizardDraftStore } from './wizard-draft.store';

type WizardStepId = 'programChoices' | 'academicHistory' | 'documents' | 'review';
const STEP_ORDER: readonly WizardStepId[] = [
  'programChoices',
  'academicHistory',
  'documents',
  'review',
];

/**
 * Wizard shell (AWEB-13, requirement-spec.md §3.2, §7 "progress made visible"): a persistent
 * `UmsStepperComponent` step indicator plus a {@link WizardDraftStore}-backed body that renders
 * exactly one step at a time. Save-as-draft is the store's job (every step's own "next" action
 * calls into the store, which persists to the real `Application` before advancing) -- this shell
 * only owns *which* step is showing and the step indicator's own state, never form data itself.
 *
 * `campaignId` comes from the route (`/app/wizard/:campaignId`) -- see `application.types.ts` for
 * why there is no "list active campaigns" endpoint to discover it any other way today.
 */
@Component({
  selector: 'app-wizard-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    UmsStepperComponent,
    ProgramChoiceStepComponent,
    AcademicHistoryStepComponent,
    DocumentUploadStepComponent,
    ReviewSubmitStepComponent,
    TranslatePipe,
  ],
  templateUrl: './wizard-shell.component.html',
})
export class WizardShellComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  protected readonly store = inject(WizardDraftStore);
  private readonly translation = inject(TranslationService);

  protected readonly currentStepIndex = signal(0);

  protected readonly steps: readonly StepperStep[] = [
    { label: this.translation.t('wizard.step.programChoices') },
    { label: this.translation.t('wizard.step.academicHistory') },
    { label: this.translation.t('wizard.step.documents') },
    { label: this.translation.t('wizard.step.review') },
  ];

  protected get currentStepId(): WizardStepId {
    return STEP_ORDER[this.currentStepIndex()];
  }

  ngOnInit(): void {
    const campaignId = this.route.snapshot.paramMap.get('campaignId');
    if (campaignId) {
      this.store.initialize(campaignId);
    }
  }

  protected goToStep(index: number): void {
    if (index <= this.currentStepIndex()) {
      this.currentStepIndex.set(index);
    }
  }

  protected advance(): void {
    this.currentStepIndex.update((index) => Math.min(index + 1, STEP_ORDER.length - 1));
  }

  protected goBack(): void {
    this.currentStepIndex.update((index) => Math.max(index - 1, 0));
  }
}
