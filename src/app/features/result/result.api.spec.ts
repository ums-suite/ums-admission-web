import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { APP_CONFIG } from '../../core/config/app-config';
import { ResultApi } from './result.api';

const baseUrl = 'http://localhost:8080';

describe('ResultApi', () => {
  let api: ResultApi;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { apiBaseUrl: baseUrl } },
        ResultApi,
      ],
    });
    api = TestBed.inject(ResultApi);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('searches by applicationNumber query param', async () => {
    const promise = firstValueFrom(api.searchByApplicationNumber('APP-1'));
    const req = httpMock.expectOne(
      `${baseUrl}/api/v1/admission/results/search?applicationNumber=APP-1`,
    );
    req.flush({ applicantId: 'a1', applicationId: 'app1', programId: 'p1', outcome: 'Admitted' });
    await expectAsync(promise).toBeResolved();
  });

  it('searches by examId + rollNumber query params', async () => {
    const promise = firstValueFrom(api.searchByRollNumber('exam-1', '12345'));
    const req = httpMock.expectOne(
      `${baseUrl}/api/v1/admission/results/search?examId=exam-1&rollNumber=12345`,
    );
    req.flush({});
    await expectAsync(promise).toBeResolved();
  });
});
