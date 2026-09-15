import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { APP_CONFIG } from '../../core/config/app-config';
import { PaymentMethodSelectionComponent } from './payment-method-selection.component';

const baseUrl = 'http://localhost:8080';

function baseApplication(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'app-1',
    applicantId: 'applicant-1',
    campaignId: 'campaign-1',
    status: 'Locked',
    programChoices: [],
    documents: [],
    applicationFeeInvoiceId: 'invoice-1',
    isApplicationFeePaid: false,
    isConfirmationFeePaid: false,
    ...overrides,
  };
}

describe('PaymentMethodSelectionComponent', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<PaymentMethodSelectionComponent>>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [PaymentMethodSelectionComponent],
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
    fixture = TestBed.createComponent(PaymentMethodSelectionComponent);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('shows the already-paid state without fetching an invoice when the fee is already paid', () => {
    fixture.detectChanges();
    httpMock
      .expectOne(`${baseUrl}/api/v1/admission/applications/app-1`)
      .flush(baseApplication({ isApplicationFeePaid: true }));

    expect(fixture.componentInstance['loading']()).toBeFalse();
    expect(fixture.componentInstance['application']()?.isApplicationFeePaid).toBeTrue();
  });

  it('loads the invoice and checks for a pending attempt when the fee is unpaid', () => {
    fixture.detectChanges();
    httpMock.expectOne(`${baseUrl}/api/v1/admission/applications/app-1`).flush(baseApplication());
    httpMock.expectOne(`${baseUrl}/api/v1/finance/invoices/invoice-1`).flush({
      id: 'invoice-1',
      feeType: 'Application',
      totalAmount: 500,
      currency: 'BDT',
      status: 'Open',
    });

    expect(fixture.componentInstance['loading']()).toBeFalse();
    expect(fixture.componentInstance['invoice']()?.totalAmount).toBe(500);
  });

  it('initiates payment and hands the redirect URL to navigateToGateway on submit', () => {
    fixture.detectChanges();
    httpMock.expectOne(`${baseUrl}/api/v1/admission/applications/app-1`).flush(baseApplication());
    httpMock.expectOne(`${baseUrl}/api/v1/finance/invoices/invoice-1`).flush({
      id: 'invoice-1',
      feeType: 'Application',
      totalAmount: 500,
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

    httpMock.expectOne(`${baseUrl}/api/v1/admission/applications/app-1/payment`).flush({
      payment: { id: 'payment-1', invoiceId: 'invoice-1', status: 'Initiated' },
      redirectUrl: 'https://gateway.example/pay',
    });

    expect(redirectSpy).toHaveBeenCalledWith('https://gateway.example/pay');
  });

  it('does not submit when no method has been selected', () => {
    fixture.detectChanges();
    httpMock.expectOne(`${baseUrl}/api/v1/admission/applications/app-1`).flush(baseApplication());
    httpMock.expectOne(`${baseUrl}/api/v1/finance/invoices/invoice-1`).flush({
      id: 'invoice-1',
      feeType: 'Application',
      totalAmount: 500,
      currency: 'BDT',
      status: 'Open',
    });

    fixture.componentInstance['onSubmit']();
    httpMock.expectNone(`${baseUrl}/api/v1/admission/applications/app-1/payment`);
    expect(fixture.componentInstance['store'].submitting()).toBeFalse();
  });
});
