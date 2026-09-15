import { HttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of, throwError } from 'rxjs';
import { APP_CONFIG } from '../config/app-config';
import { ProvisionalModuleApiBase } from './provisional-module-api.base';
import { QueueingRequiredError } from './queueing-required.error';

@Injectable()
class FakeAdmissionApi extends ProvisionalModuleApiBase {
  ping() {
    return this.http.get(this.apiUrl('admission/ping'));
  }

  fails() {
    return this.normalizeErrors(throwError(() => new Error('boom')));
  }

  succeeds() {
    return this.normalizeErrors(of('ok'));
  }

  queued() {
    return this.normalizeErrors(
      throwError(
        () =>
          new QueueingRequiredError({
            queued: true,
            nextPollMs: 5000,
            intervalIsServerSuggested: false,
          }),
      ),
    );
  }
}

describe('ProvisionalModuleApiBase', () => {
  let api: FakeAdmissionApi;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { apiBaseUrl: 'http://localhost:8080' } },
        FakeAdmissionApi,
      ],
    });
    TestBed.inject(HttpClient);
    api = TestBed.inject(FakeAdmissionApi);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('builds URLs as {baseUrl}/api/v1/{path}, matching the generated client convention', () => {
    api.ping().subscribe();
    const req = httpMock.expectOne('http://localhost:8080/api/v1/admission/ping');
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('normalizes a failure through toUmsApiError', async () => {
    await expectAsync(firstValueFrom(api.fails())).toBeRejectedWith(
      jasmine.objectContaining({ status: 0, message: 'boom' }),
    );
  });

  it('passes a successful value through unchanged', async () => {
    await expectAsync(firstValueFrom(api.succeeds())).toBeResolvedTo('ok');
  });

  it('re-throws a QueueingRequiredError unchanged rather than flattening it through toUmsApiError', async () => {
    await expectAsync(firstValueFrom(api.queued())).toBeRejectedWith(
      jasmine.any(QueueingRequiredError),
    );
  });
});
