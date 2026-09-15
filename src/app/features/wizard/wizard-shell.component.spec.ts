import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { OrganizationApiService } from '@ums/shared';
import { of } from 'rxjs';
import { APP_CONFIG } from '../../core/config/app-config';
import { WizardShellComponent } from './wizard-shell.component';

const baseUrl = 'http://localhost:8080';

describe('WizardShellComponent', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<WizardShellComponent>>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    localStorage.clear();
    const organizationApiSpy = jasmine.createSpyObj('OrganizationApiService', [
      'apiV1OrganizationProgramsGet',
    ]);
    organizationApiSpy.apiV1OrganizationProgramsGet.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [WizardShellComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { apiBaseUrl: baseUrl } },
        { provide: OrganizationApiService, useValue: organizationApiSpy },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ campaignId: 'campaign-1' }) } },
        },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(WizardShellComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('initializes the draft store from the route campaignId and renders the first step once loaded', () => {
    httpMock.expectOne(`${baseUrl}/api/v1/admission/campaigns/campaign-1`).flush({
      id: 'campaign-1',
      name: 'Fall 2026',
      programIds: [],
      applicationWindowStart: '2026-01-01',
      applicationWindowEnd: '2099-01-01',
      applicationFeeType: 'Standard',
      confirmationFeeType: 'Standard',
      isConfigurationLocked: false,
      requiredDocumentTypes: [],
    });
    httpMock.expectOne(`${baseUrl}/api/v1/admission/applications/`).flush({
      id: 'app-1',
      applicantId: 'applicant-1',
      campaignId: 'campaign-1',
      status: 'Draft',
      programChoices: [],
      documents: [],
      isApplicationFeePaid: false,
      isConfirmationFeePaid: false,
    });
    fixture.detectChanges();

    expect(fixture.componentInstance['store'].loading()).toBeFalse();
    expect(fixture.componentInstance['currentStepId']).toBe('programChoices');
  });

  it('advance()/goBack() move the current step forward and back', () => {
    httpMock.expectOne(`${baseUrl}/api/v1/admission/campaigns/campaign-1`).flush({
      id: 'campaign-1',
      name: 'Fall 2026',
      programIds: [],
      applicationWindowStart: '2026-01-01',
      applicationWindowEnd: '2099-01-01',
      applicationFeeType: 'Standard',
      confirmationFeeType: 'Standard',
      isConfigurationLocked: false,
      requiredDocumentTypes: [],
    });
    httpMock.expectOne(`${baseUrl}/api/v1/admission/applications/`).flush({
      id: 'app-1',
      applicantId: 'applicant-1',
      campaignId: 'campaign-1',
      status: 'Draft',
      programChoices: [],
      documents: [],
      isApplicationFeePaid: false,
      isConfirmationFeePaid: false,
    });

    const component = fixture.componentInstance;
    component['advance']();
    expect(component['currentStepIndex']()).toBe(1);
    component['goBack']();
    expect(component['currentStepIndex']()).toBe(0);
  });

  it('goToStep only allows navigating to an already-visited step', () => {
    httpMock.expectOne(`${baseUrl}/api/v1/admission/campaigns/campaign-1`).flush({
      id: 'campaign-1',
      name: 'Fall 2026',
      programIds: [],
      applicationWindowStart: '2026-01-01',
      applicationWindowEnd: '2099-01-01',
      applicationFeeType: 'Standard',
      confirmationFeeType: 'Standard',
      isConfigurationLocked: false,
      requiredDocumentTypes: [],
    });
    httpMock.expectOne(`${baseUrl}/api/v1/admission/applications/`).flush({
      id: 'app-1',
      applicantId: 'applicant-1',
      campaignId: 'campaign-1',
      status: 'Draft',
      programChoices: [],
      documents: [],
      isApplicationFeePaid: false,
      isConfirmationFeePaid: false,
    });

    const component = fixture.componentInstance;
    component['advance']();
    component['advance']();
    expect(component['currentStepIndex']()).toBe(2);

    component['goToStep'](3);
    expect(component['currentStepIndex']()).toBe(2);

    component['goToStep'](1);
    expect(component['currentStepIndex']()).toBe(1);
  });
});
