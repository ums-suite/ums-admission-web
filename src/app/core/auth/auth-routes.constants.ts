/**
 * Canonical paths for the auth-adjacent screens (AWEB-4/AWEB-10/AWEB-11), kept in one place so
 * the login/guest guards (this file's siblings) and the actual route definitions
 * (AWEB-10/AWEB-11) never drift apart. requirement-spec.md §2/§10.1 puts registration/login
 * inside the CSR authenticated-funnel path group (`app/**`) even though the applicant isn't
 * authenticated *yet* -- both screens are highly interactive and irrelevant to SEO, the same
 * rationale the spec gives for the rest of the funnel.
 */
export const AUTH_ROUTES = {
  login: '/app/login',
  register: '/app/register',
  /** Where an authenticated applicant lands with nowhere more specific to go (e.g. after guestGuard redirects them away from /login). */
  authenticatedHome: '/app',
} as const;

/** Query param `authGuard` attaches so the login screen can return the applicant to where they were headed. */
export const RETURN_URL_QUERY_PARAM = 'returnUrl';
