import type { TranslationDictionary } from '../translation-dictionary.types';

/**
 * English UI-string dictionary -- the platform-wide fallback locale (ADR-0011,
 * `@ums/shared`'s `UMS_DEFAULT_LOCALE`). Every key added to `bn.ts` must also exist here so a
 * missing Bengali translation degrades to English rather than an empty string (mirrors the
 * server-side translation-table fallback ums-conventions.md describes for backend content).
 *
 * Keys are namespaced by feature area (`marketing.*`, `shell.*`, ...) so later tickets can add
 * their own section without touching earlier ones.
 */
export const EN_TRANSLATIONS: TranslationDictionary = {
  'marketing.appName': 'ums-admission-web',
  'marketing.tagline': 'Applicant admission portal — registration, application, exam, and results.',
  'shell.authenticatedPlaceholder': 'Authenticated funnel (CSR) — scaffold placeholder.',
  'common.stepProgress': 'Step {{current}} of {{total}}',
};
