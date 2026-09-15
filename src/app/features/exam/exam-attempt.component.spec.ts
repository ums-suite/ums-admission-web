import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { APP_CONFIG } from '../../core/config/app-config';
import { ExamAttemptComponent, buildOrderedQuestions } from './exam-attempt.component';
import type { ExamQuestionDto } from '../../core/exam-session/exam-attempt.types';

const baseUrl = 'http://localhost:8080';

function makeAttempt(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'attempt-1',
    applicantId: 'applicant-1',
    admissionTestId: 'test-1',
    rollNumber: '12345',
    status: 'InProgress',
    startedAt: '2026-01-01T09:00:00.000Z',
    expiresAt: '2026-01-01T11:00:00.000Z',
    selectedQuestionIds: ['q1', 'q2'],
    answers: [],
    evaluationStatus: 'Pending',
    ...overrides,
  };
}

const question1: ExamQuestionDto = {
  id: 'q1',
  category: 'math',
  difficulty: 'Easy',
  text: 'What is 2 + 2?',
  options: ['3', '4'],
  isSubjective: false,
  maxScore: 1,
};

describe('buildOrderedQuestions (pure)', () => {
  it('orders questions by selectedQuestionIds and marks missing content as unavailable', () => {
    const { questions, unavailableIds } = buildOrderedQuestions(['q1', 'q2'], [question1]);

    expect(questions.map((q) => q.id)).toEqual(['q1', 'q2']);
    expect(unavailableIds.has('q2')).toBeTrue();
    expect(unavailableIds.has('q1')).toBeFalse();
  });

  it('marks every question unavailable when nothing was fetched at all', () => {
    const { unavailableIds } = buildOrderedQuestions(['q1', 'q2'], []);
    expect(unavailableIds.size).toBe(2);
  });
});

