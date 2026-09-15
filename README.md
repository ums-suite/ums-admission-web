# ums-admission-web

The applicant-facing admission system — registration, application, online admission test, and result publication. The platform's highest-stakes seasonal traffic (see `ums-requirements.md` §7.2 and [ADR-0007](https://github.com/ums-suite/ums-platform/blob/main/docs/adr/0007-result-day-caching-strategy.md)).

- **Full spec:** [`ums-platform/docs/client/ums-admission-web/requirement-spec.md`](https://github.com/ums-suite/ums-platform/blob/main/docs/client/ums-admission-web/requirement-spec.md)
- **Design system:** [`ums-design-system`](https://github.com/ums-suite/ums-design-system) · **API contracts:** [`ums-shared`](https://github.com/ums-suite/ums-shared)
- **Tech:** Angular 22, Bengali/English i18n

## Status

Under active build against `ums-platform/docs/client/ums-admission-web/tickets.md` (AWEB-1 through AWEB-34). See the open PR into `dev` for exactly which tickets are complete.

## Rendering split (requirement-spec.md §2/§10.1)

- `''` and other pre-login marketing/campaign-info paths: SSR + prerendered (`src/app/app.routes.server.ts`, `RenderMode.Prerender`).
- `app/**`: the entire authenticated funnel (registration → wizard → payment → exam → result → post-result → Officer surface) — always CSR (`RenderMode.Client`), never server-rendered, per §10.1's "state-integrity over SEO" rationale.

## Local package consumption (temporary)

`@ums/design-system` and `@ums/shared` are consumed as real `package.json` dependencies (ADR-0017 — never a monorepo path or git submodule), but this environment has no running instance of "the platform's private registry" that `ums-design-system`'s and `ums-shared`'s own READMEs document as the install source. Until that registry exists, both are vendored as packed tarballs built from each sibling repo's own `dist/` output:

```bash
cd ../ums-shared && npm run build:lib && npm pack --pack-destination ../ums-admission-web/vendor
cd ../ums-design-system && npm run build:lib && npm pack --pack-destination ../ums-admission-web/vendor
```

`package.json` then pins them as `"@ums/shared": "file:vendor/ums-shared-<version>.tgz"` / `"@ums/design-system": "file:vendor/ums-design-system-<version>.tgz"`. Swap these two lines for real `"^x.y.z"` registry ranges the moment the private registry is live — nothing else in this app depends on the tarball path.

## Known `@ums/design-system` packaging gaps (flagged upstream, worked around here)

Found while wiring AWEB-2 (`@ums/design-system` integration) against the real published `dist/` package, not just the in-repo catalog:

1. **`exports` map omits `./styles/*`.** The package's own README documents `@import '@ums/design-system/styles/tokens.css'`, but the published `package.json`'s `exports` field only declares `"."` and `"./package.json"` — the documented bare specifier fails Node/esbuild `exports` resolution. Worked around here with a relative `node_modules` path in `src/styles.scss` (relative imports are never subject to `exports`); swap back once design-system adds a `"./styles/*"` export entry.
2. **Missing `tiptap` dependency declarations.** The published `dist/package.json`'s `dependencies` list only `echarts`/`tslib`, but the library's eagerly-`export *`'d public API statically imports `@tiptap/core`, `@tiptap/starter-kit`, and `@tiptap/extension-placeholder` (via the rich-text-editor component) — every consumer must separately discover and install these three packages, even one that never uses the rich-text editor. Added here as direct `dependencies` pinned to the versions design-system's own workspace `package.json` uses (`^3.31.3`).
3. **No exam-mode theme variant.** `ThemeService`/`theme.types.ts` expose only `ThemeMode` (`light`/`dark`/`system`) and `TypographyRegister` (`marketing`/`operational`) — requirement-spec.md §10.6 resolves the exam-mode theme (higher-contrast, minimal-chrome) to live in `ums-design-system`, but it does not exist yet. AWEB-22 (exam screen) builds against the existing light/dark tokens instead of forking a local variant; see that ticket's commit for the in-code flag.

None of these are fixed in this repo — they're `ums-design-system` package bugs, flagged here and in the PR description for a follow-up there.

## Local dev

```bash
npm install
npm start        # dev server
npm run build    # production build (browser + server bundles)
npm test         # Karma unit tests
npm run lint
npm run stylelint
```
