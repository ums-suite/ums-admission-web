import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UmsButtonComponent } from '@ums/design-system';
import { ApplicationApi } from '../wizard/application.api';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { PaymentAttemptStore } from '../payment/payment-attempt.store';
import { isConfirmedPaymentStatus, isTerminalPaymentStatus } from '../payment/payment-idempotency';
import type { PaymentDto } from '../payment/payment.types';

const POLL_INTERVAL_MS = 3000;

/**
 * Post-redirect "confirming your seat-confirmation payment" waiting state (AWEB-29) -- the
 * confirmation-fee sibling of `PaymentConfirmationComponent` (AWEB-19), duplicated rather than
 * generalizing that already-tested component: the two flows differ in which invoice field they
 * resolve (`confirmationFeeInvoiceId` vs `applicationFeeInvoiceId`), what a success continues to
 * (document verification vs the admit card), and what a retry returns to (this ticket's own
 * offer-acceptance screen vs the application-fee picker) -- distinct enough, and this component
 * small enough, that duplicating it here carries far less risk than reworking AWEB-19's
 * already-shipped, already-tested screen to parameterize over both cases.
 *
 * On success, calls `ApplicationApi.confirmApplication` once more (safe/idempotent, see its own
 * class doc) so the applicant's `Application.Status` is authoritatively `Confirmed` (and the
 * `Student` record provisioned) before continuing, rather than assuming a webhook already did it.
 */
@Component({
  selector: 'app-offer-acceptance-confirming',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UmsButtonComponent, TranslatePipe],
  templateUrl: './offer-acceptance-confirming.component.html',
})
export class OfferAcceptanceConfirmingComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly applicationApi = inject(ApplicationApi);
  protected readonly store = inject(PaymentAttemptStore);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly applicationId = signal<string | null>(null);
  protected readonly payment = signal<PaymentDto | null>(null);
  protected readonly notFound = signal(false);
  protected readonly finalizing = signal(false);

  private pollIntervalId: ReturnType<typeof setInterval> | null = null;

  protected readonly isConfirmed = () => {
    const payment = this.payment();
    return payment ? isConfirmedPaymentStatus(payment.status) : false;
  };

  protected readonly isFailed = () => {
    const payment = this.payment();
    return payment
      ? isTerminalPaymentStatus(payment.status) && !isConfirmedPaymentStatus(payment.status)
      : false;
  };

  ngOnInit(): void {
    const applicationId = this.route.snapshot.paramMap.get('applicationId');
    if (!applicationId) {
      this.notFound.set(true);
      return;
    }
    this.applicationId.set(applicationId);

    this.applicationApi.getApplication(applicationId).subscribe({
      next: (application) => {
        const invoiceId = application.confirmationFeeInvoiceId;
        const resolvedPaymentId = invoiceId ? this.store.resolvePaymentId(invoiceId) : null;
        if (!resolvedPaymentId) {
          this.notFound.set(true);
          return;
        }
        this.pollOnce(resolvedPaymentId);
        this.pollIntervalId = setInterval(() => this.pollOnce(resolvedPaymentId), POLL_INTERVAL_MS);
        this.destroyRef.onDestroy(() => this.stopPolling());
      },
      error: () => this.notFound.set(true),
    });
  }

  protected retryPayment(): void {
    const applicationId = this.applicationId();
    if (applicationId) {
      void this.router.navigateByUrl(`/app/post-result/offer/${applicationId}`);
    }
  }

  /**
   * Continues regardless of whether the follow-up `confirmApplication` call itself succeeds: the
   * payment is already webhook-confirmed by this point (Domain Invariant #3 is already satisfied
   * before this method is ever reachable -- see `isConfirmed()`'s own gate), so this call is a
   * best-effort completeness step, not the actual money confirmation. Blocking the applicant here
   * after they've already paid, over a secondary follow-up call's failure, would be a worse
   * outcome than proceeding and letting the next screen's own load re-fetch the true state.
   */
  protected continue(): void {
    const applicationId = this.applicationId();
    if (!applicationId) {
      return;
    }
    this.finalizing.set(true);
    this.applicationApi.confirmApplication(applicationId).subscribe({
      next: () => void this.router.navigateByUrl(`/app/post-result/documents/${applicationId}`),
      error: () => void this.router.navigateByUrl(`/app/post-result/documents/${applicationId}`),
    });
  }

  private pollOnce(paymentId: string): void {
    this.store.refreshStatus(paymentId, (payment) => {
      this.payment.set(payment);
      if (isTerminalPaymentStatus(payment.status)) {
        this.stopPolling();
      }
    });
  }

  private stopPolling(): void {
    if (this.pollIntervalId !== null) {
      clearInterval(this.pollIntervalId);
      this.pollIntervalId = null;
    }
  }
}
