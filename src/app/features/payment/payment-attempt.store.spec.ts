import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { APP_CONFIG } from '../../core/config/app-config';
import { PaymentAttemptStore } from './payment-attempt.store';

const baseUrl = 'http://localhost:8080';

describe('PaymentAttemptStore', () => {
  let store: PaymentAttemptStore;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { apiBaseUrl: baseUrl } },
      ],
    });
    store = TestBed.inject(PaymentAttemptStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  describe('checkForPendingAttempt (design-decisions.md pre-payment check)', () => {
    it('reports no blocking attempt when nothing was previously stored for this invoice', () => {
      store.checkForPendingAttempt('invoice-1');
      expect(store.blocksNewAttempt()).toBeFalse();
      httpMock.expectNone(`${baseUrl}/api/v1/finance/payments/payment-1`);
    });

    it('blocks a new attempt while a remembered payment is still non-terminal', () => {
      localStorage.setItem('ums-admission-web:payment-attempt:invoice-1', 'payment-1');
      store.checkForPendingAttempt('invoice-1');

      httpMock
        .expectOne(`${baseUrl}/api/v1/finance/payments/payment-1`)
        .flush({ id: 'payment-1', invoiceId: 'invoice-1', status: 'Pending' });

      expect(store.blocksNewAttempt()).toBeTrue();
      expect(localStorage.getItem('ums-admission-web:payment-attempt:invoice-1')).toBe('payment-1');
    });

    it('does not block and forgets the remembered payment once it resolves to a terminal Failed status', () => {
      localStorage.setItem('ums-admission-web:payment-attempt:invoice-1', 'payment-1');
      store.checkForPendingAttempt('invoice-1');

      httpMock
        .expectOne(`${baseUrl}/api/v1/finance/payments/payment-1`)
        .flush({ id: 'payment-1', invoiceId: 'invoice-1', status: 'Failed' });

      expect(store.blocksNewAttempt()).toBeFalse();
      expect(localStorage.getItem('ums-admission-web:payment-attempt:invoice-1')).toBeNull();
    });

    it('fails open (does not block) if the status check itself fails', () => {
      localStorage.setItem('ums-admission-web:payment-attempt:invoice-1', 'payment-1');
      store.checkForPendingAttempt('invoice-1');

      httpMock
        .expectOne(`${baseUrl}/api/v1/finance/payments/payment-1`)
        .flush({ title: 'not found' }, { status: 404, statusText: 'Not Found' });

      expect(store.blocksNewAttempt()).toBeFalse();
      expect(store.checking()).toBeFalse();
    });
  });

  describe('initiatePayment (Domain Invariant #3 / idempotent submission)', () => {
    it('disables further submission while one is already in flight', () => {
      store.initiatePayment('app-1', 'invoice-1', 'SSLCommerz', () => undefined);
      expect(store.submitting()).toBeTrue();

      store.initiatePayment('app-1', 'invoice-1', 'SSLCommerz', () => undefined);

      // Only one request should have been made -- the second call was a no-op while submitting.
      httpMock.expectOne(`${baseUrl}/api/v1/admission/applications/app-1/payment`);
    });

    it('sends a fresh Idempotency-Key header on the request', () => {
      store.initiatePayment('app-1', 'invoice-1', 'SSLCommerz', () => undefined);
      const req = httpMock.expectOne(`${baseUrl}/api/v1/admission/applications/app-1/payment`);
      expect(req.request.headers.get('Idempotency-Key')).toBeTruthy();
      req.flush({ payment: { id: 'payment-1', invoiceId: 'invoice-1', status: 'Initiated' } });
    });

    it('uses a different Idempotency-Key on a subsequent, separate attempt', () => {
      store.initiatePayment('app-1', 'invoice-1', 'SSLCommerz', () => undefined);
      const firstReq = httpMock.expectOne(`${baseUrl}/api/v1/admission/applications/app-1/payment`);
      const firstKey = firstReq.request.headers.get('Idempotency-Key');
      firstReq.flush({ payment: { id: 'payment-1', invoiceId: 'invoice-1', status: 'Failed' } });

      store.initiatePayment('app-1', 'invoice-1', 'SSLCommerz', () => undefined);
      const secondReq = httpMock.expectOne(
        `${baseUrl}/api/v1/admission/applications/app-1/payment`,
      );
      expect(secondReq.request.headers.get('Idempotency-Key')).not.toBe(firstKey);
      secondReq.flush({
        payment: { id: 'payment-2', invoiceId: 'invoice-1', status: 'Initiated' },
      });
    });

    it('re-enables submission and calls onRedirect once the response carries a redirectUrl', () => {
      let redirectedTo: string | null = null;
      store.initiatePayment('app-1', 'invoice-1', 'SSLCommerz', (url) => {
        redirectedTo = url;
      });

      httpMock.expectOne(`${baseUrl}/api/v1/admission/applications/app-1/payment`).flush({
        payment: { id: 'payment-1', invoiceId: 'invoice-1', status: 'Initiated' },
        redirectUrl: 'https://gateway.example/pay',
      });

      expect(store.submitting()).toBeFalse();
      expect(redirectedTo as string | null).toBe('https://gateway.example/pay');
      expect(localStorage.getItem('ums-admission-web:payment-attempt:invoice-1')).toBe('payment-1');
    });

    it('re-enables submission and reports the error without ever calling onRedirect on failure', () => {
      let redirected = false;
      let receivedError = false;
      store.initiatePayment(
        'app-1',
        'invoice-1',
        'SSLCommerz',
        () => (redirected = true),
        () => (receivedError = true),
      );

      httpMock
        .expectOne(`${baseUrl}/api/v1/admission/applications/app-1/payment`)
        .flush({ title: 'gateway error' }, { status: 502, statusText: 'Bad Gateway' });

      expect(store.submitting()).toBeFalse();
      expect(redirected).toBeFalse();
      expect(receivedError).toBeTrue();
      expect(store.error()).toBeTruthy();
    });

    it('never shows the payment as confirmed from the initiation response alone', () => {
      store.initiatePayment('app-1', 'invoice-1', 'SSLCommerz', () => undefined);
      httpMock.expectOne(`${baseUrl}/api/v1/admission/applications/app-1/payment`).flush({
        payment: { id: 'payment-1', invoiceId: 'invoice-1', status: 'Initiated' },
        redirectUrl: 'https://gateway.example/pay',
      });

      expect(store.pendingPayment()?.status).toBe('Initiated');
      expect(store.blocksNewAttempt()).toBeTrue();
    });
  });

  describe('refreshStatus', () => {
    it('updates the held payment and invokes the callback with the latest status', () => {
      let latestStatus: string | null = null;
      store.refreshStatus('payment-1', (payment) => {
        latestStatus = payment.status;
      });

      httpMock
        .expectOne(`${baseUrl}/api/v1/finance/payments/payment-1`)
        .flush({ id: 'payment-1', invoiceId: 'invoice-1', status: 'Successful' });

      expect(latestStatus as string | null).toBe('Successful');
      expect(store.pendingPayment()?.status).toBe('Successful');
    });
  });
});
