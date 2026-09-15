import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { APP_CONFIG } from '../../core/config/app-config';
import { PaymentApi } from './payment.api';

describe('PaymentApi', () => {
  let api: PaymentApi;
  let httpMock: HttpTestingController;
  const baseUrl = 'http://localhost:8080';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { apiBaseUrl: baseUrl } },
      ],
    });
    api = TestBed.inject(PaymentApi);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('initiates a payment with the idempotency key on the Idempotency-Key header, never in the body', () => {
    api.initiateApplicationFeePayment('app-1', 'SSLCommerz', 'key-123').subscribe();

    const req = httpMock.expectOne(`${baseUrl}/api/v1/admission/applications/app-1/payment`);
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('Idempotency-Key')).toBe('key-123');
    expect(req.request.body).toEqual({ paymentMethod: 'SSLCommerz' });
    req.flush({
      payment: { id: 'payment-1', invoiceId: 'invoice-1', status: 'Initiated' },
      redirectUrl: 'https://gateway.example/pay',
    });
  });

  it('reads payment status at GET /api/v1/finance/payments/{id}', () => {
    api.getPaymentStatus('payment-1').subscribe();
    const req = httpMock.expectOne(`${baseUrl}/api/v1/finance/payments/payment-1`);
    expect(req.request.method).toBe('GET');
    req.flush({ id: 'payment-1', status: 'Successful' });
  });

  it('reads an invoice at GET /api/v1/finance/invoices/{id}', () => {
    api.getInvoice('invoice-1').subscribe();
    const req = httpMock.expectOne(`${baseUrl}/api/v1/finance/invoices/invoice-1`);
    expect(req.request.method).toBe('GET');
    req.flush({ id: 'invoice-1', totalAmount: 500, currency: 'BDT', status: 'Open' });
  });

  it('initiates a confirmation-fee payment with the idempotency key on the header', () => {
    api.initiateConfirmationFeePayment('app-1', 'bKash', 'key-456').subscribe();

    const req = httpMock.expectOne(
      `${baseUrl}/api/v1/admission/applications/app-1/confirmation-payment`,
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('Idempotency-Key')).toBe('key-456');
    expect(req.request.body).toEqual({ paymentMethod: 'bKash' });
    req.flush({
      payment: { id: 'payment-2', invoiceId: 'invoice-2', status: 'Initiated' },
      redirectUrl: 'https://gateway.example/pay',
    });
  });
});
