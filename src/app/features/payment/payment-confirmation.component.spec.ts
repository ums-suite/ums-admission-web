import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { APP_CONFIG } from '../../core/config/app-config';
import { PaymentConfirmationComponent } from './payment-confirmation.component';

const baseUrl = 'http://localhost:8080';

describe('PaymentConfirmationComponent', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<PaymentConfirmationComponent>>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    localStorage.clear();
    jasmine.clock().install();
    await TestBed.configureTestingModule({
      imports: [PaymentConfirmationComponent],
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
    fixture = TestBed.createComponent(PaymentConfirmationComponent);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
    jasmine.clock().uninstall();
  });

  it('shows the not-found state when no payment id was ever remembered for this invoice', () => {
    fixture.detectChanges();
    httpMock.expectOne(`${baseUrl}/api/v1/admission/applications/app-1`).flush({
      id: 'app-1',
      applicantId: 'applicant-1',
      campaignId: 'campaign-1',
      status: 'Locked',
      programChoices: [],
      documents: [],
      applicationFeeInvoiceId: 'invoice-1',
      isApplicationFeePaid: false,
      isConfirmationFeePaid: false,
    });

    expect(fixture.componentInstance['notFound']()).toBeTrue();
  });

  it('polls the remembered payment id and reports neither confirmed nor failed while non-terminal', () => {
    localStorage.setItem('ums-admission-web:payment-attempt:invoice-1', 'payment-1');
    fixture.detectChanges();
    httpMock.expectOne(`${baseUrl}/api/v1/admission/applications/app-1`).flush({
      id: 'app-1',
      applicantId: 'applicant-1',
      campaignId: 'campaign-1',
      status: 'Locked',
      programChoices: [],
      documents: [],
      applicationFeeInvoiceId: 'invoice-1',
      isApplicationFeePaid: false,
      isConfirmationFeePaid: false,
    });
    httpMock
      .expectOne(`${baseUrl}/api/v1/finance/payments/payment-1`)
      .flush({ id: 'payment-1', invoiceId: 'invoice-1', status: 'Pending' });

    expect(fixture.componentInstance['isConfirmed']()).toBeFalse();
    expect(fixture.componentInstance['isFailed']()).toBeFalse();
    expect(fixture.componentInstance['notFound']()).toBeFalse();
  });

  it('reports confirmed, never before, once the backend says Successful (Domain Invariant #3)', () => {
    localStorage.setItem('ums-admission-web:payment-attempt:invoice-1', 'payment-1');
    fixture.detectChanges();
    httpMock.expectOne(`${baseUrl}/api/v1/admission/applications/app-1`).flush({
      id: 'app-1',
      applicantId: 'applicant-1',
      campaignId: 'campaign-1',
      status: 'Locked',
      programChoices: [],
      documents: [],
      applicationFeeInvoiceId: 'invoice-1',
      isApplicationFeePaid: false,
      isConfirmationFeePaid: false,
    });
    httpMock
      .expectOne(`${baseUrl}/api/v1/finance/payments/payment-1`)
      .flush({ id: 'payment-1', invoiceId: 'invoice-1', status: 'Successful' });

    expect(fixture.componentInstance['isConfirmed']()).toBeTrue();
    expect(fixture.componentInstance['isFailed']()).toBeFalse();
  });

  it('reports failed (terminal but not confirmed) once the backend says Failed', () => {
    localStorage.setItem('ums-admission-web:payment-attempt:invoice-1', 'payment-1');
    fixture.detectChanges();
    httpMock.expectOne(`${baseUrl}/api/v1/admission/applications/app-1`).flush({
      id: 'app-1',
      applicantId: 'applicant-1',
      campaignId: 'campaign-1',
      status: 'Locked',
      programChoices: [],
      documents: [],
      applicationFeeInvoiceId: 'invoice-1',
      isApplicationFeePaid: false,
      isConfirmationFeePaid: false,
    });
    httpMock
      .expectOne(`${baseUrl}/api/v1/finance/payments/payment-1`)
      .flush({ id: 'payment-1', invoiceId: 'invoice-1', status: 'Failed' });

    expect(fixture.componentInstance['isFailed']()).toBeTrue();
    expect(fixture.componentInstance['isConfirmed']()).toBeFalse();
  });

  it('stops polling once a terminal status is reached', () => {
    localStorage.setItem('ums-admission-web:payment-attempt:invoice-1', 'payment-1');
    fixture.detectChanges();
    httpMock.expectOne(`${baseUrl}/api/v1/admission/applications/app-1`).flush({
      id: 'app-1',
      applicantId: 'applicant-1',
      campaignId: 'campaign-1',
      status: 'Locked',
      programChoices: [],
      documents: [],
      applicationFeeInvoiceId: 'invoice-1',
      isApplicationFeePaid: false,
      isConfirmationFeePaid: false,
    });
    httpMock
      .expectOne(`${baseUrl}/api/v1/finance/payments/payment-1`)
      .flush({ id: 'payment-1', invoiceId: 'invoice-1', status: 'Successful' });

    jasmine.clock().tick(10000);
    httpMock.expectNone(`${baseUrl}/api/v1/finance/payments/payment-1`);
    expect(fixture.componentInstance['isConfirmed']()).toBeTrue();
  });
});
