import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { APP_CONFIG } from '../../core/config/app-config';
import { AdmissionTestApi } from './admission-test.api';
import type { AdmissionTestDto } from './admission-test.types';

describe('AdmissionTestApi', () => {
  let api: AdmissionTestApi;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        AdmissionTestApi,
        { provide: APP_CONFIG, useValue: { apiBaseUrl: 'http://localhost:8080' } },
      ],
    });
    api = TestBed.inject(AdmissionTestApi);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getByCampaign GETs the by-campaign route', () => {
    let result: AdmissionTestDto | undefined;
    api.getByCampaign('campaign-1').subscribe((r) => (result = r));

    const req = httpMock.expectOne(
      'http://localhost:8080/api/v1/admission/tests/by-campaign/campaign-1',
    );
    expect(req.request.method).toBe('GET');
    const dto: AdmissionTestDto = {
      id: 'test-1',
      campaignId: 'campaign-1',
      name: 'Admission Test',
      durationMinutes: 90,
      totalQuestionCount: 50,
      slotCount: 3,
    };
    req.flush(dto);

    expect(result).toEqual(dto);
  });
});
