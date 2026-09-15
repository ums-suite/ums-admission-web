import type { TranslationDictionary } from '../translation-dictionary.types';

/**
 * Bengali UI-string dictionary (ADR-0011, `ums-requirements.md` §4.1). Any key not yet
 * translated here is intentionally omitted rather than duplicated with English text --
 * `TranslationService` falls back to `en.ts` for a missing key, matching the server-side
 * translation-table fallback convention (ums-conventions.md "Localization Implementation").
 */
export const BN_TRANSLATIONS: TranslationDictionary = {
  'marketing.appName': 'ইউএমএস ভর্তি',
  'marketing.tagline': 'আবেদনকারী ভর্তি পোর্টাল — নিবন্ধন, আবেদন, পরীক্ষা এবং ফলাফল।',
  'common.stepProgress': 'ধাপ {{current}} এর {{total}}',
};
