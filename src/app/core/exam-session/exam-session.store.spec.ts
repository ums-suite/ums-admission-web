import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Subject, throwError } from 'rxjs';
import { APP_CONFIG } from '../config/app-config';
import { ExamAttemptApi } from './exam-attempt.api';
import { ExamSessionStore } from './exam-session.store';
import type { ExamAttemptDto } from './exam-attempt.types';

const RETRY_MAX_DELAY_MS = 15000;

function makeAttempt(overrides: Partial<ExamAttemptDto> = {}): ExamAttemptDto {
  return {
    id: 'attempt-1',
    applicantId: 'applicant-1',
    admissionTestId: 'test-1',
    rollNumber: '12345',
    status: 'InProgress',
    startedAt: '2026-01-01T09:00:00.000Z',
    expiresAt: '2026-01-01T11:00:00.000Z', // 2 hours after start
    selectedQuestionIds: ['q1', 'q2'],
    answers: [],
    evaluationStatus: 'Pending',
    ...overrides,
  };
}

/**
 * This app is zoneless (no zone.js dependency at all -- see `src/main.ts`), so Angular's
 * `fakeAsync`/`tick()` (which require zone.js) cannot be used here. `jasmine.clock()` is used
 * throughout instead: it patches the real global `setTimeout`/`setInterval`/`Date` directly
 * (not through a zone), which RxJS's `timer()` and this store's own `setInterval`-based ticking
 * both go through unpatched by anything else, so it controls both correctly.
 */
