import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { APP_CONFIG } from '../../core/config/app-config';
import { ApplicationApi } from './application.api';

describe('ApplicationApi', () => {
  let api: ApplicationApi;
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
    api = TestBed.inject(ApplicationApi);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('creates a draft application at POST /api/v1/admission/applications/', () => {
    api.createApplication('campaign-1').subscribe();
    const req = httpMock.expectOne(`${baseUrl}/api/v1/admission/applications/`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ campaignId: 'campaign-1' });
    req.flush({ id: 'app-1', status: 'Draft' });
  });

  it('reads an application at GET /api/v1/admission/applications/{id}', () => {
    api.getApplication('app-1').subscribe();
    const req = httpMock.expectOne(`${baseUrl}/api/v1/admission/applications/app-1`);
    expect(req.request.method).toBe('GET');
    req.flush({ id: 'app-1', status: 'Draft' });
  });

  it('replaces program choices at PUT /api/v1/admission/applications/{id}', () => {
    api
      .setProgramChoices('app-1', [
        { programId: 'p1', rank: 1 },
        { programId: 'p2', rank: 2 },
      ])
      .subscribe();
    const req = httpMock.expectOne(`${baseUrl}/api/v1/admission/applications/app-1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual([
      { programId: 'p1', rank: 1 },
      { programId: 'p2', rank: 2 },
    ]);
    req.flush({ id: 'app-1', status: 'Draft' });
  });

  it('registers an uploaded document at POST /api/v1/admission/applications/{id}/documents', () => {
    api.uploadDocument('app-1', { documentType: 'Photo', fileReference: 'artifact-1' }).subscribe();
    const req = httpMock.expectOne(`${baseUrl}/api/v1/admission/applications/app-1/documents`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ documentType: 'Photo', fileReference: 'artifact-1' });
    req.flush({ id: 'app-1', status: 'Draft' });
  });

  it('submits (locks) an application at POST /api/v1/admission/applications/{id}/submit', () => {
    api.submitApplication('app-1').subscribe();
    const req = httpMock.expectOne(`${baseUrl}/api/v1/admission/applications/app-1/submit`);
    expect(req.request.method).toBe('POST');
    req.flush({ id: 'app-1', status: 'Locked' });
  });

  it('reads a campaign at GET /api/v1/admission/campaigns/{id}', () => {
    api.getCampaign('campaign-1').subscribe();
    const req = httpMock.expectOne(`${baseUrl}/api/v1/admission/campaigns/campaign-1`);
    expect(req.request.method).toBe('GET');
    req.flush({ id: 'campaign-1', name: 'Fall 2026' });
  });

  it('adds an academic record at POST /api/v1/admission/applicants/{id}/academic-records', () => {
    api
      .addAcademicRecord('applicant-1', {
        board: 'Dhaka',
        examName: 'HSC',
        passingYear: 2024,
        score: 5,
        isGpaScale: true,
      })
      .subscribe();
    const req = httpMock.expectOne(
      `${baseUrl}/api/v1/admission/applicants/applicant-1/academic-records`,
    );
    expect(req.request.method).toBe('POST');
    req.flush(null);
  });

  it('confirms an application (seat confirmation) at POST /api/v1/admission/applications/{id}/confirm', () => {
    api.confirmApplication('app-1').subscribe();
    const req = httpMock.expectOne(`${baseUrl}/api/v1/admission/applications/app-1/confirm`);
    expect(req.request.method).toBe('POST');
    req.flush({ application: { id: 'app-1', status: 'Locked' }, confirmed: false });
  });
});
