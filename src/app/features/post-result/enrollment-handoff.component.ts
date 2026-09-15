import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UmsButtonComponent } from '@ums/design-system';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { ApplicationApi } from '../wizard/application.api';

type ScreenState = 'loading' | 'handed-off' | 'not-yet-confirmed' | 'error';

/**
 * Enrollment handoff screen (AWEB-31, requirement-spec.md §3.7: "On successful enrollment, the
 * app clearly signals the handoff to `ums-student-web`... rather than leaving the applicant to
 * wonder where to go next").
 *
 * **Confirmed gap, flagged in the PR**: there is no dedicated, explicit "your `Student` record was
 * created" signal anywhere in `Admission`'s API -- `ApplicationService.ConfirmAsync` provisions the
 * `Student` record inline, synchronously, as part of the same call that flips `Application.Status`
 * to `Confirmed`, but discards the result entirely (`ConfirmationAttemptResult` carries no
 * `studentId`/`studentNumber` field; see its own class doc). This screen therefore treats
 * `Application.Status === 'Confirmed'` as the best available proxy for "enrollment complete,
 * `Student` record exists" -- a reasonable inference given both happen in the one atomic call, but
 * not a directly-confirmed signal, and flagged as a suggested `Admission`/`Student` API addition
 * (e.g. projecting the created `studentId` onto `ConfirmationAttemptResult`) for a stronger
 * guarantee.
 *
 * **Confirmed gap**: no `ums-student-web` base URL is configured anywhere in this app
 * (`environment.ts` only knows `ums-core`'s own API origin) -- this screen states the handoff
 * plainly in words rather than rendering a broken or guessed cross-app link.
 */
@Component({
  selector: 'app-enrollment-handoff',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UmsButtonComponent, TranslatePipe],
  templateUrl: './enrollment-handoff.component.html',
})
export class EnrollmentHandoffComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly applicationApi = inject(ApplicationApi);

  protected readonly state = signal<ScreenState>('loading');
  private applicationId: string | null = null;

  ngOnInit(): void {
    const applicationId = this.route.snapshot.paramMap.get('applicationId');
    if (!applicationId) {
      this.state.set('error');
      return;
    }
    this.applicationId = applicationId;

    this.applicationApi.getApplication(applicationId).subscribe({
      next: (application) => {
        this.state.set(application.status === 'Confirmed' ? 'handed-off' : 'not-yet-confirmed');
      },
      error: () => this.state.set('error'),
    });
  }

  protected goToOfferAcceptance(): void {
    if (this.applicationId) {
      void this.router.navigateByUrl(`/app/post-result/offer/${this.applicationId}`);
    }
  }
}
