import { Injectable } from '@angular/core';
import type { HttpResponse } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ProvisionalModuleApiBase } from '../http/provisional-module-api.base';
import type {
  AnswerInput,
  ExamAttemptDto,
  ExamQuestionDto,
  ServerTimedResponse,
} from './exam-attempt.types';

/**
 * Interim client for `Admission`'s exam-attempt endpoints (AWEB-9) -- see this app's README
 * "Known @ums/shared contract gap". Routes verified directly against `ums-core`'s own
 * `UMS.Modules.Admission.Api.Endpoints.ExamAttemptEndpoints` (`AdmissionModule.cs`'s group
 * prefix is `/api/v1/admission`):
 * - `POST /api/v1/admission/exams/{testId}/attempts/start`
 * - `GET /api/v1/admission/exams/attempts/{id}`
 * - `PUT /api/v1/admission/exams/attempts/{id}/answers` -- **per-question**, not a full-map
 *   replace (`SaveAnswerRequest(QuestionId, SelectedOptionIndex, SubjectiveText)`); `ExamAnswer`'s
 *   own doc comment: "batched/debounced at the caller... never one DB round-trip per keystroke" --
 *   `ExamSessionStore` is where that batching/debouncing actually happens.
 * - `POST /api/v1/admission/exams/attempts/{id}/submit`
 *
 * Every read/write here also captures the response's `Date` header as `serverNowMs` --
 * `ExamAttemptDto` carries no explicit "current server time" field (only `expiresAt`, a fixed
 * target), so the standard HTTP response `Date` header is this app's chosen mechanism for
 * `ExamSessionStore` to compute client/server clock drift (Domain Invariant #2: the server clock,
 * never the client's, is authoritative for when time expires).
 */
@Injectable({ providedIn: 'root' })
export class ExamAttemptApi extends ProvisionalModuleApiBase {
  startAttempt(testId: string): Observable<ServerTimedResponse<ExamAttemptDto>> {
    return this.normalizeErrors(
      this.http
        .post<ExamAttemptDto>(
          this.apiUrl(`admission/exams/${testId}/attempts/start`),
          {},
          { observe: 'response' },
        )
        .pipe(map(toServerTimedResponse)),
    );
  }

  getAttempt(attemptId: string): Observable<ServerTimedResponse<ExamAttemptDto>> {
    return this.normalizeErrors(
      this.http
        .get<ExamAttemptDto>(this.apiUrl(`admission/exams/attempts/${attemptId}`), {
          observe: 'response',
        })
        .pipe(map(toServerTimedResponse)),
    );
  }

  saveAnswer(attemptId: string, questionId: string, input: AnswerInput): Observable<void> {
    return this.normalizeErrors(
      this.http
        .put<unknown>(this.apiUrl(`admission/exams/attempts/${attemptId}/answers`), {
          questionId,
          selectedOptionIndex: input.selectedOptionIndex,
          subjectiveText: input.subjectiveText,
        })
        .pipe(map(() => undefined)),
    );
  }

  /**
   * `GET /api/v1/admission/exams/attempts/{id}/questions` -- **unverified, most likely does not
   * exist yet against real `ums-core`**; see `exam-attempt.types.ts`'s `ExamQuestionDto` class doc
   * for the full blocking-gap writeup. Kept as a real, tested method (not a TODO stub) so wiring in
   * the actual endpoint the moment `Admission` ships one is a one-line path change.
   */
  getAttemptQuestions(attemptId: string): Observable<readonly ExamQuestionDto[]> {
    return this.normalizeErrors(
      this.http.get<readonly ExamQuestionDto[]>(
        this.apiUrl(`admission/exams/attempts/${attemptId}/questions`),
      ),
    );
  }

  submitAttempt(attemptId: string): Observable<ServerTimedResponse<ExamAttemptDto>> {
    return this.normalizeErrors(
      this.http
        .post<ExamAttemptDto>(
          this.apiUrl(`admission/exams/attempts/${attemptId}/submit`),
          {},
          { observe: 'response' },
        )
        .pipe(map(toServerTimedResponse)),
    );
  }
}

function toServerTimedResponse<T>(response: HttpResponse<T>): ServerTimedResponse<T> {
  const dateHeader = response.headers.get('Date');
  const parsed = dateHeader ? Date.parse(dateHeader) : NaN;
  return {
    body: response.body as T,
    // Falls back to the client's own clock if the header is missing/unparseable (e.g. a
    // same-origin dev proxy that strips it) -- degrading to "trust the client clock" only in
    // that narrow case, never silently producing a NaN that would corrupt every later
    // remainingMs computation.
    serverNowMs: Number.isFinite(parsed) ? parsed : Date.now(),
  };
}
