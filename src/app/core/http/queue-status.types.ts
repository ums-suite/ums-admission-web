/**
 * A server-issued "you're queued, not failed" signal (AWEB-7, ADR-0007, requirement-spec.md §2
 * "Real-time/result delivery" row, §7 "the waiting room", Domain Invariant #6).
 *
 * **Cross-team API-contract gap, flagged per design-decisions.md "Adaptive, Server-Suggested
 * Waiting-Room Polling Interval":** the exact wire shape of a queue-status response is
 * `Admission`'s API contract to define (§10.3), not yet confirmed. `nextPollMs` in particular is
 * the field that decision resolves on -- "an adaptive, server-suggested polling interval returned
 * on every waiting-room status response" -- but no such field has been confirmed to exist on any
 * real endpoint yet (the endpoints this app knows about today, e.g.
 * `GET /api/v1/admission/results/search`, ADR-0007's write-through Redis path, don't have a
 * generated/documented 429 response shape at all). `fromQueueResponseBody` below is this app's
 * best-effort parse of a *plausible* shape (a `queuePosition`/`estimatedWaitSeconds`/
 * `nextPollMs`-or-`retryAfterMs` body on a `429`) with a documented, honestly-labeled fallback
 * interval when the server doesn't supply one -- update this the moment the real contract lands.
 */
export interface QueueStatus {
  readonly queued: true;
  /** 1-based position in the queue, when the server reports one. */
  readonly queuePosition?: number;
  readonly estimatedWaitSeconds?: number;
  /**
   * How soon the client should poll again. Server-suggested when present; otherwise a
   * conservative fixed fallback (see {@link FALLBACK_POLL_INTERVAL_MS}) -- never a tight/fixed
   * client-side loop, which design-decisions.md rejects outright as "the literal cache-stampede
   * behavior ADR-0007's write-through design exists to prevent."
   */
  readonly nextPollMs: number;
  /** True only when `nextPollMs` came from the server response itself, for telemetry/debugging. */
  readonly intervalIsServerSuggested: boolean;
}

/** Used only when the server's response doesn't carry its own suggested interval (see gap note above). */
export const FALLBACK_POLL_INTERVAL_MS = 5000;

/**
 * Parses a `429` response body into a {@link QueueStatus}, tolerating several plausible field
 * names (`nextPollMs`, `retryAfterMs`, `retryAfter` in seconds) since the real contract isn't
 * confirmed yet. Returns `null` for a `429` that doesn't look like a queue-status body at all
 * (a generic rate-limit block with no queue semantics), so callers can fall back to ordinary
 * error handling rather than misrepresenting an unrelated 429 as "you're in a waiting room."
 */
export function parseQueueStatus(body: unknown): QueueStatus | null {
  if (typeof body !== 'object' || body === null) {
    return null;
  }

  const record = body as Record<string, unknown>;
  const looksQueued =
    record['queued'] === true ||
    typeof record['queuePosition'] === 'number' ||
    typeof record['estimatedWaitSeconds'] === 'number';

  if (!looksQueued) {
    return null;
  }

  const serverIntervalMs = firstFiniteNumber(
    record['nextPollMs'],
    typeof record['retryAfterMs'] === 'number' ? record['retryAfterMs'] : undefined,
    typeof record['retryAfter'] === 'number' ? record['retryAfter'] * 1000 : undefined,
  );

  return {
    queued: true,
    queuePosition:
      typeof record['queuePosition'] === 'number' ? record['queuePosition'] : undefined,
    estimatedWaitSeconds:
      typeof record['estimatedWaitSeconds'] === 'number'
        ? record['estimatedWaitSeconds']
        : undefined,
    nextPollMs: serverIntervalMs ?? FALLBACK_POLL_INTERVAL_MS,
    intervalIsServerSuggested: serverIntervalMs !== undefined,
  };
}

function firstFiniteNumber(...values: unknown[]): number | undefined {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
  }
  return undefined;
}
