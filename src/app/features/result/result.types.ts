/**
 * Wire shape for `Admission`'s public result-search endpoint (AWEB-26/27/28, requirement-spec.md
 * §3.6, §7, §10.4, Domain Invariant #5). Verified directly against `ums-core` source
 * (`ResultEndpoints.cs`, `PublishJobService.cs`, `AdmissionResultId.cs`, `MeritListId.cs`):
 *
 * `GET /api/v1/admission/results/search?applicationNumber={n}` OR
 * `GET /api/v1/admission/results/search?examId={id}&rollNumber={r}` -- `.AllowAnonymous()`,
 * rate-limited (`admission-result-search`, a plain Redis fixed window, no queue-status body of any
 * kind -- see `core/http/queue-status.types.ts`'s own gap note, which this app's queueing-aware
 * HTTP client (AWEB-7) still cooperates with generically if `Admission` ever adds one). Returns
 * `404 result.not_found` before a result is cached, `200` with the shape below once `PublishJobService`
 * has written it (i.e. once actually `Published`).
 *
 * **Confirmed, significant gaps against this app's own already-approved design-decisions.md,
 * flagged prominently in the PR:**
 * - **No explicit readiness/status field.** design-decisions.md's "Result-Check Response
 *   Contract" decision explicitly requires gating on "an explicit `status: published` (or
 *   equivalent) field" rather than inferring from HTTP status alone -- the real endpoint has no
 *   such field; readiness is 404-vs-200 only. This file's {@link isWellFormedResult} is this
 *   app's best available compensating control (never treat a 200 as revealable unless every
 *   expected field is actually present and well-typed), but it is a structural-validation
 *   fallback, not the same guarantee an explicit field would give -- a cross-team follow-up to
 *   confirm with `Admission` before this can be closed as truly resolved.
 * - **No authenticated-session lookup path at all.** §10.4 resolves result lookup to support
 *   "both an authenticated-session path and an application-number-plus-secondary-identifier
 *   path" -- `IResultCache.GetByStudentIdAsync` exists server-side but is dead code, called from
 *   no endpoint. This app therefore only offers the number/roll-number lookup path (AWEB-26);
 *   the authenticated-session path is a genuine, currently-unbuildable gap, flagged in the PR.
 * - **No secondary-identifier parameter of any kind** -- `applicationNumber` alone is sufficient
 *   to retrieve a result anonymously, unlike the "application-number-plus-secondary-identifier"
 *   combined lookup requirement-spec.md §9's shared-device privacy edge case calls for. The
 *   `examId`+`rollNumber` variant is the closest available analogue (a roll number is not
 *   something a casual onlooker at a shared device would already know, unlike an application
 *   number an applicant might have written down somewhere visible) but is not a true equivalent
 *   of a deliberate secondary-identifier check. Flagged as a real, non-blocking privacy gap for
 *   `Admission` to close, not something this client can fix on its own.
 */
export type ResultOutcome = 'Admitted' | 'Waitlisted' | 'Rejected';

export interface AdmissionResultSearchDto {
  readonly applicantId: string;
  readonly applicationId: string;
  readonly programId: string;
  readonly outcome: ResultOutcome;
  readonly meritRank?: number;
  readonly waitlistRank?: number;
}

/**
 * Domain Invariant #5's compensating structural check (see this file's class doc) -- the ONLY
 * place this app decides a 200 response is actually a revealable result. Any missing/mistyped
 * required field is treated exactly like a 404 (edge-cases.md "Result-Check Request Landing
 * Inside the Publish Write-Through Window": every non-fully-formed shape collapses to "not yet
 * published", never a partial reveal).
 */
export function isWellFormedResult(body: unknown): body is AdmissionResultSearchDto {
  if (typeof body !== 'object' || body === null) {
    return false;
  }
  const record = body as Record<string, unknown>;
  return (
    typeof record['applicantId'] === 'string' &&
    typeof record['applicationId'] === 'string' &&
    typeof record['programId'] === 'string' &&
    (record['outcome'] === 'Admitted' ||
      record['outcome'] === 'Waitlisted' ||
      record['outcome'] === 'Rejected')
  );
}
