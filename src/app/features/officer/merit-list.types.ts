/**
 * Wire shapes for `Admission`'s `MeritList` (AWEB-34, requirement-spec.md §3.8: "generation,
 * review, and approval workflow... an explicit, auditable approval step, never an automatic
 * publish"). Verified directly against `ums-core` source (`MeritListEndpoints.cs`,
 * `MeritListDto.cs`, `Domain/MeritLists/MeritListId.cs`).
 *
 * **Confirmed**: `MeritListStatus` is a plain 2-state machine (`Draft` -> `Approved`) -- there is
 * no separate "review" endpoint distinct from generate/approve, no reject, and no per-entry edit
 * endpoint. This app's own "review" step (§3.8's own wording) is therefore reading the generated
 * `Draft` list's entries in full before the officer commits to {@link MeritListApi.approve} --
 * there is nothing else server-side to call "review" against.
 */
export type MeritListStatus = 'Draft' | 'Approved';
export type MeritOutcome = 'Admitted' | 'Waitlisted' | 'Rejected';

export interface MeritListEntryDto {
  readonly applicantId: string;
  readonly applicationId: string;
  readonly programId: string;
  readonly score: number;
  readonly rank: number;
  readonly outcome: MeritOutcome;
  readonly waitlistRank?: number;
}

export interface MeritListDto {
  readonly id: string;
  readonly campaignId: string;
  readonly status: MeritListStatus;
  readonly entries: readonly MeritListEntryDto[];
}
