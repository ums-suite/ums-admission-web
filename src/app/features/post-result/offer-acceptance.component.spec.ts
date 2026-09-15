import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { APP_CONFIG } from '../../core/config/app-config';
import { OfferAcceptanceComponent } from './offer-acceptance.component';

const baseUrl = 'http://localhost:8080';

function baseApplication(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'app-1',
    applicantId: 'applicant-1',
    campaignId: 'campaign-1',
    status: 'Locked',
    programChoices: [],
    documents: [],
    isApplicationFeePaid: true,
    isConfirmationFeePaid: false,
    ...overrides,
  };
}

describe('OfferAcceptanceComponent', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<OfferAcceptanceComponent>>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [OfferAcceptanceComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: APP_CONFIG, useValue: { apiBaseUrl: baseUrl } },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ applicationId: 'app-1' }) } },
        },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(OfferAcceptanceComponent);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('shows already-confirmed without calling confirm when the confirmation fee is already paid', () => {
    fixture.detectChanges();
    httpMock
      .expectOne(`${baseUrl}/api/v1/admission/applications/app-1`)
      .flush(baseApplication({ isConfirmationFeePaid: true }));

    expect(fixture.componentInstance['state']()).toBe('already-confirmed');
  });

  it('calls confirm, fetches the invoice, and renders the payment picker', () => {
    fixture.detectChanges();
    httpMock.expectOne(`${baseUrl}/api/v1/admission/applications/app-1`).flush(baseApplication());
    httpMock.expectOne(`${baseUrl}/api/v1/admission/applications/app-1/confirm`).flush({
      application: baseApplication({ confirmationFeeInvoiceId: 'invoice-1' }),
      confirmationFeeInvoiceId: 'invoice-1',
      confirmed: false,
    });
    httpMock.expectOne(`${baseUrl}/api/v1/finance/invoices/invoice-1`).flush({
      id: 'invoice-1',
      feeType: 'Confirmation',
      totalAmount: 1000,
      currency: 'BDT',
      status: 'Open',
    });

    expect(fixture.componentInstance['state']()).toBe('select-payment');
    expect(fixture.componentInstance['invoice']()?.totalAmount).toBe(1000);
  });

  it('goes straight to already-confirmed when confirm itself reports confirmed:true', () => {
    fixture.detectChanges();
    httpMock.expectOne(`${baseUrl}/api/v1/admission/applications/app-1`).flush(baseApplication());
    httpMock.expectOne(`${baseUrl}/api/v1/admission/applications/app-1/confirm`).flush({
      application: baseApplication({ status: 'Confirmed', isConfirmationFeePaid: true }),
      confirmed: true,
    });

    expect(fixture.componentInstance['state']()).toBe('already-confirmed');
  });

  it('initiates a confirmation payment and hands the redirect to navigateToGateway', () => {
    fixture.detectChanges();
    httpMock.expectOne(`${baseUrl}/api/v1/admission/applications/app-1`).flush(baseApplication());
    httpMock.expectOne(`${baseUrl}/api/v1/admission/applications/app-1/confirm`).flush({
      application: baseApplication({ confirmationFeeInvoiceId: 'invoice-1' }),
      confirmationFeeInvoiceId: 'invoice-1',
      confirmed: false,
    });
    httpMock.expectOne(`${baseUrl}/api/v1/finance/invoices/invoice-1`).flush({
      id: 'invoice-1',
      feeType: 'Confirmation',
      totalAmount: 1000,
      currency: 'BDT',
      status: 'Open',
    });

    const component = fixture.componentInstance;
    const redirectSpy = spyOn(
      component as unknown as { navigateToGateway(url: string): void },
      'navigateToGateway',
    );
    component['selectMethod']('SSLCommerz');
    component['onSubmit']();

    httpMock
      .expectOne(`${baseUrl}/api/v1/admission/applications/app-1/confirmation-payment`)
      .flush({
        payment: { id: 'payment-1', invoiceId: 'invoice-1', status: 'Initiated' },
        redirectUrl: 'https://gateway.example/pay',
      });

    expect(redirectSpy).toHaveBeenCalledWith('https://gateway.example/pay');
  });
});
