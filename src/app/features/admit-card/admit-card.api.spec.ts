import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { APP_CONFIG } from '../../core/config/app-config';
import { AdmitCardApi } from './admit-card.api';

describe('AdmitCardApi', () => {
  let api: AdmitCardApi;
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
    api = TestBed.inject(AdmitCardApi);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('reads availability at GET /api/v1/admission/tests/admit-card/{applicationId}', () => {
    api.getAvailability('app-1').subscribe();
    const req = httpMock.expectOne(`${baseUrl}/api/v1/admission/tests/admit-card/app-1`);
    expect(req.request.method).toBe('GET');
    req.flush({ rollNumber: '12345', admitCardDocumentId: 'doc-1' });
  });

  it('reads a generated document at GET /api/v1/documents/{id}', () => {
    api.getDocument('doc-1').subscribe();
    const req = httpMock.expectOne(`${baseUrl}/api/v1/documents/doc-1`);
    expect(req.request.method).toBe('GET');
    req.flush({ id: 'doc-1', status: 'Ready' });
  });
});
