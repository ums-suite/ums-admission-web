import { ActivatedRoute } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { FeaturePlaceholderComponent } from './feature-placeholder.component';

describe('FeaturePlaceholderComponent', () => {
  function createWith(data: Record<string, unknown>) {
    TestBed.configureTestingModule({
      imports: [FeaturePlaceholderComponent],
      providers: [{ provide: ActivatedRoute, useValue: { data: of(data) } }],
    });
    const fixture = TestBed.createComponent(FeaturePlaceholderComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('renders the route data label', () => {
    const fixture = createWith({ label: 'Application Wizard' });
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Application Wizard');
  });

  it('falls back to a generic label when the route carries none', () => {
    const fixture = createWith({});
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('This section');
  });
});
