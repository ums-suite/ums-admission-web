import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { APP_CONFIG } from '../../core/config/app-config';
import { queueingInterceptor } from '../../core/http/queueing.interceptor';
import { ResultCheckComponent } from './result-check.component';

const baseUrl = 'http://localhost:8080';
const searchUrl = `${baseUrl}/api/v1/admission/results/search?applicationNumber=APP-1`;

function makeRoute(queryParams: Record<string, string>) {
  return {
    provide: ActivatedRoute,
    useValue: { snapshot: { queryParamMap: convertToParamMap(queryParams) } },
  };
}

describe('ResultCheckComponent', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<ResultCheckComponent>>;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    jasmine.clock().install();
  });

  afterEach(() => {
    jasmine.clock().uninstall();
  });

  describe('with an applicationNumber query param', () => {
    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [ResultCheckComponent],
        providers: [
          provideHttpClient(withInterceptors([queueingInterceptor])),
          provideHttpClientTesting(),
          { provide: APP_CONFIG, useValue: { apiBaseUrl: baseUrl } },
          makeRoute({ applicationNumber: 'APP-1' }),
        ],
      }).compileComponents();

      httpMock = TestBed.inject(HttpTestingController);
      fixture = TestBed.createComponent(ResultCheckComponent);
    });

    afterEach(() => httpMock.verify());

    function settle(): void {
      fixture.detectChanges(); // ngOnInit -- constructs the election
      jasmine.clock().tick(200); // past the leader-election settle delay
      fixture.detectChanges(); // flush the effect that starts the real check
    }

    it('starts in the checking state before settling', () => {
      fixture.detectChanges();
      expect(fixture.componentInstance['effectiveState']()).toBe('checking');
    });

    it('reveals a well-formed Admitted result', () => {
      settle();
      httpMock
        .expectOne(searchUrl)
        .flush({ applicantId: 'a1', applicationId: 'app1', programId: 'p1', outcome: 'Admitted' });

      expect(fixture.componentInstance['effectiveState']()).toBe('published');
      expect(fixture.componentInstance['effectiveResult']()?.outcome).toBe('Admitted');
    });

    it('treats a 404 as not-published (Domain Invariant #5)', () => {
      settle();
      httpMock
        .expectOne(searchUrl)
        .flush({ code: 'result.not_found' }, { status: 404, statusText: 'Not Found' });

      expect(fixture.componentInstance['effectiveState']()).toBe('not-published');
    });

    it('treats a malformed 200 body as not-published, never a partial reveal', () => {
      settle();
      httpMock.expectOne(searchUrl).flush({ unexpected: 'shape' });

      expect(fixture.componentInstance['effectiveState']()).toBe('not-published');
    });

    it('treats an unrelated server error as the generic error state', () => {
      settle();
      httpMock
        .expectOne(searchUrl)
        .flush({ code: 'server.error' }, { status: 500, statusText: 'Server Error' });

      expect(fixture.componentInstance['effectiveState']()).toBe('error');
    });

    it('enters the queued state on a 429 queue-status response and auto-retries at the suggested interval', () => {
      settle();
      httpMock
        .expectOne(searchUrl)
        .flush(
          { queued: true, queuePosition: 42, nextPollMs: 3000 },
          { status: 429, statusText: 'Too Many Requests' },
        );

      expect(fixture.componentInstance['effectiveState']()).toBe('queued');

      jasmine.clock().tick(3000);
      httpMock
        .expectOne(searchUrl)
        .flush({ applicantId: 'a1', applicationId: 'app1', programId: 'p1', outcome: 'Rejected' });

      expect(fixture.componentInstance['effectiveState']()).toBe('published');
    });

    it('checkAgain issues a fresh request from the not-published state', () => {
      settle();
      httpMock
        .expectOne(searchUrl)
        .flush({ code: 'result.not_found' }, { status: 404, statusText: 'Not Found' });
      expect(fixture.componentInstance['effectiveState']()).toBe('not-published');

      fixture.componentInstance['checkAgain']();
      httpMock.expectOne(searchUrl).flush({
        applicantId: 'a1',
        applicationId: 'app1',
        programId: 'p1',
        outcome: 'Waitlisted',
      });

      expect(fixture.componentInstance['effectiveState']()).toBe('published');
    });
  });

  describe('with no applicationNumber query param', () => {
    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [ResultCheckComponent],
        providers: [
          provideHttpClient(withInterceptors([queueingInterceptor])),
          provideHttpClientTesting(),
          { provide: APP_CONFIG, useValue: { apiBaseUrl: baseUrl } },
          makeRoute({}),
        ],
      }).compileComponents();
      fixture = TestBed.createComponent(ResultCheckComponent);
    });

    it('goes straight to the error state', () => {
      fixture.detectChanges();
      expect(fixture.componentInstance['effectiveState']()).toBe('error');
    });
  });
});
