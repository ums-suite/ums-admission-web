import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { APP_CONFIG } from '../../core/config/app-config';
import { DocumentVerificationComponent } from './document-verification.component';

const baseUrl = 'http://localhost:8080';

function baseApplication(documents: unknown[]) {
  return {
    id: 'app-1',
    applicantId: 'applicant-1',
    campaignId: 'campaign-1',
    status: 'Confirmed',
    programChoices: [],
    documents,
    isApplicationFeePaid: true,
    isConfirmationFeePaid: true,
  };
}

describe('DocumentVerificationComponent', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<DocumentVerificationComponent>>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocumentVerificationComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { apiBaseUrl: baseUrl } },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ applicationId: 'app-1' }) } },
        },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(DocumentVerificationComponent);
  });

  afterEach(() => httpMock.verify());

  it('loads and summarizes document statuses', () => {
    fixture.detectChanges();
    httpMock.expectOne(`${baseUrl}/api/v1/admission/applications/app-1`).flush(
      baseApplication([
        { id: 'd1', documentType: 'Photo', fileReference: 'ref-1', status: 'Approved' },
        {
          id: 'd2',
          documentType: 'Transcript',
          fileReference: 'ref-2',
          status: 'Rejected',
          rejectionReason: 'Blurry scan',
        },
        { id: 'd3', documentType: 'Certificate', fileReference: 'ref-3', status: 'Pending' },
      ]),
    );

    const component = fixture.componentInstance;
    expect(component['state']()).toBe('ready');
    expect(component['approvedCount']()).toBe(1);
    expect(component['totalCount']()).toBe(3);
    expect(component['badgeVariant']('Rejected')).toBe('danger');
    expect(component['badgeVariant']('Approved')).toBe('success');
    expect(component['badgeVariant']('Pending')).toBe('warning');
  });

  it('goes to error state when the application fetch fails', () => {
    fixture.detectChanges();
    httpMock
      .expectOne(`${baseUrl}/api/v1/admission/applications/app-1`)
      .error(new ProgressEvent('error'));
    expect(fixture.componentInstance['state']()).toBe('error');
  });
});

describe('DocumentVerificationComponent with no applicationId in the route', () => {
  it('goes straight to the error state', async () => {
    await TestBed.configureTestingModule({
      imports: [DocumentVerificationComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { apiBaseUrl: baseUrl } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({}) } } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(DocumentVerificationComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance['state']()).toBe('error');
  });
});