describe('ExamSessionStore', () => {
  let store: ExamSessionStore;
  let saveAnswerSpy: jasmine.Spy;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ExamSessionStore,
        ExamAttemptApi,
        { provide: APP_CONFIG, useValue: { apiBaseUrl: 'http://localhost:8080' } },
      ],
    });
    store = TestBed.inject(ExamSessionStore);
    const api = TestBed.inject(ExamAttemptApi);
    saveAnswerSpy = spyOn(api, 'saveAnswer');
    jasmine.clock().install();
  });

  afterEach(() => {
    jasmine.clock().uninstall();
  });

  describe('server-authoritative clock (Domain Invariant #2)', () => {
    it('computes remainingMs from expiresAt when the client clock exactly matches the server', () => {
      const now = Date.parse('2026-01-01T10:00:00.000Z'); // 1 hour before expiry
      jasmine.clock().mockDate(new Date(now));

      store.initialize(makeAttempt(), now); // serverNowMs === client Date.now()

      expect(store.remainingMs()).toBe(60 * 60 * 1000);
    });

    it('corrects for a client clock that is running fast relative to the server', () => {
      const clientNow = Date.parse('2026-01-01T10:05:00.000Z'); // client thinks it's 10:05
      const serverNow = Date.parse('2026-01-01T10:00:00.000Z'); // server: 10:00 (client is 5 min fast)
      jasmine.clock().mockDate(new Date(clientNow));

      store.initialize(makeAttempt(), serverNow);

      // True remaining time is measured from the server's clock (1h), not the client's naive
      // "expiresAt - clientNow" (which would read 55 minutes) -- a fast client must never see
      // less time than the server actually allows.
      expect(store.remainingMs()).toBe(60 * 60 * 1000);
    });

    it('corrects for a client clock that is running slow relative to the server', () => {
      const clientNow = Date.parse('2026-01-01T09:55:00.000Z'); // client thinks it's 9:55
      const serverNow = Date.parse('2026-01-01T10:00:00.000Z'); // server: 10:00 (client is 5 min slow)
      jasmine.clock().mockDate(new Date(clientNow));

      store.initialize(makeAttempt(), serverNow);

      // A slow client must never be granted extra time beyond what the server actually allows.
      expect(store.remainingMs()).toBe(60 * 60 * 1000);
    });

    it('floors remainingMs at 0 and reports isExpired once the server-authoritative clock elapses', () => {
      const now = Date.parse('2026-01-01T12:30:00.000Z'); // 1.5h past the 11:00 expiry
      jasmine.clock().mockDate(new Date(now));

      store.initialize(makeAttempt(), now);

      expect(store.remainingMs()).toBe(0);
      expect(store.isExpired()).toBeTrue();
    });

    it('ticks remainingMs down as real time elapses', () => {
      const now = Date.parse('2026-01-01T10:00:00.000Z');
      jasmine.clock().mockDate(new Date(now));

      store.initialize(makeAttempt(), now);
      expect(store.remainingMs()).toBe(60 * 60 * 1000);

      jasmine.clock().tick(3000);

      expect(store.remainingMs()).toBe(60 * 60 * 1000 - 3000);
    });

    it('returns null before initialize() has ever been called', () => {
      expect(store.remainingMs()).toBeNull();
      expect(store.isExpired()).toBeFalse();
    });
  });

  describe('answer selection (Domain Invariant #1 -- never lost)', () => {
    it('updates the answers signal synchronously, before the save call even resolves', () => {
      saveAnswerSpy.and.returnValue(new Subject()); // never resolves
      store.initialize(makeAttempt(), Date.now());

      store.selectAnswer('q1', { selectedOptionIndex: 2 });

      expect(store.answers()['q1']).toEqual({ selectedOptionIndex: 2 });
    });

    it('keeps the answer even after the save call fails outright', () => {
      saveAnswerSpy.and.returnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
      store.initialize(makeAttempt(), Date.now());

      store.selectAnswer('q1', { selectedOptionIndex: 1 });
      jasmine.clock().tick(RETRY_MAX_DELAY_MS * 2);

      expect(store.answers()['q1']).toEqual({ selectedOptionIndex: 1 });
    });

    it('a later answer to the same question overwrites the earlier one in-memory immediately', () => {
      saveAnswerSpy.and.returnValue(new Subject());
      store.initialize(makeAttempt(), Date.now());

      store.selectAnswer('q1', { selectedOptionIndex: 0 });
      store.selectAnswer('q1', { selectedOptionIndex: 3 });

      expect(store.answers()['q1']).toEqual({ selectedOptionIndex: 3 });
    });

    it('tracks independent questions independently', () => {
      saveAnswerSpy.and.returnValue(new Subject());
      store.initialize(makeAttempt(), Date.now());

      store.selectAnswer('q1', { selectedOptionIndex: 0 });
      store.selectAnswer('q2', { subjectiveText: 'my essay answer' });

      expect(store.answers()).toEqual({
        q1: { selectedOptionIndex: 0 },
        q2: { subjectiveText: 'my essay answer' },
      });
    });
  });

  describe('save-retry logic (auth-failure-agnostic, never fatal)', () => {
    it('reports saving while the first attempt is in flight, then saved on success', () => {
      const save$ = new Subject<void>();
      saveAnswerSpy.and.returnValue(save$);
      store.initialize(makeAttempt(), Date.now());

      store.selectAnswer('q1', { selectedOptionIndex: 1 });
      expect(store.saveState()).toBe('saving');

      save$.next();
      save$.complete();
      expect(store.saveState()).toBe('saved');
    });

    it('treats a network failure and a 401 identically -- both trigger the same retry path', () => {
      let call = 0;
      saveAnswerSpy.and.callFake(() => {
        call += 1;
        if (call === 1) {
          return throwError(() => new HttpErrorResponse({ status: 0 })); // network failure
        }
        if (call === 2) {
          return throwError(() => new HttpErrorResponse({ status: 401 })); // auth failure
        }
        return new Subject<void>().asObservable(); // third call: left pending
      });
      store.initialize(makeAttempt(), Date.now());

      store.selectAnswer('q1', { selectedOptionIndex: 1 });
      // The first failure is synchronous (throwError errors on subscribe), so by the time
      // selectAnswer() returns, the retry pipeline has already scheduled its first backoff.
      expect(store.saveState()).toBe('retrying');
      expect(call).toBe(1);

      jasmine.clock().tick(1000); // first backoff delay
      expect(call).toBe(2);
      expect(store.saveState()).toBe('retrying');

      jasmine.clock().tick(2000); // second backoff delay (exponential: 1000 * 2^1)
      expect(call).toBe(3);
    });

    it('keeps retrying indefinitely on repeated failures -- no fatal/terminal state', () => {
      saveAnswerSpy.and.returnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
      store.initialize(makeAttempt(), Date.now());

      store.selectAnswer('q1', { selectedOptionIndex: 1 });

      for (let i = 0; i < 6; i++) {
        jasmine.clock().tick(RETRY_MAX_DELAY_MS);
      }

      // Still holding the answer, still reporting a non-fatal state -- never anything else.
      expect(store.answers()['q1']).toEqual({ selectedOptionIndex: 1 });
      expect(['saving', 'retrying']).toContain(store.saveState());
    });

    it('caps the backoff delay rather than growing it unboundedly', () => {
      let failuresBeforeSuccess = 8;
      saveAnswerSpy.and.callFake(() => {
        if (failuresBeforeSuccess > 0) {
          failuresBeforeSuccess -= 1;
          return throwError(() => new HttpErrorResponse({ status: 0 }));
        }
        return new Subject<void>().asObservable();
      });
      store.initialize(makeAttempt(), Date.now());
      store.selectAnswer('q1', { selectedOptionIndex: 1 });

      // Even after many failures, ticking forward by the documented max delay always lets the
      // pipeline make at least one more attempt -- it never needs a longer wait than the cap.
      for (let i = 0; i < 8; i++) {
        jasmine.clock().tick(RETRY_MAX_DELAY_MS);
      }

      expect(failuresBeforeSuccess).toBe(0);
    });

    it('a newer answer to the same question supersedes an in-flight save for it', () => {
      const firstSave$ = new Subject<void>();
      const secondSave$ = new Subject<void>();
      saveAnswerSpy.and.returnValues(firstSave$, secondSave$);
      store.initialize(makeAttempt(), Date.now());

      store.selectAnswer('q1', { selectedOptionIndex: 0 });
      store.selectAnswer('q1', { selectedOptionIndex: 1 }); // supersedes the first in-flight save

      // The stale first save resolving late must not resurrect stale answer data.
      firstSave$.next();
      firstSave$.complete();

      expect(store.answers()['q1']).toEqual({ selectedOptionIndex: 1 });

      secondSave$.next();
      secondSave$.complete();
      expect(store.saveState()).toBe('saved');
    });

    it('reports idle before initialize(), and saved immediately after with no pending saves', () => {
      expect(store.saveState()).toBe('idle');
      store.initialize(makeAttempt(), Date.now());
      expect(store.saveState()).toBe('saved');
    });
  });
});
