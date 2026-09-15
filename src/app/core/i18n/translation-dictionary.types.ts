/**
 * Flat dot-path key -> string dictionary for one UI locale (e.g. `'wizard.step.profile.title'`).
 * Flat (not nested) so a missing-key check is a simple `key in dictionary` lookup with no
 * recursive traversal, and so every feature module can own its own key namespace without a
 * shared nested-object shape to merge.
 *
 * Scope note (AWEB-3, requirement-spec.md §2 i18n row): this dictionary is for **static UI
 * chrome** only -- labels, buttons, validation messages, instructional copy (ADR-0011: "UI
 * strings, validation messages, and static template chrome are handled by standard Angular
 * i18n... not database rows"). It is deliberately NOT used for:
 * - Backend-sourced translated *content* (Notice/Program/etc. `{table}_translations` rows) --
 *   those are resolved server-side per ADR-0011/ums-conventions.md and arrive already in the
 *   caller's language via `LocaleService`'s `?lang=`/`Accept-Language` propagation
 *   (`localeInterceptor`, wired in `core/http`).
 * - Per-question bilingual exam content (requirement-spec.md §2 i18n row: "exam question content
 *   itself may be bilingual per-question... the UI must render both language variants of a
 *   question when the campaign configures it that way") -- that is a *simultaneous
 *   both-languages-at-once* rendering requirement, not a single-active-locale UI-string lookup,
 *   so it is handled directly off the question payload's own `{ en, bn }`-shaped fields in the
 *   exam feature (AWEB-22), never routed through this dictionary.
 */
export type TranslationDictionary = Readonly<Record<string, string>>;

/** Parameters for `{{placeholder}}` interpolation inside a translated string. */
export type TranslationParams = Readonly<Record<string, string | number>>;
