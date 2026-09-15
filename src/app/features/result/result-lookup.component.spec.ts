import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { ResultLookupComponent } from './result-lookup.component';

describe('ResultLookupComponent', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<ResultLookupComponent>>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResultLookupComponent],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(ResultLookupComponent);
  });

  it('does not allow submission with an empty application number', () => {
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigate');

    fixture.componentInstance['submit']();

    expect(navigateSpy).not.toHaveBeenCalled();
    expect(fixture.componentInstance['submitted']()).toBeTrue();
  });

  it('navigates to the check screen with the application number as a query param', () => {
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigate');

    fixture.componentInstance['onApplicationNumberInput']('  APP-123  ');
    fixture.componentInstance['submit']();

    expect(navigateSpy).toHaveBeenCalledWith(['/app/result/check'], {
      queryParams: { applicationNumber: 'APP-123' },
    });
  });
});
