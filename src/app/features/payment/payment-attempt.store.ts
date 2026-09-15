import { Injectable, computed, inject, signal } from '@angular/core';
import type { UmsApiError } from '@ums/shared';
import { PaymentApi } from './payment.api';
import { blocksNewPaymentAttempt, generateIdempotencyKey } from './payment-idempotency';
import type { PaymentDto, PaymentMethod } from './payment.types';

const STORAGE_PREFIX = 'ums-admission-web:payment-attempt:';

/**
 * Payment-attempt state (AWEB-18/19) -- the stateful shell around `payment-idempotency.ts`'s pure
 * decisions. Root-provided (unlike `ExamSessionStore`, which is deliberately per-route-scoped):
 * a payment attempt legitimately spans the method-selection screen and the post-redirect
 * confirmation screen as two different routes, so its state must outlive either one alone.
 */
@Injectable({ providedIn: 'root' })
export class PaymentAttemptStore {
  private readonly paymentApi = inject(PaymentApi);

  private readonly pendingPaymentInternal = signal<PaymentDto | null>(null);
  private readonly checkingInternal = signal(false);
  private readonly submittingInternal = signal(false);
  private readonly errorInternal = signal<string | null>(null);

  readonly pendingPayment = this.pendingPaymentInternal.asReadonly();
  readonly checking = this.checkingInternal.asReadonly();
  /** Submit-disable-on-click state (design-decisions.md idempotent-submission decision). */
  readonly submitting = this.submittingInternal.asReadonly();
  readonly error = this.errorInternal.asReadonly();

  /** True while a non-terminal prior attempt for this invoice must block a fresh payment-method picker. */
  readonly blocksNewAttempt = computed(() =>
    blocksNewPaymentAttempt(this.pendingPaymentInternal()?.status ?? null),
  );

  /**
   * design-decisions.md "Pre-Payment Transaction-Status Check": called before rendering the
   * payment-method picker for `invoiceId`. Re-checks any locally-remembered prior attempt's live
   * status (never trusts a stale local guess) -- see `payment.types.ts` for why this is a
   * same-browser-only mechanism (no query-by-invoice endpoint exists).
   */
  checkForPendingAttempt(invoiceId: string): void {
    const storedPaymentId = this.readStoredPaymentId(invoiceId);
    if (!storedPaymentId) {
      this.pendingPaymentInternal.set(null);
      return;
    }

    this.checkingInternal.set(true);
    this.paymentApi.getPaymentStatus(storedPaymentId).subscribe({
      next: (payment) => {
        this.checkingInternal.set(false);
        this.pendingPaymentInternal.set(payment);
        if (!blocksNewPaymentAttempt(payment.status)) {
          // A terminal (Failed) prior attempt no longer blocks anything -- stop remembering it so
          // a genuinely fresh attempt gets a clean slate next time.
          this.clearStoredPaymentId(invoiceId);
        }
      },
      error: () => {
        // A status-check failure (e.g. the remembered id is stale/invalid) must never block a
        // fresh attempt outright -- fail open to "no known prior attempt" rather than trapping the
        // applicant behind an unexplained block (§7 calm-confidence mandate).
        this.checkingInternal.set(false);
        this.pendingPaymentInternal.set(null);
        this.clearStoredPaymentId(invoiceId);
      },
    });
  }

  /**
   * Submit-disable-on-click + a fresh `IdempotencyKey` per call (Domain Invariant #3). Guarded by
   * {@link submitting} against a double-click firing two initiations before the first's response
   * (and therefore its disable) has even been rendered.
   */
  initiatePayment(
    applicationId: string,
    invoiceId: string,
    paymentMethod: PaymentMethod,
    onRedirect: (redirectUrl: string) => void,
    onError?: (error: UmsApiError) => void,
  ): void {
    if (this.submittingInternal()) {
      return;
    }

    this.submittingInternal.set(true);
    this.errorInternal.set(null);
    const idempotencyKey = generateIdempotencyKey();

    this.paymentApi
      .initiateApplicationFeePayment(applicationId, paymentMethod, idempotencyKey)
      .subscribe({
        next: ({ payment, redirectUrl }) => {
          this.submittingInternal.set(false);
          this.writeStoredPaymentId(invoiceId, payment.id);
          this.pendingPaymentInternal.set(payment);
          if (redirectUrl) {
            onRedirect(redirectUrl);
          }
        },
        error: (error: UmsApiError) => {
          this.submittingInternal.set(false);
          this.errorInternal.set(error.message || null);
          onError?.(error);
        },
      });
  }

  /** AWEB-19's confirmation screen polls this directly for a known payment id. */
  refreshStatus(paymentId: string, onUpdate: (payment: PaymentDto) => void): void {
    this.paymentApi.getPaymentStatus(paymentId).subscribe({
      next: (payment) => {
        this.pendingPaymentInternal.set(payment);
        onUpdate(payment);
      },
    });
  }

  /** Public read of the locally-remembered payment id for `invoiceId`, for a cold-started confirmation screen (e.g. after a full page reload following gateway redirect) to resume polling. */
  resolvePaymentId(invoiceId: string): string | null {
    return this.readStoredPaymentId(invoiceId);
  }

  private readStoredPaymentId(invoiceId: string): string | null {
    try {
      return localStorage.getItem(STORAGE_PREFIX + invoiceId);
    } catch {
      return null;
    }
  }

  private writeStoredPaymentId(invoiceId: string, paymentId: string): void {
    try {
      localStorage.setItem(STORAGE_PREFIX + invoiceId, paymentId);
    } catch {
      // Best-effort only -- see WizardDraftStore's identical rationale.
    }
  }

  private clearStoredPaymentId(invoiceId: string): void {
    try {
      localStorage.removeItem(STORAGE_PREFIX + invoiceId);
    } catch {
      // Best-effort only.
    }
  }
}
