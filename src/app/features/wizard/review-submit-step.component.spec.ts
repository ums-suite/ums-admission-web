import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { APP_CONFIG } from '../../core/config/app-config';
import { ReviewSubmitStepComponent } from './review-submit-step.component';
import { WizardDraftStore } from './wizard-draft.store';

const baseUrl = 'http://localhost:8080';

describe('ReviewSubmitStepComponent', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<ReviewSubmitStepComponent>>;
  let httpMock: HttpTestingController;
  let store: WizardDraftStore;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReviewSubmitStepComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
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
      programChoices: [{ programId: 'p1', rank: 1 }],
      documents: [],
      isApplicationFeePaid: false,
      isConfirmationFeePaid: false,
    });

    fixture = TestBed.createComponent(ReviewSubmitStepComponent);
    fixture.detectChanges();
  });

  afterEach(() => httpMock.verify());

  it('creates and opens the confirmation dialog only on explicit request', () => {
    const component = fixture.componentInstance;
    expect(component['confirmDialogOpen']()).toBeFalse();
    component['openConfirm']();
    expect(component['confirmDialogOpen']()).toBeTrue();
  });

  it('does not call the submit endpoint until the dialog is confirmed', () => {
    fixture.componentInstance['openConfirm']();
    httpMock.expectNone(`${baseUrl}/api/v1/admission/applications/app-1/submit`);
    expect(fixture.componentInstance['submitting']()).toBeFalse();
  });

  it('submits and locks the application once confirmed', () => {
    const component = fixture.componentInstance;
    component['openConfirm']();
    component['onConfirmed']();

    expect(component['confirmDialogOpen']()).toBeFalse();
    const req = httpMock.expectOne(`${baseUrl}/api/v1/admission/applications/app-1/submit`);
    req.flush({
      id: 'app-1',
      applicantId: 'applicant-1',
      campaignId: 'campaign-1',
      status: 'Locked',
      programChoices: [{ programId: 'p1', rank: 1 }],
      documents: [],
      isApplicationFeePaid: false,
      isConfirmationFeePaid: false,
    });

    expect(store.application()?.status).toBe('Locked');
  });

  it('surfaces a server error without leaving the application editable-looking again', () => {
    const component = fixture.componentInstance;
    component['openConfirm']();
    component['onConfirmed']();

    httpMock
      .expectOne(`${baseUrl}/api/v1/admission/applications/app-1/submit`)
      .flush({ title: 'already locked' }, { status: 409, statusText: 'Conflict' });

    expect(component['errorMessage']()).toBeTruthy();
    expect(component['submitting']()).toBeFalse();
  });
});
