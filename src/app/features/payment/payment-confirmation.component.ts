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
import { PaymentAttemptStore } from './payment-attempt.store';
import { isConfirmedPaymentStatus, isTerminalPaymentStatus } from './payment-idempotency';
import type { PaymentDto } from './payment.types';

const POLL_INTERVAL_MS = 3000;

/**
 * Post-redirect "confirming your payment" waiting state (AWEB-19, requirement-spec.md §3.3, §7,
 * Edge Case "Payment gateway redirect fails to return cleanly"). Never renders anything but this
 * waiting state until `payment-idempotency.ts`'s {@link isConfirmedPaymentStatus} says so (Domain
 * Invariant #3) -- there is no intermediate "looks probably fine" branch.
 *
 * Resumable from a cold start (a reloaded tab, or the applicant returning from their dashboard per
 * the named edge case): the payment id is re-resolved from {@link PaymentAttemptStore}'s
 * locally-remembered value for this application's invoice rather than requiring it in the route,
 * so a fresh page load still finds the right `PaymentTransaction` to poll.
 *
 * Uses a plain CSS spinner rather than `@ums/design-system`'s `UmsProgressRingComponent`: that
 * component takes a `value`/`max` (a determinate percentage), which doesn't fit an indeterminate
 * "we don't know how long this takes" wait, and its echarts-backed async chart-init effect was
 * observed to throw an unhandled "Injector has already been destroyed" rejection during this
 * app's own test teardown when instantiated/destroyed across many spec runs -- flagged as a
 * suggested `ums-design-system` hardening item in the PR, not something this screen needs anyway.
 */
@Component({
  selector: 'app-payment-confirmation',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UmsButtonComponent, TranslatePipe],
  templateUrl: './payment-confirmation.component.html',
  styles: `
    .payment-confirmation__spinner {
      width: 2.5rem;
      height: 2.5rem;
      border: 3px solid var(--color-border, #d0d5dd);
      border-top-color: var(--color-primary, #2563eb);
      border-radius: 50%;
      animation: payment-confirmation-spin 0.9s linear infinite;
    }

    @media (prefers-reduced-motion: reduce) {
      .payment-confirmation__spinner {
        animation: none;
      }
    }

    @keyframes payment-confirmation-spin {
      to {
        transform: rotate(360deg);
      }
    }
  `,
})
export class PaymentConfirmationComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly applicationApi = inject(ApplicationApi);
  protected readonly store = inject(PaymentAttemptStore);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly applicationId = signal<string | null>(null);
  protected readonly paymentId = signal<string | null>(null);
  protected readonly payment = signal<PaymentDto | null>(null);
  protected readonly notFound = signal(false);

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
        const invoiceId = application.applicationFeeInvoiceId;
        const resolvedPaymentId = invoiceId ? this.store.resolvePaymentId(invoiceId) : null;
        if (!resolvedPaymentId) {
          this.notFound.set(true);
          return;
        }
        this.paymentId.set(resolvedPaymentId);
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
      void this.router.navigateByUrl(`/app/payment/${applicationId}`);
    }
  }

  protected continue(): void {
    void this.router.navigateByUrl('/app/admit-card');
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
