import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { APP_CONFIG } from '../../core/config/app-config';
import { OfferAcceptanceConfirmingComponent } from './offer-acceptance-confirming.component';

const baseUrl = 'http://localhost:8080';

describe('OfferAcceptanceConfirmingComponent', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<OfferAcceptanceConfirmingComponent>>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [OfferAcceptanceConfirmingComponent],
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
    fixture = TestBed.createComponent(OfferAcceptanceConfirmingComponent);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('shows not-found when no locally-remembered payment id exists for the confirmation invoice', () => {
    fixture.detectChanges();
    httpMock.expectOne(`${baseUrl}/api/v1/admission/applications/app-1`).flush({
      id: 'app-1',
      status: 'Locked',
      programChoices: [],
      documents: [],
      isApplicationFeePaid: true,
      isConfirmationFeePaid: false,
      confirmationFeeInvoiceId: 'invoice-1',
    });

    expect(fixture.componentInstance['notFound']()).toBeTrue();
  });

  it('polls and reports confirmed once the payment status is Successful, then finalizes on continue', () => {
    localStorage.setItem('ums-admission-web:payment-attempt:invoice-1', 'payment-1');

    fixture.detectChanges();
    httpMock.expectOne(`${baseUrl}/api/v1/admission/applications/app-1`).flush({
      id: 'app-1',
      status: 'Locked',
      programChoices: [],
      documents: [],
      isApplicationFeePaid: true,
      isConfirmationFeePaid: false,
      confirmationFeeInvoiceId: 'invoice-1',
    });
    httpMock
      .expectOne(`${baseUrl}/api/v1/finance/payments/payment-1`)
      .flush({ id: 'payment-1', invoiceId: 'invoice-1', status: 'Successful' });

    expect(fixture.componentInstance['isConfirmed']()).toBeTrue();

    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigateByUrl');
    fixture.componentInstance['continue']();
    httpMock.expectOne(`${baseUrl}/api/v1/admission/applications/app-1/confirm`).flush({
      application: { id: 'app-1', status: 'Confirmed' },
      confirmed: true,
    });

    expect(navigateSpy).toHaveBeenCalledWith('/app/post-result/documents/app-1');
  });
});
