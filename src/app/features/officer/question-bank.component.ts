import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  UmsButtonComponent,
  UmsCardComponent,
  UmsFormFieldComponent,
  UmsInputComponent,
  UmsSelectComponent,
} from '@ums/design-system';
import type { SelectOption } from '@ums/design-system';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { AdmissionTestApi } from '../exam/admission-test.api';
import type { AdmissionTestDto } from '../exam/admission-test.types';
import type { QuestionDifficulty } from '../../core/exam-session/exam-attempt.types';

const DIFFICULTY_OPTIONS: readonly SelectOption[] = [
  { value: 'Easy', label: 'Easy' },
  { value: 'Medium', label: 'Medium' },
  { value: 'Hard', label: 'Hard' },
];

/**
 * Question-bank management + exam-rule configuration (AWEB-33, requirement-spec.md §3.8) for an
 * `AdmissionTest`. See `admission-test.types.ts`'s `CreateAdmissionTestRequest` class doc for the
 * confirmed additive-only gap this screen is built against -- an "added this session" local list
 * per sub-form, exactly like `CampaignConfigComponent`'s own identical workaround.
 */
@Component({
  selector: 'app-question-bank',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    UmsButtonComponent,
    UmsCardComponent,
    UmsFormFieldComponent,
    UmsInputComponent,
    UmsSelectComponent,
    TranslatePipe,
  ],
  templateUrl: './question-bank.component.html',
})
export class QuestionBankComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly testApi = inject(AdmissionTestApi);

  protected readonly difficultyOptions = DIFFICULTY_OPTIONS;
  protected readonly test = signal<AdmissionTestDto | null>(null);
  protected readonly testName = signal('');
  protected readonly durationMinutes = signal('');
  protected readonly creatingTest = signal(false);

  protected readonly questionCategory = signal('');
  protected readonly questionDifficulty = signal<QuestionDifficulty>('Medium');
  protected readonly questionText = signal('');
  protected readonly questionOptionsInput = signal('');
  protected readonly questionMaxScore = signal('');
  protected readonly questionIsSubjective = signal(false);
  protected readonly submittingQuestion = signal(false);
  protected readonly addedQuestionCount = signal(0);

  protected readonly ruleDifficulty = signal<QuestionDifficulty>('Medium');
  protected readonly ruleCount = signal('');
  protected readonly submittingRule = signal(false);

  protected readonly slotStartAt = signal('');
  protected readonly slotEndAt = signal('');
  protected readonly slotCapacity = signal('');
  protected readonly submittingSlot = signal(false);

  private campaignId: string | null = null;

  ngOnInit(): void {
    this.campaignId = this.route.snapshot.paramMap.get('campaignId');
    if (!this.campaignId) {
      return;
    }
    this.testApi.getByCampaign(this.campaignId).subscribe({
      next: (test) => this.test.set(test),
      error: () => undefined, // no test exists yet for this campaign -- the create-test form covers that.
    });
  }

  protected createTest(): void {
    const campaignId = this.campaignId;
    const duration = Number(this.durationMinutes());
    if (!campaignId || !this.testName().trim() || !Number.isFinite(duration)) {
      return;
    }
    this.creatingTest.set(true);
    this.testApi
      .createTest({ campaignId, name: this.testName().trim(), durationMinutes: duration })
      .subscribe({
        next: (test) => {
          this.creatingTest.set(false);
          this.test.set(test);
        },
        error: () => this.creatingTest.set(false),
      });
  }

  protected addQuestion(): void {
    const test = this.test();
    const maxScore = Number(this.questionMaxScore());
    if (!test || !this.questionCategory().trim() || !this.questionText().trim()) {
      return;
    }
    const options = this.questionOptionsInput()
      .split(',')
      .map((option) => option.trim())
      .filter((option) => option.length > 0);

    this.submittingQuestion.set(true);
    this.testApi
      .addQuestion(test.id, {
        category: this.questionCategory().trim(),
        difficulty: this.questionDifficulty(),
        text: this.questionText().trim(),
        options,
        isSubjective: this.questionIsSubjective(),
        maxScore: Number.isFinite(maxScore) ? maxScore : 0,
      })
      .subscribe({
        next: (updated) => {
          this.submittingQuestion.set(false);
          this.test.set(updated);
          this.addedQuestionCount.update((count) => count + 1);
          this.questionCategory.set('');
          this.questionText.set('');
          this.questionOptionsInput.set('');
          this.questionMaxScore.set('');
        },
        error: () => this.submittingQuestion.set(false),
      });
  }

  protected addSelectionRule(): void {
    const test = this.test();
    const count = Number(this.ruleCount());
    if (!test || !Number.isFinite(count)) {
      return;
    }
    this.submittingRule.set(true);
    this.testApi
      .addSelectionRule(test.id, { questionDifficulty: this.ruleDifficulty(), count })
      .subscribe({
        next: (updated) => {
          this.submittingRule.set(false);
          this.test.set(updated);
          this.ruleCount.set('');
        },
        error: () => this.submittingRule.set(false),
      });
  }

  protected addSlot(): void {
    const test = this.test();
    const capacity = Number(this.slotCapacity());
    if (!test || !this.slotStartAt() || !this.slotEndAt() || !Number.isFinite(capacity)) {
      return;
    }
    this.submittingSlot.set(true);
    this.testApi
      .addSlot(test.id, {
        startAt: this.slotStartAt(),
        endAt: this.slotEndAt(),
        capacity,
      })
      .subscribe({
        next: (updated) => {
          this.submittingSlot.set(false);
          this.test.set(updated);
          this.slotStartAt.set('');
          this.slotEndAt.set('');
          this.slotCapacity.set('');
        },
        error: () => this.submittingSlot.set(false),
      });
  }
}
