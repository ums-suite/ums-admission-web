import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { APP_CONFIG } from '../config/app-config';
import { ExamAttemptApi } from './exam-attempt.api';
import type { ExamAttemptDto, ExamQuestionDto } from './exam-attempt.types';

function makeAttemptDto(): ExamAttemptDto {
  return {
    id: 'attempt-1',
    applicantId: 'applicant-1',
    admissionTestId: 'test-1',
    rollNumber: '12345',
    status: 'InProgress',
    startedAt: '2026-01-01T09:00:00.000Z',
    expiresAt: '2026-01-01T11:00:00.000Z',
    selectedQuestionIds: ['q1'],
    answers: [],
    evaluationStatus: 'Pending',
  };
}

/**
 * AWEB-9/21: direct HTTP-layer coverage for `ExamAttemptApi` -- previously only exercised
 * indirectly through `ExamSessionStore`'s own spy-based tests, which never actually verified the
 * real request URLs/methods or the `Date`-header clock-derivation logic in `toServerTimedResponse`.
 */
describe('ExamAttemptApi', () => {
  let api: ExamAttemptApi;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ExamAttemptApi,
        { provide: APP_CONFIG, useValue: { apiBaseUrl: 'http://localhost:8080' } },
      ],
    });
    api = TestBed.inject(ExamAttemptApi);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('startAttempt POSTs to the start route and derives serverNowMs from the Date header', () => {
    let result: { body: ExamAttemptDto; serverNowMs: number } | undefined;
    api.startAttempt('test-1').subscribe((r) => (result = r));

    const req = httpMock.expectOne(
      'http://localhost:8080/api/v1/admission/exams/test-1/attempts/start',
    );
    expect(req.request.method).toBe('POST');
    req.flush(makeAttemptDto(), { headers: { Date: 'Thu, 01 Jan 2026 10:00:00 GMT' } });

    expect(result?.body.id).toBe('attempt-1');
    expect(result?.serverNowMs).toBe(Date.parse('Thu, 01 Jan 2026 10:00:00 GMT'));
  });

  it('falls back to the client clock when the Date header is missing/unparseable', () => {
    let result: { body: ExamAttemptDto; serverNowMs: number } | undefined;
    const before = Date.now();
    api.getAttempt('attempt-1').subscribe((r) => (result = r));

    const req = httpMock.expectOne(
      'http://localhost:8080/api/v1/admission/exams/attempts/attempt-1',
    );
    expect(req.request.method).toBe('GET');
    req.flush(makeAttemptDto());
    const after = Date.now();

    expect(result?.serverNowMs).toBeGreaterThanOrEqual(before);
    expect(result?.serverNowMs).toBeLessThanOrEqual(after);
  });

  it('saveAnswer PUTs the question payload and resolves void', () => {
    let completed = false;
    api
      .saveAnswer('attempt-1', 'q1', { selectedOptionIndex: 2 })
      .subscribe(() => (completed = true));

    const req = httpMock.expectOne(
      'http://localhost:8080/api/v1/admission/exams/attempts/attempt-1/answers',
    );
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({
      questionId: 'q1',
      selectedOptionIndex: 2,
      subjectiveText: undefined,
    });
    req.flush({});

    expect(completed).toBeTrue();
  });

  it('submitAttempt POSTs to the submit route and derives serverNowMs from the Date header', () => {
    let result: { body: ExamAttemptDto; serverNowMs: number } | undefined;
    api.submitAttempt('attempt-1').subscribe((r) => (result = r));

    const req = httpMock.expectOne(
      'http://localhost:8080/api/v1/admission/exams/attempts/attempt-1/submit',
    );
    expect(req.request.method).toBe('POST');
    req.flush(
      { ...makeAttemptDto(), status: 'Submitted' },
      { headers: { Date: 'Thu, 01 Jan 2026 11:00:00 GMT' } },
    );

    expect(result?.body.status).toBe('Submitted');
    expect(result?.serverNowMs).toBe(Date.parse('Thu, 01 Jan 2026 11:00:00 GMT'));
  });

  it('getAttemptQuestions GETs the assumed questions route', () => {
    let result: readonly ExamQuestionDto[] | undefined;
    const questions: readonly ExamQuestionDto[] = [
      {
        id: 'q1',
        category: 'Math',
        difficulty: 'Easy',
        text: 'What is 2+2?',
        options: ['3', '4', '5'],
        isSubjective: false,
        maxScore: 1,
      },
    ];
    api.getAttemptQuestions('attempt-1').subscribe((r) => (result = r));

    const req = httpMock.expectOne(
      'http://localhost:8080/api/v1/admission/exams/attempts/attempt-1/questions',
    );
    expect(req.request.method).toBe('GET');
    req.flush(questions);

    expect(result).toEqual(questions);
  });

  it('normalizes an HTTP failure through toUmsApiError', () => {
    let error: { status: number } | undefined;
    api.getAttempt('missing').subscribe({ error: (e) => (error = e) });

    httpMock
      .expectOne('http://localhost:8080/api/v1/admission/exams/attempts/missing')
      .flush({ title: 'Not found' }, { status: 404, statusText: 'Not Found' });

    expect(error?.status).toBe(404);
  });
});
