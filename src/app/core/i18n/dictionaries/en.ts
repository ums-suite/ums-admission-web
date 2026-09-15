import type { TranslationDictionary } from '../translation-dictionary.types';

/**
 * English UI-string dictionary -- the platform-wide fallback locale (ADR-0011,
 * `@ums/shared`'s `UMS_DEFAULT_LOCALE`). Every key added to `bn.ts` must also exist here so a
 * missing Bengali translation degrades to English rather than an empty string (mirrors the
 * server-side translation-table fallback ums-conventions.md describes for backend content).
 *
 * Keys are namespaced by feature area (`marketing.*`, `shell.*`, ...) so later tickets can add
 * their own section without touching earlier ones.
 */
export const EN_TRANSLATIONS: TranslationDictionary = {
  'marketing.appName': 'ums-admission-web',
  'marketing.tagline': 'Applicant admission portal — registration, application, exam, and results.',
  'common.stepProgress': 'Step {{current}} of {{total}}',

  'registration.title': 'Create your applicant account',
  'registration.subtitle': "Let's start with a few basic details.",
  'registration.givenName.label': 'Given name',
  'registration.familyName.label': 'Family name',
  'registration.email.label': 'Email',
  'registration.mobile.label': 'Mobile number (optional)',
  'registration.dateOfBirth.label': 'Date of birth',
  'registration.submit': 'Create account',
  'registration.submitting': 'Creating your account…',
  'registration.serverError.generic':
    'Something went wrong. Please check your details and try again.',

  'validation.givenName.required': 'Please enter your given name.',
  'validation.familyName.required': 'Please enter your family name.',
  'validation.email.required': 'Please enter your email address.',
  'validation.email.invalid': 'Please enter a valid email address.',
  'validation.mobile.invalid': 'Please enter a valid mobile number.',
  'validation.dateOfBirth.required': 'Please enter your date of birth.',
  'validation.dateOfBirth.future': 'Date of birth cannot be in the future.',

  'otp.title': 'Verify your email',
  'otp.subtitle': "We'll send a 6-digit verification code to {{destination}}.",
  'otp.useMobileInstead': 'Verify by mobile number instead',
  'otp.useEmailInstead': 'Verify by email instead',
  'otp.sendCode': 'Send code',
  'otp.sending': 'Sending…',
  'otp.codeSentTo': 'We sent a 6-digit code to {{destination}}.',
  'otp.resend': 'Resend code',
  'otp.resendIn': 'Resend available in {{seconds}}s',
  'otp.verify': 'Verify',
  'otp.verifying': 'Verifying…',
  'otp.serverError.generic':
    'That code did not work. Please check it and try again, or request a new one.',

  'registration.complete.title': "You're registered",
  'registration.complete.body':
    "Your applicant account has been created and your contact details are verified. We'll send you a message with next steps for signing in shortly.",

  'login.title': 'Sign in',
  'login.subtitle': 'Welcome back — sign in to continue your application.',
  'login.identifier.label': 'Email or username',
  'login.password.label': 'Password',
  'login.submit': 'Sign in',
  'login.submitting': 'Signing in…',
  'login.serverError.generic': 'We could not sign you in with those details. Please try again.',
  'validation.identifier.required': 'Please enter your email or username.',
  'validation.password.required': 'Please enter your password.',
};
