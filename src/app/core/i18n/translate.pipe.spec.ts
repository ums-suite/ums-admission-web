import { TestBed } from '@angular/core/testing';
import { LocaleService } from '@ums/shared';
import { TranslatePipe } from './translate.pipe';

describe('TranslatePipe', () => {
  let pipe: TranslatePipe;
  let localeService: LocaleService;

  beforeEach(() => {
    // See translation.service.spec.ts -- LocaleService persists to real localStorage across specs.
    localStorage.clear();
    TestBed.configureTestingModule({});
    pipe = TestBed.runInInjectionContext(() => new TranslatePipe());
    localeService = TestBed.inject(LocaleService);
  });

  it('transforms a key to its English translation by default', () => {
    expect(pipe.transform('marketing.appName')).toBe('ums-admission-web');
  });

  it('reflects a live locale change (impure pipe, no page reload)', () => {
    localeService.setLocale('bn');
    expect(pipe.transform('marketing.appName')).toBe('ইউএমএস ভর্তি');
  });

  it('passes interpolation params through', () => {
    expect(pipe.transform('common.stepProgress', { current: 1, total: 3 })).toBe('Step 1 of 3');
  });
});
