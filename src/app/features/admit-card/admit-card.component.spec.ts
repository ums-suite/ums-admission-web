import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { APP_CONFIG } from '../../core/config/app-config';
import { AdmitCardComponent } from './admit-card.component';

const baseUrl = 'http://localhost:8080';

describe('AdmitCardComponent', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<AdmitCardComponent>>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdmitCardComponent],
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
    fixture = TestBed.createComponent(AdmitCardComponent);
  });

  afterEach(() => httpMock.verify());

  it('shows not-available when no admit card document exists yet', () => {
    fixture.detectChanges();
    httpMock
      .expectOne(`${baseUrl}/api/v1/admission/tests/admit-card/app-1`)
      .flush({ rollNumber: null, admitCardDocumentId: null });

    expect(fixture.componentInstance['state']()).toBe('not-available');
  });

  it('shows preparing while the document exists but is not yet Ready', () => {
    fixture.detectChanges();
    httpMock
      .expectOne(`${baseUrl}/api/v1/admission/tests/admit-card/app-1`)
      .flush({ rollNumber: '12345', admitCardDocumentId: 'doc-1' });
    httpMock
      .expectOne(`${baseUrl}/api/v1/documents/doc-1`)
      .flush({ id: 'doc-1', status: 'Pending' });

    expect(fixture.componentInstance['state']()).toBe('preparing');
  });

  it('shows ready with the download action once the document is Ready', () => {
    fixture.detectChanges();
    httpMock
      .expectOne(`${baseUrl}/api/v1/admission/tests/admit-card/app-1`)
      .flush({ rollNumber: '12345', assignedTestSlotId: 'slot-1', admitCardDocumentId: 'doc-1' });
    httpMock.expectOne(`${baseUrl}/api/v1/documents/doc-1`).flush({
      id: 'doc-1',
      status: 'Ready',
      digitalVerificationId: 'verify-abc',
      downloadUrl: 'https://storage.example/admit-card.pdf',
    });

    expect(fixture.componentInstance['state']()).toBe('ready');
    expect(fixture.componentInstance['document']()?.downloadUrl).toBe(
      'https://storage.example/admit-card.pdf',
    );
  });

  it('shows failed when document generation failed', () => {
    fixture.detectChanges();
    httpMock
      .expectOne(`${baseUrl}/api/v1/admission/tests/admit-card/app-1`)
      .flush({ admitCardDocumentId: 'doc-1' });
    httpMock
      .expectOne(`${baseUrl}/api/v1/documents/doc-1`)
      .flush({ id: 'doc-1', status: 'Failed' });

    expect(fixture.componentInstance['state']()).toBe('failed');
  });

  it('opens the pre-signed download URL directly, never proxied through this app', () => {
    const openSpy = spyOn(window, 'open');
    fixture.componentInstance['openDownload']('https://storage.example/admit-card.pdf');
    expect(openSpy).toHaveBeenCalledWith(
      'https://storage.example/admit-card.pdf',
      '_blank',
      'noopener',
    );
  });
});
