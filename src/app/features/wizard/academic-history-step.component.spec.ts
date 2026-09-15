import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { APP_CONFIG } from '../../core/config/app-config';
import { AcademicHistoryStepComponent } from './academic-history-step.component';
import { WizardDraftStore } from './wizard-draft.store';

const baseUrl = 'http://localhost:8080';

describe('AcademicHistoryStepComponent', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<AcademicHistoryStepComponent>>;
  let httpMock: HttpTestingController;
  let store: WizardDraftStore;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AcademicHistoryStepComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { apiBaseUrl: baseUrl } },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    store = TestBed.inject(WizardDraftStore);
    store.setApplication({
      id: 'app-1',
      applicantId: 'applicant-1',
      campaignId: 'campaign-1',
      status: 'Draft',
      programChoices: [],
      documents: [],
      isApplicationFeePaid: false,
      isConfirmationFeePaid: false,
    });

    fixture = TestBed.createComponent(AcademicHistoryStepComponent);
    fixture.detectChanges();
  });

  afterEach(() => httpMock.verify());

  it('creates', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('does not allow adding an incomplete record', () => {
    const component = fixture.componentInstance;
    component['examName'].set('SSC');
    expect(component['canAddRecord']).toBeFalse();
  });

  it('adds a complete record to the local list and clears the entry fields', () => {
    const component = fixture.componentInstance;
    component['examName'].set('SSC');
    component['board'].set('Dhaka');
    component['passingYear'].set('2022');
    component['score'].set('5');
    component['addRecord']();

    expect(component['records']()).toEqual([
      { examName: 'SSC', board: 'Dhaka', passingYear: 2022, score: 5, isGpaScale: true },
    ]);
    expect(component['examName']()).toBe('');
  });

  it('requires at least one record before submitting', () => {
    fixture.componentInstance['onSubmit']();
    expect(fixture.componentInstance['errorMessage']()).toBeTruthy();
    httpMock.expectNone(`${baseUrl}/api/v1/admission/applicants/applicant-1/academic-records`);
  });

  it('submits every added record sequentially and emits (next) once all succeed', () => {
    const component = fixture.componentInstance;
    let advanced = false;
    component.next.subscribe(() => (advanced = true));

    component['examName'].set('SSC');
    component['board'].set('Dhaka');
    component['passingYear'].set('2022');
    component['score'].set('5');
    component['addRecord']();
    component['examName'].set('HSC');
    component['board'].set('Dhaka');
    component['passingYear'].set('2024');
    component['score'].set('5');
    component['addRecord']();

    component['onSubmit']();

    httpMock
      .expectOne(`${baseUrl}/api/v1/admission/applicants/applicant-1/academic-records`)
      .flush(null);
    httpMock
      .expectOne(`${baseUrl}/api/v1/admission/applicants/applicant-1/academic-records`)
      .flush(null);

    expect(advanced).toBeTrue();
    expect(component['submitting']()).toBeFalse();
  });
});
