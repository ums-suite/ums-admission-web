import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { APP_CONFIG } from '../../core/config/app-config';
import { MeritListApi } from './merit-list.api';

const baseUrl = 'http://localhost:8080';

describe('MeritListApi', () => {
  let api: MeritListApi;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { apiBaseUrl: baseUrl } },
      ],
    });
    api = TestBed.inject(MeritListApi);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('generates a merit list at POST /api/v1/admission/merit-lists/{campaignId}/generate', () => {
    api.generate('campaign-1').subscribe();
    const req = httpMock.expectOne(`${baseUrl}/api/v1/admission/merit-lists/campaign-1/generate`);
    expect(req.request.method).toBe('POST');
    req.flush({ id: 'merit-1', campaignId: 'campaign-1', status: 'Draft', entries: [] });
  });

  it('reads a merit list at GET /api/v1/admission/merit-lists/by-campaign/{campaignId}', () => {
    api.getByCampaign('campaign-1').subscribe();
    const req = httpMock.expectOne(
      `${baseUrl}/api/v1/admission/merit-lists/by-campaign/campaign-1`,
    );
    expect(req.request.method).toBe('GET');
    req.flush({ id: 'merit-1', campaignId: 'campaign-1', status: 'Draft', entries: [] });
  });

  it('approves a merit list at POST /api/v1/admission/merit-lists/{id}/approve', () => {
    api.approve('merit-1').subscribe();
    const req = httpMock.expectOne(`${baseUrl}/api/v1/admission/merit-lists/merit-1/approve`);
    expect(req.request.method).toBe('POST');
    req.flush({ id: 'merit-1', campaignId: 'campaign-1', status: 'Approved', entries: [] });
  });
});