describe('ExamAttemptComponent', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<ExamAttemptComponent>>;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date('2026-01-01T09:05:00.000Z'));
  });

  afterEach(() => {
    jasmine.clock().uninstall();
  });

  describe('with a valid attempt id', () => {
    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [ExamAttemptComponent],
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          provideRouter([]),
          { provide: APP_CONFIG, useValue: { apiBaseUrl: baseUrl } },
          {
            provide: ActivatedRoute,
            useValue: { snapshot: { paramMap: convertToParamMap({ id: 'attempt-1' }) } },
          },
        ],
      }).compileComponents();

      httpMock = TestBed.inject(HttpTestingController);
      fixture = TestBed.createComponent(ExamAttemptComponent);
    });

    afterEach(() => httpMock.verify());

    function flushAttemptAndQuestions(questions: readonly ExamQuestionDto[] = [question1]): void {
      fixture.detectChanges();
      httpMock
        .expectOne(`${baseUrl}/api/v1/admission/exams/attempts/attempt-1`)
        .flush(makeAttempt());
      httpMock
        .expectOne(`${baseUrl}/api/v1/admission/exams/attempts/attempt-1/questions`)
        .flush(questions);
    }

    it('starts in the loading state', () => {
      fixture.detectChanges();
      expect(fixture.componentInstance['state']()).toBe('loading');
      httpMock
        .expectOne(`${baseUrl}/api/v1/admission/exams/attempts/attempt-1`)
        .flush(makeAttempt());
      httpMock
        .expectOne(`${baseUrl}/api/v1/admission/exams/attempts/attempt-1/questions`)
        .flush([question1]);
    });

    it('becomes ready and orders questions with placeholders for missing content', () => {
      flushAttemptAndQuestions([question1]);

      const component = fixture.componentInstance;
      expect(component['state']()).toBe('ready');
      expect(component['questions']().map((q) => q.id)).toEqual(['q1', 'q2']);
      expect(component['isContentAvailable']('q1')).toBeTrue();
      expect(component['isContentAvailable']('q2')).toBeFalse();
    });

    it('flags a page-level banner but stays ready when the questions endpoint fails entirely', () => {
      fixture.detectChanges();
      httpMock
        .expectOne(`${baseUrl}/api/v1/admission/exams/attempts/attempt-1`)
        .flush(makeAttempt());
      httpMock
        .expectOne(`${baseUrl}/api/v1/admission/exams/attempts/attempt-1/questions`)
        .error(new ProgressEvent('error'));

      const component = fixture.componentInstance;
      expect(component['questionsLoadFailed']()).toBeTrue();
      expect(component['state']()).toBe('ready');
    });

    it('goes to the error state when the attempt fetch fails', () => {
      fixture.detectChanges();
      httpMock
        .expectOne(`${baseUrl}/api/v1/admission/exams/attempts/attempt-1`)
        .error(new ProgressEvent('error'));

      expect(fixture.componentInstance['state']()).toBe('error');
    });

    it('selecting an option updates the store and is reflected back', () => {
      flushAttemptAndQuestions([question1]);
      const component = fixture.componentInstance;

      component['selectOption']('q1', 1);
      httpMock.expectOne(`${baseUrl}/api/v1/admission/exams/attempts/attempt-1/answers`).flush({});

      expect(component['selectedOptionIndex']('q1')).toBe(1);
      expect(component['isAnswered']('q1')).toBeTrue();
    });

    it('navigates between questions, clamped to bounds', () => {
      flushAttemptAndQuestions([question1]);
      const component = fixture.componentInstance;

      expect(component['currentIndex']()).toBe(0);
      component['goToPrevious'](); // already at 0, no-op
      expect(component['currentIndex']()).toBe(0);

      component['goToNext']();
      expect(component['currentIndex']()).toBe(1);

      component['goToNext'](); // already at last, no-op
      expect(component['currentIndex']()).toBe(1);
    });

    it('toggles flag-for-review on the current question', () => {
      flushAttemptAndQuestions([question1]);
      const component = fixture.componentInstance;

      expect(component['isFlagged']('q1')).toBeFalse();
      component['toggleFlag']();
      expect(component['isFlagged']('q1')).toBeTrue();
      component['toggleFlag']();
      expect(component['isFlagged']('q1')).toBeFalse();
    });

    it('debounces subjective-answer saves and flushes immediately on blur', () => {
      const subjectiveQuestion: ExamQuestionDto = {
        ...question1,
        id: 'q1',
        isSubjective: true,
        options: [],
      };
      flushAttemptAndQuestions([subjectiveQuestion]);
      const component = fixture.componentInstance;

      component['onSubjectiveInput']('q1', 'partial answer');
      httpMock.expectNone(`${baseUrl}/api/v1/admission/exams/attempts/attempt-1/answers`);

      component['onSubjectiveBlur']('q1', 'final answer');
      httpMock.expectOne(`${baseUrl}/api/v1/admission/exams/attempts/attempt-1/answers`).flush({});

      expect(component['subjectiveText']('q1')).toBe('final answer');
    });

    it('requires the acknowledgment checkbox before manual submission is confirmed', () => {
      flushAttemptAndQuestions([question1]);
      const component = fixture.componentInstance;

      component['openConfirmSubmit']();
      expect(component['confirmSubmitOpen']()).toBeTrue();
      expect(component['confirmAcknowledged']()).toBeFalse();

      component['confirmManualSubmit'](); // not acknowledged yet -- must be a no-op
      expect(component['store'].submitPhase()).toBe('idle');

      component['confirmAcknowledged'].set(true);
      component['confirmManualSubmit']();

      httpMock
        .expectOne(`${baseUrl}/api/v1/admission/exams/attempts/attempt-1/submit`)
        .flush(makeAttempt({ status: 'Submitted' }));

      expect(component['store'].submitPhase()).toBe('submitted');
      expect(component['confirmSubmitOpen']()).toBeFalse();
    });
  });

  describe('with no attempt id in the route', () => {
    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [ExamAttemptComponent],
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          provideRouter([]),
          { provide: APP_CONFIG, useValue: { apiBaseUrl: baseUrl } },
          { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({}) } } },
        ],
      }).compileComponents();
      fixture = TestBed.createComponent(ExamAttemptComponent);
    });

    it('goes straight to the error state', () => {
      fixture.detectChanges();
      expect(fixture.componentInstance['state']()).toBe('error');
    });
  });
});
