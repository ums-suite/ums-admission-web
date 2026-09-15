import type { QuestionDifficulty } from '../../core/exam-session/exam-attempt.types';

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

/**
 * Officer-facing question-bank / exam-rule write shapes (AWEB-33, requirement-spec.md §3.8) --
 * verified directly against `ums-core` source (`AdmissionTestEndpoints.cs`,
 * `AdmissionTestService.cs`). All gated behind `admission.campaign.manage` -- there is no distinct
 * `admission.questionbank.*` permission string.
 *
 * **Confirmed gap, flagged in the PR**: as `AdmissionTestDto`'s own class doc already documents,
 * there is no list/update/delete endpoint for individual questions, slots, or selection rules --
 * `AdmissionTestDto` exposes only aggregate counts (`totalQuestionCount`, `slotCount`), discarding
 * everything else server-side (`AdmissionTestService.ToDto`). This screen is therefore
 * additive-only and tracks "added this session" locally, exactly like `CampaignConfigComponent`'s
 * own identical workaround for the sibling campaign-configuration gap.
 */
export interface CreateAdmissionTestRequest {
  readonly campaignId: string;
  readonly name: string;
  readonly durationMinutes: number;
}

/**
 * `correctOptionIndex` is deliberately optional and never rendered back to any Applicant-facing
 * type (see `ExamQuestionDto`'s own class doc in `exam-attempt.types.ts` for why an Applicant read
 * must never carry the answer key) -- this request type is officer-only, write-only.
 */
export interface AddQuestionRequest {
  readonly category: string;
  readonly difficulty: QuestionDifficulty;
  readonly text: string;
  readonly options: readonly string[];
  readonly correctOptionIndex?: number;
  readonly isSubjective: boolean;
  readonly maxScore: number;
}

export interface SelectionRuleRequest {
  readonly questionDifficulty: QuestionDifficulty;
  readonly count: number;
}

export interface AddTestSlotRequest {
  readonly startAt: string;
  readonly endAt: string;
  readonly capacity: number;
}
