import { TestBed } from '@angular/core/testing';
import { AuthenticatedPlaceholderComponent } from './authenticated-placeholder.component';

describe('AuthenticatedPlaceholderComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuthenticatedPlaceholderComponent],
    }).compileComponents();
  });

  it('creates', () => {
    const fixture = TestBed.createComponent(AuthenticatedPlaceholderComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
