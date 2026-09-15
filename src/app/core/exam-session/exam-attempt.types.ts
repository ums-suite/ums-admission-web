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

export type QuestionDifficulty = 'Easy' | 'Medium' | 'Hard';

/**
 * One exam question's content (AWEB-21/22). **Confirmed cross-team gap, blocking**: `ums-core`'s
 * `AdmissionTest.Questions` (`QuestionBankEntry`, full `text`/`options`) exists server-side but is
 * write-only from this API's perspective -- `POST /tests/{id}/questions` (officer-only,
 * `admission.campaign.manage`) is the only route that touches it; `GET /tests/by-campaign/{id}`
 * returns only `AdmissionTestDto` (`id, campaignId, name, durationMinutes, totalQuestionCount,
 * slotCount` -- no `Questions` collection at all). There is today **no confirmed endpoint an
 * Applicant can call to read their own attempt's selected questions' actual text/options** --
 * `ExamAttemptDto.selectedQuestionIds` names which questions were picked, but nothing resolves an
 * id to renderable content. `ExamAttemptApi.getAttemptQuestions` below calls the best-effort,
 * plausible route this app assumes such an endpoint would live at
 * (`GET /admission/exams/attempts/{id}/questions`, mirroring the rest of this module's
 * `attempts/{id}/...` shape) -- **unverified, most likely does not exist yet**, flagged prominently
 * in this app's PR as a **blocking** dependency (mirrors AWEB-10's registration/login blocker):
 * AWEB-22's exam screen cannot render real question content until `Admission` ships this. The
 * component itself is built and tested against this assumed shape so the moment the real
 * endpoint lands, wiring it in is a one-line swap, not a rewrite.
 *
 * `correctOptionIndex` is deliberately never part of this client-side type (unlike
 * `AddQuestionRequest`'s server-side shape) -- an Applicant-facing read must never carry the
 * answer key, regardless of what the real endpoint eventually returns; if it does, this app must
 * strip the field before it ever reaches component state.
 *
 * **Confirmed cross-team gap, non-blocking**: `QuestionBankEntry` carries a single `Text`/`Options`
 * field server-side, no bilingual variant -- requirement-spec.md §2's i18n row ("the UI must render
 * both language variants of a question when the campaign configures it that way") has no backend
 * data source today. `textBn`/`optionsBn` are kept here as optional, forward-compatible fields
 * (per `translation-dictionary.types.ts`'s own documented scope boundary for this exact case) --
 * never populated by the real backend as it stands, and the exam screen renders English-only
 * content until `Admission` ships bilingual question storage.
 */
export interface ExamQuestionDto {
  readonly id: string;
  readonly category: string;
  readonly difficulty: QuestionDifficulty;
  readonly text: string;
  readonly options: readonly string[];
  readonly isSubjective: boolean;
  readonly maxScore: number;
  /** Not populated by the real backend today -- see class doc. */
  readonly textBn?: string;
  /** Not populated by the real backend today -- see class doc. */
  readonly optionsBn?: readonly string[];
}
