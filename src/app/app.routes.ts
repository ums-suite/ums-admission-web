import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth/auth.guard';
import { officerGuard } from './core/auth/officer.guard';

const placeholder = () =>
  import('./core/shared/feature-placeholder.component').then((m) => m.FeaturePlaceholderComponent);

/**
 * Root route table (AWEB-1/AWEB-6).
 *
 * Two registers per requirement-spec.md §2/§10.1:
 * - `''` (and other pre-login marketing/info paths added later): SSR/prerendered, editorial.
 * - `'app/**'`: the entire authenticated funnel (registration through enrollment handoff, plus
 *   the Officer surface) — always CSR, never server-rendered (see app.routes.server.ts).
 *
 * Within `app/**`:
 * - `login`/`register` are guest-only ({@link guestGuard}) -- an already-authenticated applicant
 *   is sent to the authenticated home instead of seeing the login form again.
 * - `result` sits OUTSIDE the {@link authGuard}-protected group: requirement-spec.md §10.4
 *   resolves result lookup to support both an authenticated-session path AND an
 *   application-number-plus-secondary-identifier path (for a shared/public-device applicant who
 *   doesn't want to log in, §9's edge case) -- AWEB-26 handles that dual entry itself, so this
 *   route must not force login the way the rest of the funnel does.
 * - Every other section requires login ({@link authGuard}); `officer` additionally requires
 *   {@link officerGuard} (permission-gated, §3.8/§5).
 *
 * Every leaf here is {@link FeaturePlaceholderComponent} until its own AWEB ticket lands --
 * only the tree shape, guards, and lazy-loading boundaries are this ticket's job.
 */
export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/marketing/marketing-landing.component').then(
        (m) => m.MarketingLandingComponent,
      ),
  },
  {
    path: 'app',
    children: [
      {
        path: 'login',
        canActivate: [guestGuard],
        loadComponent: () =>
          import('./features/login/login-form.component').then((m) => m.LoginFormComponent),
      },
      {
        path: 'register',
        canActivate: [guestGuard],
        loadComponent: () =>
          import('./features/registration/registration-flow.component').then(
            (m) => m.RegistrationFlowComponent,
          ),
      },
      {
        path: 'result',
        loadComponent: placeholder,
        data: { label: 'Result check' },
      },
      {
        path: '',
        canActivate: [authGuard],
        children: [
          { path: '', loadComponent: placeholder, data: { label: 'Dashboard' } },
          {
            path: 'profile',
            loadComponent: () =>
              import('./features/registration/applicant-profile.component').then(
                (m) => m.ApplicantProfileComponent,
              ),
          },
          {
            path: 'wizard/:campaignId',
            loadComponent: () =>
              import('./features/wizard/wizard-shell.component').then(
                (m) => m.WizardShellComponent,
              ),
          },
          { path: 'wizard', loadComponent: placeholder, data: { label: 'Application wizard' } },
          {
            path: 'payment/:applicationId/confirming',
            loadComponent: () =>
              import('./features/payment/payment-confirmation.component').then(
                (m) => m.PaymentConfirmationComponent,
              ),
          },
          {
            path: 'payment/:applicationId',
            loadComponent: () =>
              import('./features/payment/payment-method-selection.component').then(
                (m) => m.PaymentMethodSelectionComponent,
              ),
          },
          { path: 'payment', loadComponent: placeholder, data: { label: 'Fee payment' } },
          {
            path: 'admit-card/:applicationId',
            loadComponent: () =>
              import('./features/admit-card/admit-card.component').then(
                (m) => m.AdmitCardComponent,
              ),
          },
          { path: 'admit-card', loadComponent: placeholder, data: { label: 'Admit card' } },
          {
            path: 'exam',
            children: [
              {
                path: 'pretest/:applicationId',
                loadComponent: () =>
                  import('./features/exam/pretest.component').then((m) => m.PretestComponent),
              },
              {
                path: 'attempt/:id',
                loadComponent: () =>
                  import('./features/exam/exam-attempt.component').then(
                    (m) => m.ExamAttemptComponent,
                  ),
              },
              { path: '', loadComponent: placeholder, data: { label: 'Admission test' } },
            ],
          },
          {
            path: 'post-result',
            children: [
              {
                path: 'documents/:applicationId',
                loadComponent: () =>
                  import('./features/post-result/document-verification.component').then(
                    (m) => m.DocumentVerificationComponent,
                  ),
              },
              {
                path: '',
                loadComponent: placeholder,
                data: { label: 'Offer & enrollment' },
              },
            ],
          },
          {
            path: 'officer',
            canActivate: [officerGuard],
            loadComponent: placeholder,
            data: { label: 'Officer console' },
          },
        ],
      },
    ],
  },
];
