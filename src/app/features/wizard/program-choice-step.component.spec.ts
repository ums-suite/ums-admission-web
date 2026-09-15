import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { OrganizationApiService } from '@ums/shared';
import { of } from 'rxjs';
import { APP_CONFIG } from '../../core/config/app-config';
import { ProgramChoiceStepComponent } from './program-choice-step.component';
import { WizardDraftStore } from './wizard-draft.store';

const baseUrl = 'http://localhost:8080';

describe('ProgramChoiceStepComponent', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<ProgramChoiceStepComponent>>;
  let httpMock: HttpTestingController;
  let store: WizardDraftStore;

  beforeEach(async () => {
    localStorage.clear();
    const organizationApiSpy = jasmine.createSpyObj('OrganizationApiService', [
      'apiV1OrganizationProgramsGet',
    ]);
    organizationApiSpy.apiV1OrganizationProgramsGet.and.returnValue(
      of([
        { id: 'p1', name: 'CSE' },
        { id: 'p2', name: 'EEE' },
      ]),
    );

    await TestBed.configureTestingModule({
      imports: [ProgramChoiceStepComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { apiBaseUrl: baseUrl } },
        { provide: OrganizationApiService, useValue: organizationApiSpy },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    store = TestBed.inject(WizardDraftStore);
    store.initialize('campaign-1');
    httpMock.expectOne(`${baseUrl}/api/v1/admission/campaigns/campaign-1`).flush({
      id: 'campaign-1',
      name: 'Fall 2026',
      programIds: ['p1', 'p2'],
      applicationWindowStart: '2026-01-01',
      applicationWindowEnd: '2099-01-01',
      applicationFeeType: 'Standard',
      confirmationFeeType: 'Standard',
      isConfigurationLocked: false,
      requiredDocumentTypes: [],
    });
    httpMock.expectOne(`${baseUrl}/api/v1/admission/applications/`).flush({
      id: 'app-1',
      applicantId: 'applicant-1',
      campaignId: 'campaign-1',
      status: 'Draft',
      programChoices: [],
      documents: [],
      isApplicationFeePaid: false,
      isConfirmationFeePaid: false,
    });

    fixture = TestBed.createComponent(ProgramChoiceStepComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('creates and lists only the campaign-offered programs as available options', () => {
    expect(fixture.componentInstance).toBeTruthy();
    expect(fixture.componentInstance['availableOptions']()).toEqual([
      { value: 'p1', label: 'CSE' },
      { value: 'p2', label: 'EEE' },
    ]);
  });

  it('adds a program choice and assigns it the next rank', () => {
    const component = fixture.componentInstance;
    component['pendingProgramId'].set('p1');
    component['addChoice']();

    expect(component['orderedChoices']()).toEqual([
      {
        rank: 1,
        program: { id: 'p1', name: 'CSE', departmentId: undefined },
        programId: 'p1',
        eligibilityWarning: null,
      },
    ]);
  });

  it('reorders choices with moveUp/moveDown', () => {
    const component = fixture.componentInstance;
    component['selectedProgramIds'].set(['p1', 'p2']);
    component['moveDown'](0);
    expect(component['selectedProgramIds']()).toEqual(['p2', 'p1']);
    component['moveUp'](1);
    expect(component['selectedProgramIds']()).toEqual(['p1', 'p2']);
  });

  it('shows an error and does not call the API when submitting with no choices', () => {
    fixture.componentInstance['onSubmit']();
    expect(fixture.componentInstance['errorMessage']()).toBeTruthy();
    httpMock.expectNone(`${baseUrl}/api/v1/admission/applications/app-1`);
  });

  it('saves the ordered choices and emits (next) on success', () => {
    const component = fixture.componentInstance;
    let advanced = false;
    component.next.subscribe(() => (advanced = true));
    component['selectedProgramIds'].set(['p2', 'p1']);

    component['onSubmit']();

    const req = httpMock.expectOne(`${baseUrl}/api/v1/admission/applications/app-1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual([
      { programId: 'p2', rank: 1 },
      { programId: 'p1', rank: 2 },
    ]);
    req.flush({
      id: 'app-1',
      applicantId: 'applicant-1',
      campaignId: 'campaign-1',
      status: 'Draft',
      programChoices: [
        { programId: 'p2', rank: 1 },
        { programId: 'p1', rank: 2 },
      ],
      documents: [],
      isApplicationFeePaid: false,
      isConfirmationFeePaid: false,
    });

    expect(advanced).toBeTrue();
  });
});
