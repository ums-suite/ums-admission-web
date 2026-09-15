import { HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { QueueStateService } from './queue-state.service';
import { QueueingRequiredError } from './queueing-required.error';
import { parseQueueStatus } from './queue-status.types';

/**
 * Queueing-aware HTTP client (AWEB-7, requirement-spec.md §2 "Real-time/result delivery" row,
 * §10.3). Detects a `429` carrying a queue-status body and cooperates with ADR-0007's
 * waiting-room pattern instead of surfacing it as a generic request failure:
 *
 * - reports the parsed {@link QueueStatus} into the shared {@link QueueStateService} (AWEB-27's
 *   waiting room reads this reactively);
 * - re-throws a {@link QueueingRequiredError} in place of the raw `HttpErrorResponse`, so a
 *   feature's own error handling can distinguish "you're queued" from "something broke" without
 *   re-parsing response bodies itself.
 *
 * A `429` whose body doesn't look like a queue-status (see `parseQueueStatus`) is left completely
 * untouched -- an unrelated rate-limit block must still surface as an ordinary error, never be
 * misrepresented as a waiting room.
 *
 * Register after {@link authInterceptor} in `provideHttpClient(withInterceptors([...]))` -- a
 * queue signal is not an auth concern and should never race token refresh.
 */
export const queueingInterceptor: HttpInterceptorFn = (req, next) => {
  const queueState = inject(QueueStateService);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 429) {
        return throwError(() => error);
      }

      const queueStatus = parseQueueStatus(error.error);
      if (!queueStatus) {
        return throwError(() => error);
      }

      queueState.report(queueStatus);
      return throwError(() => new QueueingRequiredError(queueStatus));
    }),
  );
};
