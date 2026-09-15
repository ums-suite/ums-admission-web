import {
  HttpClient,
  type HttpInterceptorFn,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { APP_CONFIG } from '../config/app-config';
import { DirectUploadService } from './direct-upload.service';
import type { DirectUploadProgress } from './upload.types';

const PRESIGNED_URL = 'https://object-storage.example/bucket/key?signature=abc';

/** Stands in for @ums/shared's authInterceptor for this spec, proving the bypass actually works. */
const fakeAuthInterceptor: HttpInterceptorFn = (req, next) =>
  next(req.clone({ setHeaders: { Authorization: 'Bearer should-never-leak' } }));

async function collect(source$: ReturnType<DirectUploadService['upload']>) {
  const events: DirectUploadProgress[] = [];
  await new Promise<void>((resolve, reject) => {
    source$.subscribe({
      next: (event) => events.push(event),
      error: reject,
      complete: resolve,
    });
  });
  return events;
}

describe('DirectUploadService', () => {
  let service: DirectUploadService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([fakeAuthInterceptor])),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { apiBaseUrl: 'http://localhost:8080' } },
      ],
    });
    service = TestBed.inject(DirectUploadService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('drives the full request-url -> upload -> confirm flow to a ready artifact', async () => {
    const file = new File(['hello'], 'photo.jpg', { type: 'image/jpeg' });
    const resultPromise = collect(service.upload(file, 'owner-1', 'ApplicantPhoto'));

    httpMock
      .expectOne('http://localhost:8080/api/v1/documents/uploads/')
      .flush({ id: 'artifact-1', status: 'PendingUpload', uploadUrl: PRESIGNED_URL });

    const putReq = httpMock.expectOne(PRESIGNED_URL);
    expect(putReq.request.method).toBe('PUT');
    // The whole point of AWEB-8's HttpBackend bypass: no leaked Authorization header.
    expect(putReq.request.headers.has('Authorization')).toBeFalse();
    putReq.flush({});

    httpMock
      .expectOne('http://localhost:8080/api/v1/documents/uploads/artifact-1/confirm')
      .flush({ id: 'artifact-1', status: 'Ready', downloadUrl: 'https://example/download' });

    const events = await resultPromise;
    expect(events.map((e) => e.stage)).toEqual([
      'requesting-url',
      'uploading',
      'confirming',
      'ready',
    ]);
    expect(events.at(-1)?.artifact?.status).toBe('Ready');
  });

  it('a normal (non-bypassed) app request through the same DI HttpClient DOES carry the auth header', () => {
    // Sanity check that the fake interceptor is actually wired for ordinary requests, so the
    // previous test's Authorization-header assertion is meaningful rather than accidentally
    // always-true (e.g. if the interceptor were mis-registered).
    const httpClient = TestBed.inject(HttpClient);
    httpClient.get('http://localhost:8080/api/v1/organization/faculties').subscribe();
    const req = httpMock.expectOne('http://localhost:8080/api/v1/organization/faculties');
    expect(req.request.headers.get('Authorization')).toBe('Bearer should-never-leak');
    req.flush({});
  });

  it('surfaces a specific message when the artifact fails verification', async () => {
    const file = new File(['hello'], 'photo.jpg', { type: 'image/jpeg' });
    const resultPromise = collect(service.upload(file, 'owner-1', 'ApplicantPhoto'));

    httpMock
      .expectOne('http://localhost:8080/api/v1/documents/uploads/')
      .flush({ id: 'artifact-1', status: 'PendingUpload', uploadUrl: PRESIGNED_URL });
    httpMock.expectOne(PRESIGNED_URL).flush({});
    httpMock
      .expectOne('http://localhost:8080/api/v1/documents/uploads/artifact-1/confirm')
      .flush({ id: 'artifact-1', status: 'Failed' });

    const events = await resultPromise;
    expect(events.at(-1)?.stage).toBe('failed');
    expect(events.at(-1)?.errorMessage).toContain('could not verify');
  });

  it('surfaces expired-link messaging on a 403 from the pre-signed URL', async () => {
    const file = new File(['hello'], 'photo.jpg', { type: 'image/jpeg' });
    const resultPromise = collect(service.upload(file, 'owner-1', 'ApplicantPhoto'));

    httpMock
      .expectOne('http://localhost:8080/api/v1/documents/uploads/')
      .flush({ id: 'artifact-1', status: 'PendingUpload', uploadUrl: PRESIGNED_URL });
    httpMock.expectOne(PRESIGNED_URL).flush({}, { status: 403, statusText: 'Forbidden' });

    const events = await resultPromise;
    expect(events.at(-1)?.stage).toBe('failed');
    expect(events.at(-1)?.errorMessage).toContain('expired');
  });

  it('surfaces a network-drop message on a status-0 failure', async () => {
    const file = new File(['hello'], 'photo.jpg', { type: 'image/jpeg' });
    const resultPromise = collect(service.upload(file, 'owner-1', 'ApplicantPhoto'));

    httpMock
      .expectOne('http://localhost:8080/api/v1/documents/uploads/')
      .flush({ id: 'artifact-1', status: 'PendingUpload', uploadUrl: PRESIGNED_URL });
    httpMock.expectOne(PRESIGNED_URL).error(new ProgressEvent('error'), { status: 0 });

    const events = await resultPromise;
    expect(events.at(-1)?.stage).toBe('failed');
    expect(events.at(-1)?.errorMessage).toContain('connection');
  });
});
