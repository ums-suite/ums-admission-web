import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';
import { CurrentUserService } from '@ums/shared';
import { AUTH_ROUTES } from './auth-routes.constants';

/**
 * Permission-gated access to the Admission Officer surface (§3.8, §5 "Role-gated UI") --
 * `admission.campaign.manage` / `admission.meritlist.*` / `admission.result.publish` /
 * `admission.application.review` (verified against `ums-core`'s own
 * `AdmissionPermissions.cs`), never a raw "is this person staff" check.
 *
 * **Known gap, matching `@ums/shared`'s own documented one** ("Known gap: permission
 * resolution" in its README): Identity's access token carries Role *names* only, not a resolved
 * Permission set, and there is no "my effective permissions" endpoint yet for a client to call.
 * This guard can therefore only check **role membership** (`CurrentUserService.hasAnyRole`), not
 * the actual `admission.*` permission strings the backend itself enforces on every officer
 * endpoint (which remains the real security boundary regardless of what this guard does — this
 * is UX convenience, never the trust boundary, exactly like every other client-side check in this
 * app). `OFFICER_ROLE_NAME` is this app's best-current assumption for the seeded/assigned Role
 * name Identity uses for Admission Officers; no such name is hardcoded anywhere in `ums-core`
 * (roles are created/assigned dynamically through Identity's own role management), so this must
 * be confirmed with the Identity/Admission team rather than trusted as authoritative. Flagged in
 * the PR as a cross-team follow-up, layered on top of `@ums/shared`'s existing gap.
 */
export const OFFICER_ROLE_NAME = 'AdmissionOfficer';

export const officerGuard: CanActivateFn = () => {
  const currentUser = inject(CurrentUserService);
  const router = inject(Router);

  if (currentUser.hasAnyRole([OFFICER_ROLE_NAME])) {
    return true;
  }

  return router.createUrlTree([AUTH_ROUTES.authenticatedHome]);
};
