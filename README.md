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

## Local dev

```bash
npm install
npm start        # dev server
npm run build    # production build (browser + server bundles)
npm test         # Karma unit tests
npm run lint
npm run stylelint
```
