import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { APP_CONFIG } from '../../core/config/app-config';
import { QuestionBankComponent } from './question-bank.component';

const baseUrl = 'http://localhost:8080';

function baseTest(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'test-1',
    campaignId: 'campaign-1',
    name: 'Fall 2026 Entrance Test',
    durationMinutes: 120,
    totalQuestionCount: 0,
    slotCount: 0,
    ...overrides,
  };
}

describe('QuestionBankComponent', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<QuestionBankComponent>>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuestionBankComponent],
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
    fixture = TestBed.createComponent(QuestionBankComponent);
  });

  afterEach(() => httpMock.verify());

  it('loads an existing test for the campaign, if one exists', () => {
    fixture.detectChanges();
    httpMock
      .expectOne(`${baseUrl}/api/v1/admission/tests/by-campaign/campaign-1`)
      .flush(baseTest());

    expect(fixture.componentInstance['test']()?.id).toBe('test-1');
  });

  it('silently shows the create-test form when no test exists yet (404)', () => {
    fixture.detectChanges();
    httpMock
      .expectOne(`${baseUrl}/api/v1/admission/tests/by-campaign/campaign-1`)
      .flush({ code: 'test.not_found' }, { status: 404, statusText: 'Not Found' });

    expect(fixture.componentInstance['test']()).toBeNull();
  });

  it('creates a test for the campaign', () => {
    fixture.detectChanges();
    httpMock
      .expectOne(`${baseUrl}/api/v1/admission/tests/by-campaign/campaign-1`)
      .flush({ code: 'test.not_found' }, { status: 404, statusText: 'Not Found' });

    const component = fixture.componentInstance;
    component['testName'].set('Fall 2026 Entrance Test');
    component['durationMinutes'].set('120');
    component['createTest']();

    httpMock.expectOne(`${baseUrl}/api/v1/admission/tests/`).flush(baseTest());
    expect(component['test']()?.id).toBe('test-1');
  });

  it('adds a question, incrementing the locally-tracked count', () => {
    fixture.detectChanges();
    httpMock
      .expectOne(`${baseUrl}/api/v1/admission/tests/by-campaign/campaign-1`)
      .flush(baseTest());

    const component = fixture.componentInstance;
    component['questionCategory'].set('Math');
    component['questionText'].set('What is 2 + 2?');
    component['questionOptionsInput'].set('3, 4');
    component['questionMaxScore'].set('1');
    component['addQuestion']();

    httpMock
      .expectOne(`${baseUrl}/api/v1/admission/tests/test-1/questions`)
      .flush(baseTest({ totalQuestionCount: 1 }));

    expect(component['addedQuestionCount']()).toBe(1);
  });

  it('adds a selection rule', () => {
    fixture.detectChanges();
    httpMock
      .expectOne(`${baseUrl}/api/v1/admission/tests/by-campaign/campaign-1`)
      .flush(baseTest());

    const component = fixture.componentInstance;
    component['ruleCount'].set('10');
    component['addSelectionRule']();

    httpMock
      .expectOne(`${baseUrl}/api/v1/admission/tests/test-1/selection-rules`)
      .flush(baseTest());
    expect(fixture.componentInstance['test']()).toBeTruthy();
  });

  it('adds a test slot', () => {
    fixture.detectChanges();
    httpMock
      .expectOne(`${baseUrl}/api/v1/admission/tests/by-campaign/campaign-1`)
      .flush(baseTest());

    const component = fixture.componentInstance;
    component['slotStartAt'].set('2026-06-01T09:00:00Z');
    component['slotEndAt'].set('2026-06-01T11:00:00Z');
    component['slotCapacity'].set('500');
    component['addSlot']();

    httpMock
      .expectOne(`${baseUrl}/api/v1/admission/tests/test-1/slots`)
      .flush(baseTest({ slotCount: 1 }));

    expect(component['test']()?.slotCount).toBe(1);
  });
});
