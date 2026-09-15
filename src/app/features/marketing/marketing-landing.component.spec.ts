import { TestBed } from '@angular/core/testing';
import { LocaleService } from '@ums/shared';
import { MarketingLandingComponent } from './marketing-landing.component';

describe('MarketingLandingComponent', () => {
  beforeEach(async () => {
    // See core/i18n/translation.service.spec.ts -- LocaleService persists to real localStorage
    // across specs, so a prior spec's setLocale('bn') would otherwise leak into this one.
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [MarketingLandingComponent],
    }).compileComponents();
  });

  it('creates', () => {
    const fixture = TestBed.createComponent(MarketingLandingComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders the applicant portal heading in English by default', () => {
    const fixture = TestBed.createComponent(MarketingLandingComponent);
    fixture.detectChanges();
    const heading = (fixture.nativeElement as HTMLElement).querySelector('h1');
    expect(heading?.textContent).toContain('ums-admission-web');
  });

  it('re-renders the heading in Bengali once the locale switches, with no reload', () => {
    const fixture = TestBed.createComponent(MarketingLandingComponent);
    fixture.detectChanges();

    TestBed.inject(LocaleService).setLocale('bn');
    fixture.detectChanges();

    const heading = (fixture.nativeElement as HTMLElement).querySelector('h1');
    expect(heading?.textContent).toContain('ইউএমএস ভর্তি');
  });
});
