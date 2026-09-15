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

  'profile.loading': 'Loading your profile…',
  'profile.title': 'Complete your profile',
  'profile.subtitle':
    'A few more details before you start your application — your present address and, if applicable, your guardian.',
  'profile.presentAddress.label': 'Present address',
  'profile.guardian.heading': 'Guardian information',
  'profile.guardian.hint':
    "If the campaign you're applying to requires a guardian on file, fill in all three fields below.",
  'profile.guardianName.label': "Guardian's name",
  'profile.guardianRelation.label': 'Relationship to you',
  'profile.guardianContact.label': "Guardian's phone or email",
  'profile.save': 'Save profile',
  'profile.saving': 'Saving…',
  'profile.saved': 'Your profile has been saved.',
  'profile.continueToWizard': 'Continue to application',
  'profile.loadError': 'We could not load your profile. Please refresh and try again.',
  'profile.serverError.generic': 'Something went wrong while saving. Please try again.',

  'validation.presentAddress.required': 'Please enter your present address.',
  'validation.guardianName.required': "Please enter your guardian's name.",
  'validation.guardianRelation.required': 'Please enter your relationship to your guardian.',
  'validation.guardianContact.required': 'Please enter a way to contact your guardian.',

  'wizard.loading': 'Loading your application…',
  'wizard.next': 'Next',
  'wizard.back': 'Back',
  'wizard.deadlinePassed':
    'The application deadline for this campaign has passed. No further edits or submission are possible.',
  'wizard.step.programChoices': 'Program choices',
  'wizard.step.academicHistory': 'Academic history',
  'wizard.step.documents': 'Documents',
  'wizard.step.review': 'Review & submit',

  'wizard.programChoices.title': 'Choose your programs',
  'wizard.programChoices.subtitle':
    'Add the programs you want to apply for, in order of preference. You can reorder or remove them at any time before submitting.',
  'wizard.programChoices.loading': 'Loading available programs…',
  'wizard.programChoices.addPlaceholder': 'Select a program to add',
  'wizard.programChoices.add': 'Add',
  'wizard.programChoices.moveUp': 'Move up',
  'wizard.programChoices.moveDown': 'Move down',
  'wizard.programChoices.remove': 'Remove',
  'wizard.programChoices.required': 'Please choose at least one program.',
  'wizard.programChoices.serverError': 'We could not save your program choices. Please try again.',
  'wizard.programChoices.eligibilityKnown': 'Eligibility rules apply to this program',

  'wizard.academicHistory.title': 'Your academic history',
  'wizard.academicHistory.subtitle': 'Add every examination result relevant to your eligibility.',
  'wizard.academicHistory.examName.label': 'Examination name',
  'wizard.academicHistory.board.label': 'Board/university',
  'wizard.academicHistory.passingYear.label': 'Passing year',
  'wizard.academicHistory.score.label': 'Score',
  'wizard.academicHistory.scale.label': 'Score type',
  'wizard.academicHistory.scale.gpa': 'GPA',
  'wizard.academicHistory.scale.percentage': 'Percentage',
  'wizard.academicHistory.add': 'Add record',
  'wizard.academicHistory.remove': 'Remove',
  'wizard.academicHistory.required': 'Please add at least one academic record.',
  'wizard.academicHistory.serverError':
    'We could not save one of your academic records. Please try again.',

  'wizard.documents.title': 'Upload your documents',
  'wizard.documents.subtitle':
    'Upload each required document below. Files upload directly and securely -- we will tell you immediately if anything needs fixing.',
  'wizard.documents.registerError':
    'Your file uploaded successfully but we could not attach it to your application. Please try again.',

  'wizard.review.title': 'Review your application',
  'wizard.review.summary.title': 'Application summary',
  'wizard.review.summary.status': 'Status',
  'wizard.review.summary.programChoices': 'Program choices',
  'wizard.review.summary.documents': 'Documents',
  'wizard.review.lockWarning':
    'Once you submit, your application will be locked and you will not be able to make further changes.',
  'wizard.review.alreadyLocked': 'Your application has already been submitted and locked.',
  'wizard.review.submit': 'Submit application',
  'wizard.review.confirmTitle': 'Submit and lock your application?',
  'wizard.review.confirmDescription':
    'This cannot be undone. Once submitted, your application is locked and no further edits are possible. Please make sure everything above is correct.',
  'wizard.review.confirmSubmit': 'Yes, submit and lock',
  'wizard.review.confirmCancel': 'Go back and review again',
  'wizard.review.serverError': 'We could not submit your application. Please try again.',
};
