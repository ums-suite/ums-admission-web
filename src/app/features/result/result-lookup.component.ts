import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { UmsButtonComponent, UmsFormFieldComponent, UmsInputComponent } from '@ums/design-system';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

/**
 * Result-check entry screen (AWEB-26, requirement-spec.md §3.6, §10.4, Edge Case "Applicant
 * checks result on a shared/public device"). Sits OUTSIDE the authenticated funnel's guard
 * (`app.routes.ts`'s own comment on the `result` route already explains why).
 *
 * **Confirmed gaps against §10.4's own resolution, flagged prominently in the PR** (see
 * `result.types.ts`'s class doc for the full research-backed writeup): the real `Admission`
 * result-search endpoint has no authenticated-session lookup path at all (dead server-side code,
 * never wired to any endpoint) and accepts no secondary-identifier parameter -- `applicationNumber`
 * alone is sufficient to retrieve a result anonymously. Rather than inventing a secondary-
 * identifier field that isn't actually verified server-side (which would be a fake, misleading
 * security affordance -- exactly the kind of "pretend" this app's whole calm-confidence design
 * language exists to avoid), this screen asks only for the one real, working field and discloses
 * the shared-device privacy limitation plainly instead.
 */
@Component({
  selector: 'app-result-lookup',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UmsButtonComponent, UmsFormFieldComponent, UmsInputComponent, TranslatePipe],
  templateUrl: './result-lookup.component.html',
})
export class ResultLookupComponent {
  private readonly router = inject(Router);

  protected readonly applicationNumber = signal('');
  protected readonly submitted = signal(false);

  protected readonly canSubmit = computed(() => this.applicationNumber().trim().length > 0);

  protected onApplicationNumberInput(value: string): void {
    this.applicationNumber.set(value);
  }

  protected submit(): void {
    this.submitted.set(true);
    const applicationNumber = this.applicationNumber().trim();
    if (!applicationNumber) {
      return;
    }
    void this.router.navigate(['/app/result/check'], {
      queryParams: { applicationNumber },
    });
  }
}
