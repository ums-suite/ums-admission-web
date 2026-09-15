import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UmsButtonComponent, UmsCardComponent } from '@ums/design-system';
import type { UmsApiError } from '@ums/shared';
import { ApplicationApi } from '../wizard/application.api';
import type { ApplicationDto } from '../wizard/application.types';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { TranslationService } from '../../core/i18n/translation.service';
import { PaymentAttemptStore } from './payment-attempt.store';
import { PaymentApi } from './payment.api';
import type { InvoiceDto, PaymentMethod } from './payment.types';

const PAYMENT_METHODS: readonly PaymentMethod[] = ['bKash', 'Nagad', 'SSLCommerz'];

/**
 * Payment-method selection (AWEB-18, requirement-spec.md §3.3, §7 "a single, calm, unambiguous
 * screen"). Idempotent submission (Domain Invariant #3, design-decisions.md) is entirely delegated
 * to {@link PaymentAttemptStore}/`payment-idempotency.ts` -- this component's own job is just
 * rendering the picker and disabling it while `store.submitting()` is true.
 *
 * Before rendering the picker at all, re-checks for a non-terminal prior attempt on this invoice
 * (design-decisions.md's proactive transaction-status check) and shows the "confirming" state
 * instead if one is found -- never a second picker racing an attempt already in flight.
 */
@Component({
  selector: 'app-payment-method-selection',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UmsButtonComponent, UmsCardComponent, TranslatePipe],
  templateUrl: './payment-method-selection.component.html',
})
export class PaymentMethodSelectionComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly applicationApi = inject(ApplicationApi);
  private readonly paymentApi = inject(PaymentApi);
  protected readonly store = inject(PaymentAttemptStore);
  private readonly translation = inject(TranslationService);

  protected readonly methods = PAYMENT_METHODS;
  protected readonly loading = signal(true);
  protected readonly application = signal<ApplicationDto | null>(null);
  protected readonly invoice = signal<InvoiceDto | null>(null);
  protected readonly selectedMethod = signal<PaymentMethod | null>(null);
  protected readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    const applicationId = this.route.snapshot.paramMap.get('applicationId');
    if (!applicationId) {
      this.loading.set(false);
      return;
    }

    this.applicationApi.getApplication(applicationId).subscribe({
      next: (application) => {
        this.application.set(application);
        if (application.isApplicationFeePaid || !application.applicationFeeInvoiceId) {
          this.loading.set(false);
          return;
        }
        const invoiceId = application.applicationFeeInvoiceId;
        this.store.checkForPendingAttempt(invoiceId);
        this.paymentApi.getInvoice(invoiceId).subscribe({
          next: (invoice) => {
            this.invoice.set(invoice);
            this.loading.set(false);
          },
          error: () => this.loading.set(false),
        });
      },
      error: () => this.loading.set(false),
    });
  }

  protected selectMethod(method: PaymentMethod): void {
    this.selectedMethod.set(method);
  }

  protected onSubmit(): void {
    const application = this.application();
    const invoice = this.invoice();
    const method = this.selectedMethod();
    if (!application || !invoice || !method) {
      return;
    }

    this.errorMessage.set(null);
    this.store.initiatePayment(
      application.id,
      invoice.id,
      method,
      (redirectUrl) => {
        void this.router.navigateByUrl(`/app/payment/${application.id}/confirming`);
        this.navigateToGateway(redirectUrl);
      },
      (error: UmsApiError) =>
        this.errorMessage.set(error.message || this.translation.t('payment.method.serverError')),
    );
  }

  /** Isolated for testability -- a real browser navigation away from this Angular app. */
  protected navigateToGateway(url: string): void {
    window.location.href = url;
  }
}
