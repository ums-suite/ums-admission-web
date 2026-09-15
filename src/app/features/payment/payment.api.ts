import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { ProvisionalModuleApiBase } from '../../core/http/provisional-module-api.base';
import type { InitiatePaymentResult, InvoiceDto, PaymentDto, PaymentMethod } from './payment.types';

const IDEMPOTENCY_KEY_HEADER = 'Idempotency-Key';

/**
 * Interim client for the application-fee payment flow (AWEB-18/19) -- see `payment.types.ts` for
 * the confirmed routes/gaps this is built against.
 */
@Injectable({ providedIn: 'root' })
export class PaymentApi extends ProvisionalModuleApiBase {
  /**
   * `POST /api/v1/admission/applications/{id}/payment` with the caller-supplied idempotency key on
   * the `Idempotency-Key` header (Domain Invariant #3, design-decisions.md's idempotent-submission
   * decision) -- `paymentMethod` is passed in the body for the gateway to select against, though
   * only `SSLCommerz` has a real server-side implementation today (see `payment.types.ts`).
   */
  initiateApplicationFeePayment(
    applicationId: string,
    paymentMethod: PaymentMethod,
    idempotencyKey: string,
  ): Observable<InitiatePaymentResult> {
    return this.normalizeErrors(
      this.http.post<InitiatePaymentResult>(
        this.apiUrl(`admission/applications/${applicationId}/payment`),
        { paymentMethod },
        { headers: { [IDEMPOTENCY_KEY_HEADER]: idempotencyKey } },
      ),
    );
  }

  /**
   * `POST /api/v1/admission/applications/{id}/confirmation-payment` (AWEB-29) -- the second
   * `Finance` invoice/payment cycle §3.7 calls for, same idempotency rules as
   * {@link initiateApplicationFeePayment} above. **Unverified, assumed sibling route**: the
   * research pass backing this app's `POST /applications/{id}/confirm` route (see
   * `application.types.ts`'s `ConfirmationAttemptResult` class doc) confirmed that endpoint lazily
   * creates the confirmation-fee invoice, but found no confirmed endpoint for actually *paying*
   * it -- this mirrors `initiateApplicationFeePayment`'s own already-established route shape as
   * the most plausible sibling, flagged in the PR as unverified against `ApplicationEndpoints.cs`
   * pending confirmation.
   */
  initiateConfirmationFeePayment(
    applicationId: string,
    paymentMethod: PaymentMethod,
    idempotencyKey: string,
  ): Observable<InitiatePaymentResult> {
    return this.normalizeErrors(
      this.http.post<InitiatePaymentResult>(
        this.apiUrl(`admission/applications/${applicationId}/confirmation-payment`),
        { paymentMethod },
        { headers: { [IDEMPOTENCY_KEY_HEADER]: idempotencyKey } },
      ),
    );
  }

  /** `GET /api/v1/finance/payments/{id}` -- the only status-check path available (see class doc's confirmed gap: no query-by-invoice endpoint exists). */
  getPaymentStatus(paymentId: string): Observable<PaymentDto> {
    return this.normalizeErrors(
      this.http.get<PaymentDto>(this.apiUrl(`finance/payments/${paymentId}`)),
    );
  }

  /** `GET /api/v1/finance/invoices/{id}` (ownership-checked server-side) -- used to show the applicant the amount and what it's for (§7 "payment as a single calm screen"). */
  getInvoice(invoiceId: string): Observable<InvoiceDto> {
    return this.normalizeErrors(
      this.http.get<InvoiceDto>(this.apiUrl(`finance/invoices/${invoiceId}`)),
    );
  }
}
