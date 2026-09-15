/**
 * Wire shapes modeled directly off `ums-core`'s `Admission` module
 * (`UMS.Modules.Admission.Application.ExamAttempts.ExamAttemptDto`/`ExamAnswerDto`/
 * `SaveAnswerRequest`) -- verified against real source, not guessed (see this app's README
 * "Known @ums/shared contract gap"). Field names are camelCase over the wire per `ums-core`'s
 * System.Text.Json default.
 *
 * Notably, `ExamAttemptDto` carries no explicit "server now" field -- see `exam-attempt.api.ts`
 * for how this app derives one anyway (the HTTP response's own `Date` header) rather than
 * inferring the server clock from `expiresAt` alone.
 */
export type ExamAttemptStatus = 'InProgress' | 'Submitted';
export type EvaluationStatus = 'Pending' | 'Evaluated';

export interface ExamAnswerDto {
  readonly questionId: string;
  readonly selectedOptionIndex?: number;
  readonly subjectiveText?: string;
}

export interface ExamAttemptDto {
  readonly id: string;
  readonly applicantId: string;
  readonly admissionTestId: string;
  readonly rollNumber: string;
  readonly status: ExamAttemptStatus;
  readonly startedAt: string;
  readonly expiresAt: string;
  readonly selectedQuestionIds: readonly string[];
  readonly answers: readonly ExamAnswerDto[];
  readonly evaluationStatus: EvaluationStatus;
  readonly objectiveScore?: number;
  readonly subjectiveScore?: number;
}

/**
 * One question's answer, held client-side. `ums-core`'s `SaveAnswerRequest`/`ExamAnswer` treat a
 * question as either single-choice (`selectedOptionIndex`) or subjective (`subjectiveText`) --
 * never both at once in practice, but the wire shape allows both fields, so this type mirrors
 * that rather than forcing a client-side union that could silently drop a field the server sent.
 */
export interface AnswerInput {
  readonly selectedOptionIndex?: number;
  readonly subjectiveText?: string;
}

/** An HTTP response's payload plus the server clock time read from its `Date` header. */
export interface ServerTimedResponse<T> {
  readonly body: T;
  readonly serverNowMs: number;
}
