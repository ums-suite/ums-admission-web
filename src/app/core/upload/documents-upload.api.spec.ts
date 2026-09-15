import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { APP_CONFIG } from '../config/app-config';
import { DocumentsUploadApi } from './documents-upload.api';

describe('DocumentsUploadApi', () => {
  let api: DocumentsUploadApi;
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
    api = TestBed.inject(DocumentsUploadApi);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('requests an upload URL at POST /api/v1/documents/uploads/', () => {
    api.requestUpload('owner-1', 'ApplicantPhoto', 'image/jpeg').subscribe();
    const req = httpMock.expectOne(`${baseUrl}/api/v1/documents/uploads/`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      ownerId: 'owner-1',
      artifactType: 'ApplicantPhoto',
      mimeType: 'image/jpeg',
    });
    req.flush({ id: 'artifact-1', status: 'PendingUpload' });
  });

  it('confirms an upload at POST /api/v1/documents/uploads/{id}/confirm', () => {
    api.confirmUpload('artifact-1').subscribe();
    const req = httpMock.expectOne(`${baseUrl}/api/v1/documents/uploads/artifact-1/confirm`);
    expect(req.request.method).toBe('POST');
    req.flush({ id: 'artifact-1', status: 'Ready' });
  });

  it('reads status at GET /api/v1/documents/uploads/{id}', () => {
    api.getUpload('artifact-1').subscribe();
    const req = httpMock.expectOne(`${baseUrl}/api/v1/documents/uploads/artifact-1`);
    expect(req.request.method).toBe('GET');
    req.flush({ id: 'artifact-1', status: 'Ready' });
  });
});
