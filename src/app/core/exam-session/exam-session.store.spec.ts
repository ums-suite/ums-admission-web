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
  let submitAttemptSpy: jasmine.Spy;

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
    submitAttemptSpy = spyOn(api, 'submitAttempt');
    jasmine.clock().install();
    // A safe baseline "now" well inside makeAttempt()'s default 09:00-11:00 window, so any test
    // that doesn't set its own explicit mockDate (most save-retry/flag/connectivity tests, which
    // care about retry/flag/online behavior, not timer expiry) never accidentally races
    // AWEB-23's tick-driven auto-submit-on-timeout check against the real wall-clock date the
    // suite happens to run on. Tests that DO care about a specific instant call their own
    // `jasmine.clock().mockDate(...)`, which simply overrides this baseline.
    jasmine.clock().mockDate(new Date('2026-01-01T09:05:00.000Z'));
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

  describe('flag-for-review (AWEB-22)', () => {
    it('toggles a question id in and out of flaggedQuestionIds', () => {
      store.initialize(makeAttempt(), Date.now());
      expect(store.flaggedQuestionIds().has('q1')).toBeFalse();

      store.toggleFlag('q1');
      expect(store.flaggedQuestionIds().has('q1')).toBeTrue();

      store.toggleFlag('q1');
      expect(store.flaggedQuestionIds().has('q1')).toBeFalse();
    });

    it('tracks multiple flagged questions independently', () => {
      store.initialize(makeAttempt(), Date.now());
      store.toggleFlag('q1');
      store.toggleFlag('q2');
      expect(store.flaggedQuestionIds()).toEqual(new Set(['q1', 'q2']));
    });
  });

  describe('manual submit (AWEB-24)', () => {
    it('submits immediately when there is no in-flight save', () => {
      const now = Date.now();
      submitAttemptSpy.and.returnValue(
        new Subject(), // never resolves -- just observing the request + phase transition
      );
      store.initialize(makeAttempt(), now);

      store.submit('manual');

      expect(submitAttemptSpy).toHaveBeenCalledWith('attempt-1');
      expect(store.submitPhase()).toBe('submitting');
    });

    it('transitions to submitted and stops accepting further answers on success', () => {
      const submitted = makeAttempt({ status: 'Submitted' });
      const submit$ = new Subject<{ body: ExamAttemptDto; serverNowMs: number }>();
      submitAttemptSpy.and.returnValue(submit$);
      store.initialize(makeAttempt(), Date.now());

      store.submit('manual');
      submit$.next({ body: submitted, serverNowMs: Date.now() });
      submit$.complete();

      expect(store.submitPhase()).toBe('submitted');
      expect(store.submittedAttempt()).toEqual(submitted);

      // Domain Invariant #4's exam-side sibling: no further input accepted once locked.
      saveAnswerSpy.and.returnValue(new Subject());
      store.selectAnswer('q1', { selectedOptionIndex: 0 });
      expect(store.answers()['q1']).toBeUndefined();
    });

    it('is idempotent -- a second submit call while already submitting is a no-op', () => {
      submitAttemptSpy.and.returnValue(new Subject());
      store.initialize(makeAttempt(), Date.now());

      store.submit('manual');
      store.submit('manual');

      expect(submitAttemptSpy).toHaveBeenCalledTimes(1);
    });

    it('waits for an in-flight save (bounded grace window) before submitting', () => {
      const save$ = new Subject<void>();
      saveAnswerSpy.and.returnValue(save$);
      submitAttemptSpy.and.returnValue(new Subject());
      store.initialize(makeAttempt(), Date.now());

      store.selectAnswer('q1', { selectedOptionIndex: 0 });
      store.submit('manual');

      // The save is still in flight -- submit must not have fired yet.
      expect(store.submitPhase()).toBe('waiting-for-saves');
      expect(submitAttemptSpy).not.toHaveBeenCalled();

      save$.next();
      save$.complete();
      jasmine.clock().tick(250); // the grace-window poll interval

      expect(submitAttemptSpy).toHaveBeenCalledWith('attempt-1');
    });

    it('proceeds once the grace window elapses even if the save never resolves', () => {
      saveAnswerSpy.and.returnValue(new Subject()); // never resolves
      submitAttemptSpy.and.returnValue(new Subject());
      store.initialize(makeAttempt(), Date.now());

      store.selectAnswer('q1', { selectedOptionIndex: 0 });
      store.submit('manual');
      expect(submitAttemptSpy).not.toHaveBeenCalled();

      jasmine.clock().tick(4200); // past the grace window

      expect(submitAttemptSpy).toHaveBeenCalledWith('attempt-1');
    });

    it('retries the submit call indefinitely on failure rather than reporting a fatal error', () => {
      let call = 0;
      submitAttemptSpy.and.callFake(() => {
        call += 1;
        return call === 1 ? throwError(() => new HttpErrorResponse({ status: 0 })) : new Subject();
      });
      store.initialize(makeAttempt(), Date.now());

      store.submit('manual');
      expect(store.submitPhase()).toBe('retrying');

      jasmine.clock().tick(1000);
      expect(call).toBe(2);
    });
  });

  describe('auto-submit-on-timeout (AWEB-23, Domain Invariant #2)', () => {
    it('auto-submits the instant the server-authoritative clock reaches zero', () => {
      const now = Date.parse('2026-01-01T10:59:59.000Z'); // 1s before expiry
      jasmine.clock().mockDate(new Date(now));
      submitAttemptSpy.and.returnValue(new Subject());

      store.initialize(makeAttempt(), now);
      expect(submitAttemptSpy).not.toHaveBeenCalled();

      jasmine.clock().tick(1000); // crosses expiresAt on the next 1s tick

      expect(submitAttemptSpy).toHaveBeenCalledWith('attempt-1');
    });

    it('auto-submits on the very next tick after resuming an already-expired attempt (crash recovery)', () => {
      const now = Date.parse('2026-01-01T12:00:00.000Z'); // 1h past the 11:00 expiry
      jasmine.clock().mockDate(new Date(now));
      submitAttemptSpy.and.returnValue(new Subject());

      store.initialize(makeAttempt(), now);
      expect(submitAttemptSpy).not.toHaveBeenCalled();

      jasmine.clock().tick(1000);

      expect(submitAttemptSpy).toHaveBeenCalledWith('attempt-1');
    });

    it('never fires auto-submit twice even across many ticks past expiry', () => {
      const now = Date.parse('2026-01-01T10:59:59.000Z');
      jasmine.clock().mockDate(new Date(now));
      submitAttemptSpy.and.returnValue(new Subject());

      store.initialize(makeAttempt(), now);
      jasmine.clock().tick(10000);

      expect(submitAttemptSpy).toHaveBeenCalledTimes(1);
    });

    it('does not race a manual submit that already completed before expiry', () => {
      const now = Date.parse('2026-01-01T10:59:59.500Z');
      jasmine.clock().mockDate(new Date(now));
      const submitted = makeAttempt({ status: 'Submitted' });
      const submit$ = new Subject<{ body: ExamAttemptDto; serverNowMs: number }>();
      submitAttemptSpy.and.returnValue(submit$);

      store.initialize(makeAttempt(), now);
      store.submit('manual');
      submit$.next({ body: submitted, serverNowMs: now });
      submit$.complete();

      jasmine.clock().tick(1000); // would otherwise cross expiresAt

      expect(submitAttemptSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('connectivity (AWEB-25)', () => {
    it('reflects navigator.onLine and updates on online/offline events', () => {
      const onLineSpy = spyOnProperty(navigator, 'onLine', 'get');
      onLineSpy.and.returnValue(true);
      store.initialize(makeAttempt(), Date.now());
      expect(store.isOnline()).toBeTrue();

      onLineSpy.and.returnValue(false);
      window.dispatchEvent(new Event('offline'));
      expect(store.isOnline()).toBeFalse();

      onLineSpy.and.returnValue(true);
      window.dispatchEvent(new Event('online'));
      expect(store.isOnline()).toBeTrue();
    });

    it('force-retries a backed-off save immediately when an online event arrives', () => {
      spyOnProperty(navigator, 'onLine', 'get').and.returnValue(true);
      let call = 0;
      saveAnswerSpy.and.callFake(() => {
        call += 1;
        return call === 1 ? throwError(() => new HttpErrorResponse({ status: 0 })) : new Subject();
      });
      store.initialize(makeAttempt(), Date.now());

      store.selectAnswer('q1', { selectedOptionIndex: 0 });
      expect(call).toBe(1); // first attempt, synchronous failure, now backed off

      window.dispatchEvent(new Event('online'));

      expect(call).toBe(2); // force-retried immediately, without waiting out the 1s backoff
    });
  });

  describe('session conflict (AWEB-25, same-device two-tab mitigation)', () => {
    it('starts with no session conflict', () => {
      store.initialize(makeAttempt(), Date.now());
      expect(store.hasSessionConflict()).toBeFalse();
    });

    it('flips to conflict when an earlier-claiming tab is heard from', () => {
      store.initialize(makeAttempt(), Date.now());
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const lockChannel = (store as any).lockChannel as BroadcastChannel;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const myClaimedAtMs = (store as any).lockClaimedAtMs as number;

      lockChannel.onmessage?.({
        data: { tabId: 'earlier-tab', claimedAtMs: myClaimedAtMs - 1000 },
      } as MessageEvent);

      expect(store.hasSessionConflict()).toBeTrue();
    });

    it('does not flip to conflict, and re-announces, when a later-claiming tab is heard from', () => {
      store.initialize(makeAttempt(), Date.now());
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const lockChannel = (store as any).lockChannel as BroadcastChannel;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const myClaimedAtMs = (store as any).lockClaimedAtMs as number;
      const postSpy = spyOn(lockChannel, 'postMessage');

      lockChannel.onmessage?.({
        data: { tabId: 'later-tab', claimedAtMs: myClaimedAtMs + 1000 },
      } as MessageEvent);

      expect(store.hasSessionConflict()).toBeFalse();
      expect(postSpy).toHaveBeenCalled();
    });

    it('breaks a same-instant claim tie deterministically by tabId, and ignores its own echoed message', () => {
      store.initialize(makeAttempt(), Date.now());
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const lockChannel = (store as any).lockChannel as BroadcastChannel;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const myTabId = (store as any).tabId as string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const myClaimedAtMs = (store as any).lockClaimedAtMs as number;

      // Its own message echoed back (same tabId) must be ignored entirely.
      lockChannel.onmessage?.({
        data: { tabId: myTabId, claimedAtMs: myClaimedAtMs },
      } as MessageEvent);
      expect(store.hasSessionConflict()).toBeFalse();

      // A lexicographically-smaller tabId at the exact same instant wins over us.
      lockChannel.onmessage?.({
        data: { tabId: `!${myTabId}`, claimedAtMs: myClaimedAtMs },
      } as MessageEvent);
      expect(store.hasSessionConflict()).toBeTrue();
    });

    it('gracefully no-ops when BroadcastChannel is unsupported', () => {
      const original = (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).BroadcastChannel = undefined;
      try {
        expect(() => store.initialize(makeAttempt(), Date.now())).not.toThrow();
        expect(store.hasSessionConflict()).toBeFalse();
      } finally {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (globalThis as any).BroadcastChannel = original;
      }
    });
  });

  describe('resuming an already-submitted attempt (crash-recovery)', () => {
    it('renders the submitted state immediately and never re-opens for further answers', () => {
      const submitted = makeAttempt({ status: 'Submitted' });
      store.initialize(submitted, Date.now());

      expect(store.submitPhase()).toBe('submitted');
      expect(store.submittedAttempt()).toEqual(submitted);

      saveAnswerSpy.and.returnValue(new Subject());
      store.selectAnswer('q1', { selectedOptionIndex: 0 });
      expect(store.answers()['q1']).toBeUndefined();
    });
  });

  describe('guard clauses', () => {
    it('submit() is a no-op before initialize() has ever set an attemptId', () => {
      store.submit('manual');
      expect(submitAttemptSpy).not.toHaveBeenCalled();
    });

    it('selectAnswer() called before initialize() never reaches the save pipeline', () => {
      store.selectAnswer('q1', { selectedOptionIndex: 0 });
      expect(saveAnswerSpy).not.toHaveBeenCalled();
      expect(store.answers()['q1']).toEqual({ selectedOptionIndex: 0 });
    });
  });
});
