import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { QueueStateService } from './queue-state.service';
import { QueueingRequiredError } from './queueing-required.error';
import { queueingInterceptor } from './queueing.interceptor';

describe('queueingInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let queueState: QueueStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([queueingInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    queueState = TestBed.inject(QueueStateService);
  });

  afterEach(() => httpMock.verify());

  it('reports queue state and throws QueueingRequiredError for a 429 with a queue-shaped body', async () => {
    const promise = firstValueFrom(httpClient.get('/api/v1/admission/results/search'));
    httpMock
      .expectOne('/api/v1/admission/results/search')
      .flush(
        { queued: true, queuePosition: 500, nextPollMs: 4000 },
        { status: 429, statusText: 'Too Many Requests' },
      );

    await expectAsync(promise).toBeRejectedWith(jasmine.any(QueueingRequiredError));
    expect(queueState.isQueued()).toBeTrue();
    expect(queueState.current()?.queuePosition).toBe(500);
  });

  it('leaves an unrelated 429 (no queue-shaped body) as an ordinary error', async () => {
    const promise = firstValueFrom(httpClient.get('/api/v1/identity/auth/login'));
    httpMock
      .expectOne('/api/v1/identity/auth/login')
      .flush({ message: 'slow down' }, { status: 429, statusText: 'Too Many Requests' });

    await expectAsync(promise).toBeRejected();
    expect(queueState.isQueued()).toBeFalse();
  });

  it('passes a successful response straight through untouched', async () => {
    const promise = firstValueFrom(httpClient.get('/api/v1/organization/faculties'));
    httpMock.expectOne('/api/v1/organization/faculties').flush({ items: [] });

    await expectAsync(promise).toBeResolvedTo({ items: [] });
    expect(queueState.isQueued()).toBeFalse();
  });
});
