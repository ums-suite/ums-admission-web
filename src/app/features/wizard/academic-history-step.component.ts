import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import {
  UmsButtonComponent,
  UmsFormFieldComponent,
  UmsInputComponent,
  UmsSelectComponent,
} from '@ums/design-system';
import type { UmsApiError } from '@ums/shared';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { TranslationService } from '../../core/i18n/translation.service';
import { ApplicationApi } from './application.api';
import type { AcademicRecordRequest } from './application.types';
import { WizardDraftStore } from './wizard-draft.store';

/** Academic history/eligibility data step (AWEB-15, requirement-spec.md §3.2). */
@Component({
  selector: 'app-academic-history-step',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    UmsButtonComponent,
    UmsFormFieldComponent,
    UmsInputComponent,
    UmsSelectComponent,
    TranslatePipe,
  ],
  templateUrl: './academic-history-step.component.html',
})
export class AcademicHistoryStepComponent {
  private readonly applicationApi = inject(ApplicationApi);
  protected readonly store = inject(WizardDraftStore);
  private readonly translation = inject(TranslationService);

  readonly next = output();
  readonly back = output();

  protected readonly scaleOptions = [
    { value: 'gpa', label: this.translation.t('wizard.academicHistory.scale.gpa') },
    { value: 'percentage', label: this.translation.t('wizard.academicHistory.scale.percentage') },
  ];

  protected readonly board = signal('');
  protected readonly examName = signal('');
  protected readonly passingYear = signal('');
  protected readonly score = signal('');
  protected readonly scale = signal('gpa');

  protected readonly records = signal<readonly AcademicRecordRequest[]>([]);
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected get canAddRecord(): boolean {
    return (
      this.board().trim().length > 0 &&
      this.examName().trim().length > 0 &&
      this.passingYear().trim().length > 0 &&
      this.score().trim().length > 0
    );
  }

  protected addRecord(): void {
    if (!this.canAddRecord) {
      return;
    }
    this.records.update((current) => [
      ...current,
      {
        board: this.board().trim(),
        examName: this.examName().trim(),
        passingYear: Number(this.passingYear()),
        score: Number(this.score()),
        isGpaScale: this.scale() === 'gpa',
      },
    ]);
    this.board.set('');
    this.examName.set('');
    this.passingYear.set('');
    this.score.set('');
  }

  protected removeRecord(index: number): void {
    this.records.update((current) => current.filter((_, i) => i !== index));
  }

  protected onSubmit(): void {
    this.errorMessage.set(null);
    const applicantId = this.store.application()?.applicantId;

    if (this.records().length === 0) {
      this.errorMessage.set(this.translation.t('wizard.academicHistory.required'));
      return;
    }
    if (!applicantId) {
      return;
    }

    this.submitting.set(true);
    this.submitSequentially(applicantId, [...this.records()]);
  }

  private submitSequentially(applicantId: string, remaining: AcademicRecordRequest[]): void {
    const record = remaining.shift();
    if (!record) {
      this.submitting.set(false);
      this.next.emit();
      return;
    }
    this.applicationApi.addAcademicRecord(applicantId, record).subscribe({
      next: () => this.submitSequentially(applicantId, remaining),
      error: (error: UmsApiError) => {
        this.submitting.set(false);
        this.errorMessage.set(
          error.message || this.translation.t('wizard.academicHistory.serverError'),
        );
      },
    });
  }
}
