import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { APP_CONFIG } from '../../core/config/app-config';
import type { ApplicationDto, CampaignDto } from './application.types';
import { WizardDraftStore } from './wizard-draft.store';

const baseUrl = 'http://localhost:8080';

function campaign(overrides: Partial<CampaignDto> = {}): CampaignDto {
  return {
    id: 'campaign-1',
    name: 'Fall 2026',
    programIds: ['p1'],
    applicationWindowStart: '2026-01-01',
    applicationWindowEnd: '2099-01-01',
    applicationFeeType: 'Standard',
    confirmationFeeType: 'Standard',
    isConfigurationLocked: false,
    requiredDocumentTypes: ['Photo'],
    ...overrides,
  };
}

function application(overrides: Partial<ApplicationDto> = {}): ApplicationDto {
  return {
    id: 'app-1',
    applicantId: 'applicant-1',
    campaignId: 'campaign-1',
    status: 'Draft',
    programChoices: [],
    documents: [],
    isApplicationFeePaid: false,
    isConfirmationFeePaid: false,
    ...overrides,
  };
}

describe('WizardDraftStore', () => {
  let store: WizardDraftStore;
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
    store = TestBed.inject(WizardDraftStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('creates a new draft application when none is stored locally for this campaign', () => {
    store.initialize('campaign-1');

    const campaignReq = httpMock.expectOne(`${baseUrl}/api/v1/admission/campaigns/campaign-1`);
    campaignReq.flush(campaign());

    const createReq = httpMock.expectOne(`${baseUrl}/api/v1/admission/applications/`);
    expect(createReq.request.method).toBe('POST');
    createReq.flush(application());

    expect(store.loading()).toBeFalse();
    expect(store.application()?.id).toBe('app-1');
    expect(localStorage.getItem('ums-admission-web:wizard-application:campaign-1')).toBe('app-1');
  });

  it('resumes a previously-created application from localStorage instead of creating a new one', () => {
    localStorage.setItem('ums-admission-web:wizard-application:campaign-1', 'app-1');
    store.initialize('campaign-1');

    httpMock.expectOne(`${baseUrl}/api/v1/admission/campaigns/campaign-1`).flush(campaign());
    const getReq = httpMock.expectOne(`${baseUrl}/api/v1/admission/applications/app-1`);
    expect(getReq.request.method).toBe('GET');
    getReq.flush(application());

    httpMock.expectNone(`${baseUrl}/api/v1/admission/applications/`);
    expect(store.application()?.id).toBe('app-1');
  });

  it('reports an error and stops loading when initialization fails', () => {
    store.initialize('campaign-1');
    // forkJoin issues both requests immediately, then unsubscribes the other the instant either
    // one errors -- the create-application request is still observed here (it was already sent)
    // but must not be flushed: forkJoin has already cancelled its subscription to it.
    httpMock
      .expectOne(`${baseUrl}/api/v1/admission/campaigns/campaign-1`)
      .flush({ title: 'not found' }, { status: 404, statusText: 'Not Found' });
    httpMock.match(`${baseUrl}/api/v1/admission/applications/`);

    expect(store.loading()).toBeFalse();
    expect(store.error()).toBeTruthy();
  });

  it('isEditable is true only while status is Draft', () => {
    store.initialize('campaign-1');
    httpMock.expectOne(`${baseUrl}/api/v1/admission/campaigns/campaign-1`).flush(campaign());
    httpMock.expectOne(`${baseUrl}/api/v1/admission/applications/`).flush(application());
    expect(store.isEditable()).toBeTrue();

    store.setApplication(application({ status: 'Locked' }));
    expect(store.isEditable()).toBeFalse();
  });

  it('isPastDeadline reflects the campaign application window', () => {
    store.initialize('campaign-1');
    httpMock
      .expectOne(`${baseUrl}/api/v1/admission/campaigns/campaign-1`)
      .flush(campaign({ applicationWindowEnd: '2000-01-01' }));
    httpMock.expectOne(`${baseUrl}/api/v1/admission/applications/`).flush(application());

    expect(store.isPastDeadline()).toBeTrue();
  });

  it('submit() calls the submit endpoint and updates the held application on success', () => {
    store.initialize('campaign-1');
    httpMock.expectOne(`${baseUrl}/api/v1/admission/campaigns/campaign-1`).flush(campaign());
    httpMock.expectOne(`${baseUrl}/api/v1/admission/applications/`).flush(application());

    let succeeded = false;
    store.submit(() => (succeeded = true));

    const req = httpMock.expectOne(`${baseUrl}/api/v1/admission/applications/app-1/submit`);
    req.flush(application({ status: 'Locked' }));

    expect(succeeded).toBeTrue();
    expect(store.application()?.status).toBe('Locked');
    expect(store.saving()).toBeFalse();
  });

  it('submit() reports an error via the onError callback and never marks the application locked', () => {
    store.initialize('campaign-1');
    httpMock.expectOne(`${baseUrl}/api/v1/admission/campaigns/campaign-1`).flush(campaign());
    httpMock.expectOne(`${baseUrl}/api/v1/admission/applications/`).flush(application());

    let receivedError = false;
    store.submit(undefined, () => (receivedError = true));

    httpMock
      .expectOne(`${baseUrl}/api/v1/admission/applications/app-1/submit`)
      .flush({ title: 'locked' }, { status: 409, statusText: 'Conflict' });

    expect(receivedError).toBeTrue();
    expect(store.application()?.status).toBe('Draft');
  });
});
