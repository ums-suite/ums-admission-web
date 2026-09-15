import type { QueueStatus } from './queue-status.types';

/**
 * Thrown by {@link queueingInterceptor} in place of the raw `HttpErrorResponse` whenever a `429`
 * carries a recognizable queue-status body (AWEB-7). Deliberately a distinct type -- never a
 * generic `HttpErrorResponse` -- so a feature's error handling (or the global error/toast layer)
 * can `if (error instanceof QueueingRequiredError)` and route to the waiting room instead of
 * rendering it as a failure, matching Domain Invariant #6 ("waiting-room state is always
 * distinguishable from a broken app") one layer up from {@link QueueStateService} itself.
 */
export class QueueingRequiredError extends Error {
  constructor(readonly status: QueueStatus) {
    super('UMS_QUEUEING_REQUIRED: the server has queued this request; see .status for details.');
    this.name = 'QueueingRequiredError';
  }
}
