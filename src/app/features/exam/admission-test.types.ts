/**
 * Wire shape for `Admission`'s `AdmissionTest` (AWEB-21) -- verified directly against `ums-core`
 * source (`AdmissionTestDto`, `AdmissionTestEndpoints.cs`).
 *
 * **Confirmed cross-team gap**: there is no field anywhere on this DTO (or any other confirmed
 * endpoint) naming the applicant's own assigned `TestSlot`'s start/end instant --
 * `AddTestSlotRequest(StartAt, EndAt, Capacity)` is write-only (officer-only,
 * `admission.campaign.manage`), and `AdmissionTestEndpoints.cs` exposes no `GET` for slots at all.
 * requirement-spec.md §3.5's "visible countdown to the test's actual start time if the applicant
 * arrives early" therefore has no backend data source today -- AWEB-21's pre-test screen degrades
 * to showing the applicant's assigned slot **identifier** (`Application.assignedTestSlotId`,
 * already surfaced by the admit-card screen) without a literal start-time countdown, and this gap
 * is flagged prominently in this app's PR rather than inventing a fake timestamp. Likewise,
 * direct inspection of `ExamAttemptService.StartAsync` confirms the server itself does not
 * currently reject a `start` call outside the assigned slot's time window either (only
 * `Application.Status == Locked && AssignedTestSlotId != null` is checked) -- so "mandatory
 * un-skippable instructions... before the timer starts" is enforced by this client's own gating
 * (the Start button stays disabled until every rule is acknowledged), not by any time-window
 * check either client- or server-side today.
 */
export interface AdmissionTestDto {
  readonly id: string;
  readonly campaignId: string;
  readonly name: string;
  readonly durationMinutes: number;
  readonly totalQuestionCount: number;
  readonly slotCount: number;
}
