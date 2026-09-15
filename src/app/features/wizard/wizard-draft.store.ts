import { Injectable, computed, inject, signal } from '@angular/core';
import { type Observable, forkJoin, tap } from 'rxjs';
import type { UmsApiError } from '@ums/shared';
import { ApplicationApi } from './application.api';
import type { ApplicationDto, CampaignDto, ProgramChoiceRequest } from './application.types';

const STORAGE_PREFIX = 'ums-admission-web:wizard-application:';

/**
 * Save-as-draft-at-every-step framework (AWEB-13, requirement-spec.md §3.2): a single
 * root-provided store holding the in-progress `Application` and its `AdmissionCampaign`, shared by
 * every wizard step so "leave and resume" is a property of the store, not something each step
 * re-implements. `Application` itself IS the durable draft (`ums-core` persists it server-side the
 * instant it's created) -- this store's own job is just resolving *which* `Application` to load.
 *
 * **Same-browser-only resume, not full cross-device resume** -- see `application.types.ts`'s class
 * doc for the confirmed gap (no "list my applications" endpoint exists yet): the created
 * `applicationId` is persisted to `localStorage`, keyed by `campaignId`, so returning to this
 * campaign's wizard in the *same browser* resumes the same `Application` rather than creating a
 * second one. A different device/browser has no way to discover it today.
 */
@Injectable({ providedIn: 'root' })
export class WizardDraftStore {
  private readonly applicationApi = inject(ApplicationApi);

  private readonly applicationInternal = signal<ApplicationDto | null>(null);
  private readonly campaignInternal = signal<CampaignDto | null>(null);
  private readonly loadingInternal = signal(true);
  private readonly errorInternal = signal<string | null>(null);
  private readonly savingInternal = signal(false);

  readonly application = this.applicationInternal.asReadonly();
  readonly campaign = this.campaignInternal.asReadonly();
  readonly loading = this.loadingInternal.asReadonly();
  readonly error = this.errorInternal.asReadonly();
  readonly saving = this.savingInternal.asReadonly();

  /** Domain Invariant #4: an Application cannot be edited after submission-lock. */
  readonly isEditable = computed(() => this.applicationInternal()?.status === 'Draft');

  /** Edge case "Campaign deadline passes while an applicant is mid-draft" -- deadline is checked live, not just at load time, by re-reading `campaign()` wherever a countdown is rendered. */
  readonly isPastDeadline = computed(() => {
    const campaign = this.campaignInternal();
    if (!campaign) {
      return false;
    }
    return Date.now() > new Date(campaign.applicationWindowEnd).getTime();
  });

  initialize(campaignId: string): void {
    this.loadingInternal.set(true);
    this.errorInternal.set(null);

    forkJoin({
      campaign: this.applicationApi.getCampaign(campaignId),
      application: this.resolveApplication(campaignId),
    }).subscribe({
      next: ({ campaign, application }) => {
        this.campaignInternal.set(campaign);
        this.applicationInternal.set(application);
        this.loadingInternal.set(false);
      },
      error: (error: UmsApiError) => {
        this.loadingInternal.set(false);
        this.errorInternal.set(error.message || 'We could not load your application.');
      },
    });
  }

  /** Applies a mutation (program choices, a document, submit) and refreshes the held Application on success -- every wizard step goes through this so "saved" always reflects the server's own confirmed state, never an optimistic guess. */
  save(
    mutate: (applicationId: string) => Observable<ApplicationDto>,
    onSuccess?: () => void,
    onError?: (error: UmsApiError) => void,
  ): void {
    const applicationId = this.applicationInternal()?.id;
    if (!applicationId) {
      return;
    }
    this.savingInternal.set(true);
    mutate(applicationId).subscribe({
      next: (updated) => {
        this.savingInternal.set(false);
        this.applicationInternal.set(updated);
        onSuccess?.();
      },
      error: (error: UmsApiError) => {
        this.savingInternal.set(false);
        onError?.(error);
      },
    });
  }

  /** Replaces the held Application with an already-fetched, more current copy (e.g. after a document-upload step's own direct API call) -- avoids a redundant re-fetch through {@link save}, which assumes exactly one in-flight mutation. */
  setApplication(application: ApplicationDto): void {
    this.applicationInternal.set(application);
  }

  setProgramChoices(
    choices: readonly ProgramChoiceRequest[],
    onSuccess?: () => void,
    onError?: (error: UmsApiError) => void,
  ): void {
    this.save((id) => this.applicationApi.setProgramChoices(id, choices), onSuccess, onError);
  }

  /** `Draft -> Locked`, irreversible (Domain Invariant #4) -- AWEB-17. */
  submit(onSuccess?: () => void, onError?: (error: UmsApiError) => void): void {
    this.save((id) => this.applicationApi.submitApplication(id), onSuccess, onError);
  }

  private resolveApplication(campaignId: string): Observable<ApplicationDto> {
    const storedId = this.readStoredApplicationId(campaignId);
    if (storedId) {
      return this.applicationApi.getApplication(storedId);
    }
    return this.applicationApi
      .createApplication(campaignId)
      .pipe(tap((application) => this.writeStoredApplicationId(campaignId, application.id)));
  }

  private readStoredApplicationId(campaignId: string): string | null {
    try {
      return localStorage.getItem(STORAGE_PREFIX + campaignId);
    } catch {
      return null;
    }
  }

  private writeStoredApplicationId(campaignId: string, applicationId: string): void {
    try {
      localStorage.setItem(STORAGE_PREFIX + campaignId, applicationId);
    } catch {
      // Best-effort only -- a private-browsing/storage-disabled session simply loses same-browser
      // resume, never breaks the wizard itself.
    }
  }
}
