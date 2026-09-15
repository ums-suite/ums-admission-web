import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UmsButtonComponent, UmsCardComponent } from '@ums/design-system';
import type { UmsApiError } from '@ums/shared';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { TranslationService } from '../../core/i18n/translation.service';
import { ApplicationApi } from '../wizard/application.api';
import type { ApplicationDto } from '../wizard/application.types';
import { PaymentAttemptStore } from '../payment/payment-attempt.store';
import { PaymentApi } from '../payment/payment.api';
import type { InvoiceDto, PaymentMethod } from '../payment/payment.types';

const PAYMENT_METHODS: readonly PaymentMethod[] = ['bKash', 'Nagad', 'SSLCommerz'];

type ScreenState = 'loading' | 'already-confirmed' | 'select-payment' | 'error';

/**
 * Offer acceptance + seat-confirmation payment (AWEB-29, requirement-spec.md §3.7): the second
 * `Finance` invoice/payment cycle, same rules as AWEB-18's application-fee flow (idempotent
 * submission via {@link PaymentAttemptStore}/`payment-idempotency.ts`, reused rather than
 * reimplemented).
 *
 * Immediately calls `ApplicationApi.confirmApplication` on load (safe/idempotent per its own
 * class doc) purely to obtain-or-lazily-create the confirmation-fee invoice this screen needs to
 * show the payment picker for -- not itself the final confirmation, which only happens once
 * `Application.Confirm` sees the invoice actually paid (surfaced via
 * `OfferAcceptanceConfirmingComponent`).
 *
 * **Confirmed gap, flagged in the PR**: no deadline field exists anywhere on the backend (see
 * `ConfirmationAttemptResult`'s class doc) -- this screen shows a persistent, prominent urgency
 * notice instead of a fabricated date, matching this app's established "never invent data the
 * backend doesn't have" posture (e.g. `AdmissionTestDto`, `admit-card.component.ts`).
 */
@Component({
  selector: 'app-offer-acceptance',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UmsButtonComponent, UmsCardComponent, TranslatePipe],
  templateUrl: './offer-acceptance.component.html',
})
export class OfferAcceptanceComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly applicationApi = inject(ApplicationApi);
  private readonly paymentApi = inject(PaymentApi);
  protected readonly store = inject(PaymentAttemptStore);
  private readonly translation = inject(TranslationService);

  protected readonly state = signal<ScreenState>('loading');
  protected readonly methods = PAYMENT_METHODS;
  protected readonly application = signal<ApplicationDto | null>(null);
  protected readonly invoice = signal<InvoiceDto | null>(null);
  protected readonly selectedMethod = signal<PaymentMethod | null>(null);
  protected readonly errorMessage = signal<string | null>(null);

  private applicationId: string | null = null;

  ngOnInit(): void {
    const applicationId = this.route.snapshot.paramMap.get('applicationId');
    if (!applicationId) {
      this.state.set('error');
      return;
    }
    this.applicationId = applicationId;

    this.applicationApi.getApplication(applicationId).subscribe({
      next: (application) => {
        if (application.isConfirmationFeePaid || application.status === 'Confirmed') {
          this.application.set(application);
          this.state.set('already-confirmed');
          return;
        }
        this.beginConfirmation(applicationId);
      },
      error: () => this.state.set('error'),
    });
  }

  private beginConfirmation(applicationId: string): void {
    this.applicationApi.confirmApplication(applicationId).subscribe({
      next: ({ application, confirmationFeeInvoiceId, confirmed }) => {
        this.application.set(application);
        if (confirmed) {
          this.state.set('already-confirmed');
          return;
        }
        if (!confirmationFeeInvoiceId) {
          this.state.set('error');
          return;
        }
        this.store.checkForPendingAttempt(confirmationFeeInvoiceId);
        this.paymentApi.getInvoice(confirmationFeeInvoiceId).subscribe({
          next: (invoice) => {
            this.invoice.set(invoice);
            this.state.set('select-payment');
          },
          error: () => this.state.set('error'),
        });
      },
      error: () => this.state.set('error'),
    });
  }

  protected selectMethod(method: PaymentMethod): void {
    this.selectedMethod.set(method);
  }

  protected onSubmit(): void {
    const applicationId = this.applicationId;
    const invoice = this.invoice();
    const method = this.selectedMethod();
    if (!applicationId || !invoice || !method) {
      return;
    }

    this.errorMessage.set(null);
    this.store.initiateConfirmationPayment(
      applicationId,
      invoice.id,
      method,
      (redirectUrl) => {
        void this.router.navigateByUrl(`/app/post-result/offer/${applicationId}/confirming`);
        this.navigateToGateway(redirectUrl);
      },
      (error: UmsApiError) =>
        this.errorMessage.set(error.message || this.translation.t('postResult.offer.serverError')),
    );
  }

  protected goToDocuments(): void {
    if (this.applicationId) {
      void this.router.navigateByUrl(`/app/post-result/documents/${this.applicationId}`);
    }
  }

  /** Isolated for testability -- a real browser navigation away from this Angular app. */
  protected navigateToGateway(url: string): void {
    window.location.href = url;
  }
}
