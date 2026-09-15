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

## Known `@ums/shared` contract gap: stale OpenAPI snapshot, not a missing backend (AWEB-5)

`ums-shared`'s committed `contracts/ums-core.v1.json` (and therefore its generated client) currently covers only **Identity, Audit, Organization** (confirmed: `ums-shared/README.md` "Status" table; the JSON itself has exactly 41 paths, all under those three prefixes). `Admission`, `Finance`, `Documents`, `Notifications`, and `Student` — this app's actual domain — have no generated TypeScript client yet.

**This is a stale snapshot, not a missing backend.** Direct inspection of `ums-core`'s own source confirms all five modules are fully implemented server-side with real ASP.NET Core minimal-API endpoints already registered in `Host/Program.cs`, on the exact same shared OpenAPI document `ums-shared/scripts/fetch-contract.mjs` fetches from (`/openapi/v1.json`) — there's no separate per-module document to opt into. The committed contract was fetched `2026-09-04`, and Admission/Finance's own EF Core migrations are dated `2026-09-07`/`2026-09-08` — i.e. _after_ the snapshot was taken. The fix is mechanical and entirely on the `ums-shared` side: bring up `ums-core`'s Host, run `npm run contract:fetch && npm run client:generate` there, and every module below becomes a real generated client. **Not fixed here** — that's a different repo/team's release, flagged in the PR rather than worked around by editing `ums-shared` from this app.

**Interim measure taken here:** `core/http/provisional-module-api.base.ts` is a thin `HttpClient` base class every one of this app's own Admission/Finance/Documents/Notifications/Student data-access services extends instead of hand-rolling `HttpClient` calls — same base URL, same interceptor chain, same `toUmsApiError` normalization a generated service's consumer already gets, so swapping in the real generated client later is a mechanical class swap, not a rewrite. Each concrete subclass (added per feature ticket, e.g. AWEB-10's `ApplicantApi`) documents the exact endpoint path(s) it assumes, verified directly against `ums-core`'s own `*Endpoints.cs` route registrations (not guessed) — e.g. `POST /api/v1/admission/applicants/`, `POST /api/v1/admission/applicants/{id}/otp`, `POST /api/v1/admission/exams/attempts/{id}/answers`, `POST /api/v1/finance/payments/`. Response/request models are hand-authored `interface`s modeled directly off `ums-core`'s own domain entity properties (`Application.cs`, `PaymentTransaction.cs`, etc.) as a best-effort match to the real wire shape, not invented from scratch — but they are unverified against the actual serialized DTO until the real generated client replaces them, so treat field names as "best current guess, confirm on first real integration test."

## Pre-signed upload URL lifetime -- verified, not just flagged (AWEB-8)

design-decisions.md's "Pre-Signed Upload URL Lifetime" names confirming the actual configured expiry window as a cross-team follow-up. Direct inspection of `ums-core`'s `UploadedArtifactService` resolves this precisely: the server-side value is **15 minutes** (`UploadUrlExpiry = TimeSpan.FromMinutes(15)`, both for the upload URL and the separate download URL). Whether that's generously sized against §4's low-bandwidth NFR is still worth confirming with the Admission/Documents team against a real worst-case file size (e.g. a multi-megabyte scanned certificate on a slow 3G connection could plausibly approach or exceed 15 minutes) — flagged as a specific number to validate, not an unknown.

## Found while building AWEB-8: `@ums/shared`'s `authInterceptor` isn't scoped to its own base URL

`authInterceptor`'s `attachBearerToken` only checks whether the request already carries an `Authorization` header or is one of the two auth endpoints — it never checks whether `req.url` actually points at `UMS_AUTH_CONFIG.baseUrl`. A plain `HttpClient` call to any other origin (e.g. a third-party object-storage host from a pre-signed upload URL) would still get this app's session bearer token attached, alongside `X-Correlation-Id`/`?lang=`/`Accept-Language`. `core/upload/direct-upload.service.ts` works around this by constructing its own `HttpClient` directly from an injected `HttpBackend` for the one PUT that must never carry it (Angular's documented interceptor-bypass pattern), verified in that file's own test suite (`direct-upload.service.spec.ts`, "no leaked Authorization header"). Flagged here and in the PR as a hardening suggestion for `@ums/shared` upstream: scope `attachBearerToken`'s check to `req.url.startsWith(config.baseUrl)`.

## Found while building AWEB-9 (Exam Session Store)

- **`ExamAttemptDto` carries no explicit "server now" field** -- only `expiresAt`, a fixed target instant. `core/exam-session/exam-attempt.api.ts` derives the server clock from the standard HTTP response `Date` header instead (present on every response, no contract change needed) and uses it to compute a client/server clock-drift offset, per Domain Invariant #2.
- **`PUT .../exams/attempts/{id}/answers` is per-question, not a full-answer-map replace** (`SaveAnswerRequest(QuestionId, SelectedOptionIndex, SubjectiveText)`, verified against `ums-core`'s own `ExamAttemptEndpoints.cs`/`ExamAnswer.cs`) -- `ExamSessionStore` groups save requests by `questionId` (RxJS `groupBy`) so answering one question is never blocked behind another's slow/retrying save, while a newer answer to the _same_ question supersedes an older in-flight save for it.
- **`AuthRefreshCoordinator` exposes no public "refresh in progress" signal** -- only a private, internal single-flighted `Observable`. design-decisions.md's "Exam Save-Retry Logic" calls for the Exam Session Store to consume such a signal as an optional enhancement layered on top of its unconditional-resilience baseline; that baseline (retry any failure, network or 401, identically and indefinitely) is fully implemented and satisfies Domain Invariant #1 on its own, but the refresh-aware hold itself is not implemented, pending `@ums/shared` exposing a consumable signal. Suggested upstream: expose `AuthRefreshCoordinator`'s in-flight state as a public signal/observable.
- **This app is zoneless** (`src/main.ts` has no `zone.js` import/polyfill) -- Angular's `fakeAsync`/`tick()` test helpers require `zone.js/testing` and cannot be used here at all. `ExamSessionStore`'s retry-backoff is implemented with plain `setTimeout`/`clearTimeout` rather than RxJS's `retry({ delay })`/`timer()` operators specifically because `jasmine.clock()` (this repo's only viable timer-mocking tool without zone.js) does not reliably intercept RxJS's internal `AsyncScheduler`, verified directly while writing `exam-session.store.spec.ts`; the plain global timer functions it does reliably intercept are used throughout instead.
- **Exam-session test coverage**: `core/exam-session/**` measures 92.17% statements / 92% lines / 88.98% branches / 89.42% functions (`npm run test -- --coverage --coverage-include="src/app/core/exam-session/**"`) against the §4 NFR's ≥90% target for exam-session state logic (timer, auto-save; auto-submit itself is AWEB-23's job, still to come) -- statements/lines clear the bar, branches/functions are close but not yet there.

## Local dev

```bash
npm install
npm start        # dev server
npm run build    # production build (browser + server bundles)
npm test         # Karma unit tests
npm run lint
npm run stylelint
```
