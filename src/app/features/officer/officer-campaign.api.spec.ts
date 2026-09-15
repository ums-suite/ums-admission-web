import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { APP_CONFIG } from '../../core/config/app-config';
import { OfficerCampaignApi } from './officer-campaign.api';

const baseUrl = 'http://localhost:8080';

describe('OfficerCampaignApi', () => {
  let api: OfficerCampaignApi;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { apiBaseUrl: baseUrl } },
      ],
    });
    api = TestBed.inject(OfficerCampaignApi);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('creates a campaign at POST /api/v1/admission/campaigns/', () => {
    api
      .createCampaign({
        name: 'Fall 2026',
        programIds: ['p1'],
        applicationWindowStart: '2026-01-01',
        applicationWindowEnd: '2026-02-01',
        applicationFeeType: 'Standard',
        confirmationFeeType: 'Standard',
      })
      .subscribe();
    const req = httpMock.expectOne(`${baseUrl}/api/v1/admission/campaigns/`);
    expect(req.request.method).toBe('POST');
    req.flush({ id: 'campaign-1', name: 'Fall 2026' });
  });

  it('adds an eligibility rule at POST /api/v1/admission/campaigns/{id}/eligibility-rules', () => {
    api
      .addEligibilityRule('campaign-1', {
        programId: 'p1',
        minimumScore: 3.5,
        isGpaScale: true,
      })
      .subscribe();
    const req = httpMock.expectOne(
      `${baseUrl}/api/v1/admission/campaigns/campaign-1/eligibility-rules`,
    );
    expect(req.request.method).toBe('POST');
    req.flush({ id: 'campaign-1' });
  });

  it('adds a seat quota at POST /api/v1/admission/campaigns/{id}/seat-quotas', () => {
    api.addSeatQuota('campaign-1', { programId: 'p1', quota: 100 }).subscribe();
    const req = httpMock.expectOne(`${baseUrl}/api/v1/admission/campaigns/campaign-1/seat-quotas`);
    expect(req.request.method).toBe('POST');
    req.flush({ id: 'campaign-1' });
  });

  it('adds a required document type at POST /api/v1/admission/campaigns/{id}/required-documents', () => {
    api.addRequiredDocument('campaign-1', { documentType: 'Photo' }).subscribe();
    const req = httpMock.expectOne(
      `${baseUrl}/api/v1/admission/campaigns/campaign-1/required-documents`,
    );
    expect(req.request.method).toBe('POST');
    req.flush({ id: 'campaign-1' });
  });
});
