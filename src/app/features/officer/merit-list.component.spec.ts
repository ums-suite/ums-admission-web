import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { APP_CONFIG } from '../../core/config/app-config';
import { MeritListComponent } from './merit-list.component';

const baseUrl = 'http://localhost:8080';

function draftMeritList() {
  return {
    id: 'merit-1',
    campaignId: 'campaign-1',
    status: 'Draft',
    entries: [
      {
        applicantId: 'applicant-1',
        applicationId: 'app-1',
        programId: 'p1',
        score: 90,
        rank: 1,
        outcome: 'Admitted',
      },
    ],
  };
}

describe('MeritListComponent', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<MeritListComponent>>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MeritListComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { apiBaseUrl: baseUrl } },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ campaignId: 'campaign-1' }) } },
        },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(MeritListComponent);
  });

  afterEach(() => httpMock.verify());

  it('shows not-found when no merit list exists yet for the campaign', () => {
    fixture.detectChanges();
    httpMock
      .expectOne(`${baseUrl}/api/v1/admission/merit-lists/by-campaign/campaign-1`)
      .flush({ code: 'meritlist.not_found' }, { status: 404, statusText: 'Not Found' });

    expect(fixture.componentInstance['state']()).toBe('not-found');
  });

  it('generates a merit list from the not-found state', () => {
    fixture.detectChanges();
    httpMock
      .expectOne(`${baseUrl}/api/v1/admission/merit-lists/by-campaign/campaign-1`)
      .flush({ code: 'meritlist.not_found' }, { status: 404, statusText: 'Not Found' });

    fixture.componentInstance['generate']();
    httpMock
      .expectOne(`${baseUrl}/api/v1/admission/merit-lists/campaign-1/generate`)
      .flush(draftMeritList());

    expect(fixture.componentInstance['state']()).toBe('ready');
    expect(fixture.componentInstance['meritList']()?.entries.length).toBe(1);
  });

  it('loads an existing draft merit list and renders its entries', () => {
    fixture.detectChanges();
    httpMock
      .expectOne(`${baseUrl}/api/v1/admission/merit-lists/by-campaign/campaign-1`)
      .flush(draftMeritList());

    expect(fixture.componentInstance['state']()).toBe('ready');
    expect(fixture.componentInstance['meritList']()?.status).toBe('Draft');
  });

  it('requires the acknowledgment checkbox before approval is confirmed', () => {
    fixture.detectChanges();
    httpMock
      .expectOne(`${baseUrl}/api/v1/admission/merit-lists/by-campaign/campaign-1`)
      .flush(draftMeritList());

    const component = fixture.componentInstance;
    component['openConfirmApprove']();
    expect(component['confirmApproveOpen']()).toBeTrue();

    component['confirmApprove'](); // not acknowledged -- must be a no-op
    httpMock.expectNone(`${baseUrl}/api/v1/admission/merit-lists/merit-1/approve`);

    component['confirmAcknowledged'].set(true);
    component['confirmApprove']();

    httpMock
      .expectOne(`${baseUrl}/api/v1/admission/merit-lists/merit-1/approve`)
      .flush({ ...draftMeritList(), status: 'Approved' });

    expect(component['meritList']()?.status).toBe('Approved');
    expect(component['confirmApproveOpen']()).toBeFalse();
  });
});
