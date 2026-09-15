import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { APP_CONFIG } from '../../core/config/app-config';
import { DirectUploadService } from '../../core/upload/direct-upload.service';
import { DocumentUploadStepComponent } from './document-upload-step.component';
import { WizardDraftStore } from './wizard-draft.store';

const baseUrl = 'http://localhost:8080';

function fileListOf(file: File): FileList {
  return { item: () => file, length: 1, [0]: file } as unknown as FileList;
}

describe('DocumentUploadStepComponent', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<DocumentUploadStepComponent>>;
  let httpMock: HttpTestingController;
  let store: WizardDraftStore;
  let directUploadSpy: jasmine.SpyObj<DirectUploadService>;

  beforeEach(async () => {
    directUploadSpy = jasmine.createSpyObj('DirectUploadService', ['upload']);

    await TestBed.configureTestingModule({
      imports: [DocumentUploadStepComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { apiBaseUrl: baseUrl } },
        { provide: DirectUploadService, useValue: directUploadSpy },
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
    store['campaignInternal'].set({
      id: 'campaign-1',
      name: 'Fall 2026',
      programIds: [],
      applicationWindowStart: '2026-01-01',
      applicationWindowEnd: '2099-01-01',
      applicationFeeType: 'Standard',
      confirmationFeeType: 'Standard',
      isConfigurationLocked: false,
      requiredDocumentTypes: ['Photo'],
    });

    fixture = TestBed.createComponent(DocumentUploadStepComponent);
    fixture.detectChanges();
  });

  afterEach(() => httpMock.verify());

  it('creates and shows the campaign required document types', () => {
    expect(fixture.componentInstance).toBeTruthy();
    expect(fixture.componentInstance['requiredTypes']()).toEqual(['Photo']);
  });

  it('registers a successfully-uploaded artifact against the application', () => {
    directUploadSpy.upload.and.returnValue(
      of({
        stage: 'ready',
        artifact: {
          id: 'artifact-1',
          ownerId: 'applicant-1',
          artifactType: 'Photo',
          mimeType: 'image/png',
          status: 'Ready',
          requestedAt: '2026-01-01',
        },
      }),
    );
    const file = new File(['x'], 'photo.png', { type: 'image/png' });

    fixture.componentInstance['onFilesSelected']('Photo', fileListOf(file));

    const req = httpMock.expectOne(`${baseUrl}/api/v1/admission/applications/app-1/documents`);
    expect(req.request.body).toEqual({ documentType: 'Photo', fileReference: 'artifact-1' });
    req.flush({
      id: 'app-1',
      applicantId: 'applicant-1',
      campaignId: 'campaign-1',
      status: 'Draft',
      programChoices: [],
      documents: [
        { id: 'artifact-1', documentType: 'Photo', fileReference: 'artifact-1', status: 'Pending' },
      ],
      isApplicationFeePaid: false,
      isConfirmationFeePaid: false,
    });

    expect(fixture.componentInstance.filesFor('Photo')[0].status).toBe('success');
  });

  it('shows a specific, actionable error when the upload fails', () => {
    directUploadSpy.upload.and.returnValue(
      of({ stage: 'failed', errorMessage: 'Your upload link expired.' }),
    );
    const file = new File(['x'], 'photo.png', { type: 'image/png' });

    fixture.componentInstance['onFilesSelected']('Photo', fileListOf(file));

    const state = fixture.componentInstance.filesFor('Photo')[0];
    expect(state.status).toBe('error');
    expect(state.errorMessage).toBe('Your upload link expired.');
  });

  it('allows retrying after a failure, clearing the error state', () => {
    directUploadSpy.upload.and.returnValue(of({ stage: 'failed', errorMessage: 'failed' }));
    const file = new File(['x'], 'photo.png', { type: 'image/png' });
    fixture.componentInstance['onFilesSelected']('Photo', fileListOf(file));

    fixture.componentInstance['retry']('Photo');

    expect(fixture.componentInstance.filesFor('Photo')).toEqual([]);
  });
});
