import type { PaymentStatus } from './payment.types';

/**
 * Pure payment-idempotency logic (AWEB-18, requirement-spec.md §3.3, §4 test-coverage NFR: "≥90%
 * on... payment idempotency logic"), deliberately kept free of `HttpClient`/DI/signals so it is
 * trivially, exhaustively unit-testable -- mirrors `registration-form.validation.ts`'s "pure logic
 * lives outside the component" convention.
 *
 * Two invariants this module exists to enforce:
 * - Domain Invariant #3: a `Payment` is never shown as confirmed before the backend's
 *   webhook-verified confirmation -- {@link isConfirmedPaymentStatus} is the single place that
 *   question is answered, so no screen can independently invent its own "looks done enough" check.
 * - design-decisions.md "Pre-Payment Transaction-Status Check": {@link blocksNewPaymentAttempt}
 *   is the single place "is a prior attempt still in flight" is decided.
 */

const TERMINAL_STATUSES: ReadonlySet<PaymentStatus> = new Set([
  'Successful',
  'Failed',
  'Reconciled',
]);

const CONFIRMED_STATUSES: ReadonlySet<PaymentStatus> = new Set(['Successful', 'Reconciled']);

/** A status the gateway/webhook will never revise further -- polling should stop. */
export function isTerminalPaymentStatus(status: PaymentStatus): boolean {
  return TERMINAL_STATUSES.has(status);
}

/**
 * Domain Invariant #3's own boolean: only ever true for a webhook-verified success. `Initiated`
 * and `Pending` are never confirmed (obviously in flight); `Failed` is terminal but explicitly NOT
 * confirmed (it is a completed failure, not a completed success) -- callers must check this, never
 * merely {@link isTerminalPaymentStatus}, before rendering any "paid" state.
 */
export function isConfirmedPaymentStatus(status: PaymentStatus): boolean {
  return CONFIRMED_STATUSES.has(status);
}

/**
 * design-decisions.md "Pre-Payment Transaction-Status Check": before rendering a *new*
 * payment-method picker, a non-terminal prior attempt for the same invoice must block it (the
 * applicant sees the existing "confirming your payment" state instead) -- a terminal `Failed`
 * attempt does NOT block a fresh one (the applicant must be able to retry), and no prior attempt
 * at all obviously doesn't block anything.
 */
export function blocksNewPaymentAttempt(priorStatus: PaymentStatus | null): boolean {
  if (priorStatus === null) {
    return false;
  }
  return !isTerminalPaymentStatus(priorStatus);
}

/**
 * A fresh `IdempotencyKey` per NEW payment attempt (never reused across attempts -- reusing one
 * would defeat its own purpose of letting a network-retry of the *same* attempt collapse to one
 * charge while still allowing a genuinely new attempt after a `Failed` terminal status). Falls back
 * to a timestamp+random string on a runtime with no `crypto.randomUUID` (older mobile WebViews,
 * §4's low-end-device NFR) -- never throws, since a payment screen must never hard-fail merely
 * because it couldn't mint a fancy UUID.
 */
export function generateIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `idempotency-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}
