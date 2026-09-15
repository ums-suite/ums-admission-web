import { FALLBACK_POLL_INTERVAL_MS, parseQueueStatus } from './queue-status.types';

describe('parseQueueStatus', () => {
  it('returns null for a non-object body', () => {
    expect(parseQueueStatus(null)).toBeNull();
    expect(parseQueueStatus('rate limited')).toBeNull();
    expect(parseQueueStatus(undefined)).toBeNull();
  });

  it('returns null for a 429 body with no queue-shaped fields (an unrelated rate limit)', () => {
    expect(parseQueueStatus({ message: 'Too many requests' })).toBeNull();
  });

  it('parses a fully-shaped queue-status body, honoring the server-suggested interval', () => {
    const status = parseQueueStatus({
      queued: true,
      queuePosition: 4231,
      estimatedWaitSeconds: 90,
      nextPollMs: 2000,
    });

    expect(status).toEqual({
      queued: true,
      queuePosition: 4231,
      estimatedWaitSeconds: 90,
      nextPollMs: 2000,
      intervalIsServerSuggested: true,
    });
  });

  it('accepts retryAfterMs as an alternative interval field name', () => {
    const status = parseQueueStatus({ queuePosition: 10, retryAfterMs: 3000 });
    expect(status?.nextPollMs).toBe(3000);
    expect(status?.intervalIsServerSuggested).toBeTrue();
  });

  it('accepts retryAfter (seconds) as an alternative interval field name', () => {
    const status = parseQueueStatus({ queuePosition: 10, retryAfter: 7 });
    expect(status?.nextPollMs).toBe(7000);
    expect(status?.intervalIsServerSuggested).toBeTrue();
  });

  it('falls back to the fixed interval, flagged as not server-suggested, when none is present', () => {
    const status = parseQueueStatus({ queued: true });
    expect(status?.nextPollMs).toBe(FALLBACK_POLL_INTERVAL_MS);
    expect(status?.intervalIsServerSuggested).toBeFalse();
  });

  it('recognizes queue shape from estimatedWaitSeconds alone', () => {
    expect(parseQueueStatus({ estimatedWaitSeconds: 30 })).not.toBeNull();
  });
});
