import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { APP_CONFIG } from '../../core/config/app-config';
import { EnrollmentHandoffComponent } from './enrollment-handoff.component';

const baseUrl = 'http://localhost:8080';

function baseApplication(status: string) {
  return {
    id: 'app-1',
    applicantId: 'applicant-1',
    campaignId: 'campaign-1',
    status,
    programChoices: [],
    documents: [],
    isApplicationFeePaid: true,
    isConfirmationFeePaid: status === 'Confirmed',
  };
}

describe('EnrollmentHandoffComponent', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<EnrollmentHandoffComponent>>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EnrollmentHandoffComponent],
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
    fixture = TestBed.createComponent(EnrollmentHandoffComponent);
  });

  afterEach(() => httpMock.verify());

  it('shows handed-off once Application.Status is Confirmed', () => {
    fixture.detectChanges();
    httpMock
      .expectOne(`${baseUrl}/api/v1/admission/applications/app-1`)
      .flush(baseApplication('Confirmed'));

    expect(fixture.componentInstance['state']()).toBe('handed-off');
  });

  it('shows not-yet-confirmed for a Locked, unconfirmed application', () => {
    fixture.detectChanges();
    httpMock
      .expectOne(`${baseUrl}/api/v1/admission/applications/app-1`)
      .flush(baseApplication('Locked'));

    expect(fixture.componentInstance['state']()).toBe('not-yet-confirmed');
  });

  it('navigates to offer acceptance from the not-yet-confirmed state', () => {
    fixture.detectChanges();
    httpMock
      .expectOne(`${baseUrl}/api/v1/admission/applications/app-1`)
      .flush(baseApplication('Locked'));

    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigateByUrl');
    fixture.componentInstance['goToOfferAcceptance']();

    expect(navigateSpy).toHaveBeenCalledWith('/app/post-result/offer/app-1');
  });

  it('goes to error state when the application fetch fails', () => {
    fixture.detectChanges();
    httpMock
      .expectOne(`${baseUrl}/api/v1/admission/applications/app-1`)
      .error(new ProgressEvent('error'));

    expect(fixture.componentInstance['state']()).toBe('error');
  });
});
