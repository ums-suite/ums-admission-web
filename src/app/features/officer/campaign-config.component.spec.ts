import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { APP_CONFIG } from '../../core/config/app-config';
import { CampaignConfigComponent } from './campaign-config.component';

const baseUrl = 'http://localhost:8080';

function baseCampaign(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'campaign-1',
    name: 'Fall 2026',
    programIds: ['p1'],
    applicationWindowStart: '2026-01-01',
    applicationWindowEnd: '2026-02-01',
    applicationFeeType: 'Standard',
    confirmationFeeType: 'Standard',
    isConfigurationLocked: false,
    requiredDocumentTypes: [],
    ...overrides,
  };
}

describe('CampaignConfigComponent', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<CampaignConfigComponent>>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CampaignConfigComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { apiBaseUrl: baseUrl } },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(CampaignConfigComponent);
  });

  afterEach(() => httpMock.verify());

  it('loads an existing campaign by id', () => {
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component['loadCampaignId'].set('campaign-1');
    component['loadCampaign']();

    httpMock.expectOne(`${baseUrl}/api/v1/admission/campaigns/campaign-1`).flush(baseCampaign());

    expect(component['campaign']()?.name).toBe('Fall 2026');
  });

  it('rejects creating a campaign with no name or program ids', () => {
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component['createCampaign']();

    httpMock.expectNone(`${baseUrl}/api/v1/admission/campaigns/`);
    expect(component['createError']()).toBeTruthy();
  });

  it('creates a campaign and stores the response', () => {
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component['name'].set('Fall 2026');
    component['programIdsInput'].set('p1, p2');
    component['createCampaign']();

    const req = httpMock.expectOne(`${baseUrl}/api/v1/admission/campaigns/`);
    expect(req.request.body.programIds).toEqual(['p1', 'p2']);
    req.flush(baseCampaign());

    expect(component['campaign']()?.id).toBe('campaign-1');
  });

  it('adds an eligibility rule and appends it to the locally-tracked list', () => {
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component['campaign'].set(baseCampaign() as never);
    component['ruleProgramId'].set('p1');
    component['ruleMinimumScore'].set('3.5');
    component['addEligibilityRule']();

    httpMock
      .expectOne(`${baseUrl}/api/v1/admission/campaigns/campaign-1/eligibility-rules`)
      .flush(baseCampaign());

    expect(component['addedRules']().length).toBe(1);
    expect(component['addedRules']()[0].programId).toBe('p1');
  });

  it('adds a seat quota and appends it to the locally-tracked list', () => {
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component['campaign'].set(baseCampaign() as never);
    component['quotaProgramId'].set('p1');
    component['quotaAmount'].set('100');
    component['addSeatQuota']();

    httpMock
      .expectOne(`${baseUrl}/api/v1/admission/campaigns/campaign-1/seat-quotas`)
      .flush(baseCampaign());

    expect(component['addedQuotas']().length).toBe(1);
    expect(component['addedQuotas']()[0].quota).toBe(100);
  });

  it('adds a required document type and refreshes the campaign', () => {
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component['campaign'].set(baseCampaign() as never);
    component['documentType'].set('Photo');
    component['addRequiredDocument']();

    httpMock
      .expectOne(`${baseUrl}/api/v1/admission/campaigns/campaign-1/required-documents`)
      .flush(baseCampaign({ requiredDocumentTypes: ['Photo'] }));

    expect(component['campaign']()?.requiredDocumentTypes).toEqual(['Photo']);
  });
});
