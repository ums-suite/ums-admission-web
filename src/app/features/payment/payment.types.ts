/**
 * Wire shapes for `Finance`'s `Invoice`/`Payment`/`PaymentTransaction` (AWEB-18/19) -- verified
 * directly against `ums-core` source (`Invoice.cs`, `InvoiceDto.cs`, `Payment.cs`, `PaymentDto.cs`,
 * `PaymentTransaction.cs`, `PaymentEndpoints.cs`, `IPaymentGateway.cs`) by the same dedicated
 * research pass as the wizard chain (`application.types.ts`).
 *
 * **Confirmed**: the caller-supplied idempotency key (requirement-spec.md §3.3, Domain Invariant
 * #3, design-decisions.md) travels as the `Idempotency-Key` HTTP header on
 * `POST /api/v1/finance/payments/` -- NOT a body field. `Admission`'s own
 * `POST /applications/{id}/payment` (used here instead of calling Finance directly, since Finance's
 * raw invoice/payment-create endpoints are gated behind `finance.invoice.create`/
 * `finance.payment.initiate`, officer/system-level permissions an Applicant does not hold) is
 * assumed to follow the same header convention -- this specific assumption is flagged in the PR as
 * unverified against `ApplicationEndpoints.cs`'s own payment action (the research pass confirmed
 * the route exists and what it does, not its exact idempotency-key wire mechanics).
 *
 * **Confirmed gap**: `GatewayName` is a plain string column -- there is no `PaymentMethod` enum,
 * and only one concrete `IPaymentGateway` (`SslCommerzPaymentGateway`, name `"SSLCommerz"`) exists
 * server-side. bKash/Nagad are named in ADR-0008 as future pluggable gateways but have no real
 * implementation in `ums-core` today. This app still offers all three in its method picker (§3.3
 * names all three explicitly) but flags bKash/Nagad as pending-backend in the PR -- selecting them
 * will fail server-side (no matching `IPaymentGateway`) until Finance ships them.
 *
 * **Confirmed gap**: there is no "list payments for an invoice/application" endpoint -- only
 * `GET /api/v1/finance/payments/{id}` (must already know the id). The pre-payment
 * transaction-status check (design-decisions.md) is therefore implemented client-side by
 * persisting the most recently initiated payment's id locally, keyed by invoice id (see
 * `payment-attempt.store.ts`) -- same-browser only, flagged as a cross-team gap for a real
 * query-by-invoice endpoint.
 */
export type PaymentStatus = 'Initiated' | 'Pending' | 'Successful' | 'Failed' | 'Reconciled';
export type PaymentMethod = 'bKash' | 'Nagad' | 'SSLCommerz';

export interface PaymentDto {
  readonly id: string;
  readonly invoiceId: string;
  readonly ownerId: string;
  readonly amount: number;
  readonly currency: string;
  readonly status: PaymentStatus;
  readonly gatewayName: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface InitiatePaymentResult {
  readonly payment: PaymentDto;
  readonly redirectUrl?: string;
}

export interface InvoiceDto {
  readonly id: string;
  readonly sourceModule: string;
  readonly sourceReferenceId: string;
  readonly feeType: string;
  readonly ownerId: string;
  readonly totalAmount: number;
  readonly currency: string;
  readonly status: 'Open' | 'Paid';
  readonly createdAt: string;
  readonly paidAt?: string;
}
