import { TestBed } from '@angular/core/testing';
import { MarketingLandingComponent } from './marketing-landing.component';

describe('MarketingLandingComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MarketingLandingComponent],
    }).compileComponents();
  });

  it('creates', () => {
    const fixture = TestBed.createComponent(MarketingLandingComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders the applicant portal heading', () => {
    const fixture = TestBed.createComponent(MarketingLandingComponent);
    fixture.detectChanges();
    const heading = (fixture.nativeElement as HTMLElement).querySelector('h1');
    expect(heading?.textContent).toContain('ums-admission-web');
  });
});
