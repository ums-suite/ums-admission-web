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

  'payment.method.loading': 'Loading your payment details…',
  'payment.method.alreadyPaid': 'Your application fee has already been paid.',
  'payment.method.attemptInProgress':
    'A payment for this application is already being confirmed. Please wait -- we will let you know the moment it is done.',
  'payment.method.title': 'Pay your application fee',
  'payment.method.amountTitle': 'Amount due',
  'payment.method.submit': 'Pay now',
  'payment.method.submitting': 'Starting payment…',
  'payment.method.serverError': 'We could not start your payment. Please try again.',

  'payment.confirmation.waiting.title': 'Confirming your payment',
  'payment.confirmation.waiting.body':
    'Please do not close this window. We are waiting for your payment provider to confirm your payment -- this usually takes just a few moments.',
  'payment.confirmation.success.title': 'Payment confirmed',
  'payment.confirmation.success.body': 'Your application fee payment has been confirmed.',
  'payment.confirmation.success.action': 'Continue',
  'payment.confirmation.failed.title': 'Payment was not successful',
  'payment.confirmation.failed.body':
    'Your payment could not be completed. No amount was charged for this attempt. You can try again with the same or a different payment method.',
  'payment.confirmation.failed.action': 'Try again',
  'payment.confirmation.notFound.title': 'We could not find that payment attempt',
  'payment.confirmation.notFound.body':
    'This can happen if you returned to this page a different way than expected. Your money is safe -- let us take you back to start or resume your payment.',
  'payment.confirmation.notFound.action': 'Go to payment',

  'admitCard.loading': 'Loading your admit card…',
  'admitCard.title': 'Admit Card',
  'admitCard.notAvailable.body':
    'Your admit card will be available here once your test slot has been assigned and your application fee payment is confirmed.',
  'admitCard.preparing.body':
    'Your admit card is being prepared. This usually only takes a short while -- please check back soon.',
  'admitCard.failed.body':
    'We were unable to generate your admit card. Please contact support -- your test slot assignment is not affected.',
  'admitCard.details.title': 'Your test details',
  'admitCard.rollNumber': 'Roll number',
  'admitCard.testSlot': 'Test slot',
  'admitCard.verificationId': 'Verification code',
  'admitCard.download': 'Download admit card',
  'admitCard.error': 'We could not load your admit card. Please try again later.',
  'admitCard.beginExam': 'Begin your admission test',

  'exam.pretest.loading': 'Loading your test details…',
  'exam.pretest.error': 'We could not load your test details. Please try again later.',
  'exam.pretest.alreadyStartedUnresolvable':
    'It looks like you already started this attempt on a different device or browser. Please return to the device you started on to continue.',
  'exam.pretest.title': 'Before you begin',
  'exam.pretest.slot': 'Your assigned test slot: {{slot}}',
  'exam.pretest.rules.title': 'Please read carefully',
  'exam.pretest.rules.oneAttempt': 'You get exactly one attempt at this test.',
  'exam.pretest.rules.autoSubmit':
    'Your answers are submitted automatically the instant time runs out -- no further input is accepted after that.',
  'exam.pretest.rules.noReopen': 'Once submitted, your attempt cannot be reopened or changed.',
  'exam.pretest.rules.stayConnected':
    'Stay connected if you can. If you lose connection, keep answering -- your selections are kept and saved the moment you are back online.',
  'exam.pretest.rules.acknowledge': 'I have read and understood these rules.',
  'exam.pretest.deviceCheck.title': 'Device check',
  'exam.pretest.deviceCheck.online': 'Your device is online and ready.',
  'exam.pretest.deviceCheck.offline':
    'Your device appears to be offline. Please reconnect before beginning.',
  'exam.pretest.deviceCheck.acknowledge': "I've checked my device and connection.",
  'exam.pretest.begin': 'Begin exam',

  'exam.attempt.loading': 'Loading your exam…',
  'exam.attempt.error': 'We could not load your exam. Please contact support.',
  'exam.attempt.questionsUnavailableBanner':
    'We could not load some of your question content just now. Your timer and previously saved answers are not affected -- please contact support if this does not resolve itself shortly.',
  'exam.attempt.timerLabel': 'Time remaining',
  'exam.attempt.save.saving': 'Saving…',
  'exam.attempt.save.retrying': 'Saving your last answer…',
  'exam.attempt.save.justNow': 'Saved just now',
  'exam.attempt.save.secondsAgo': 'Saved {{seconds}}s ago',
  'exam.attempt.answeredSummary':
    '{{answered}} answered, {{unanswered}} remaining, {{flagged}} flagged for review',
  'exam.attempt.navigatorLabel': 'Question navigator',
  'exam.attempt.questionButtonLabel': 'Question {{number}}, {{status}}',
  'exam.attempt.status.answered': 'answered',
  'exam.attempt.status.unanswered': 'not answered',
  'exam.attempt.flaggedBadge': 'Flagged',
  'exam.attempt.progress': 'Question {{current}} of {{total}}',
  'exam.attempt.contentUnavailable':
    "This question's content could not be loaded. Your progress on other questions and your timer are not affected.",
  'exam.attempt.optionsLegend': 'Choose one answer',
  'exam.attempt.subjectiveLabel': 'Your answer',
  'exam.attempt.subjectivePlaceholder': 'Type your answer here…',
  'exam.attempt.flag': 'Flag for review',
  'exam.attempt.unflag': 'Remove flag',
  'exam.attempt.previous': 'Previous',
  'exam.attempt.next': 'Next',
  'exam.attempt.submitButton': 'Submit exam',
  'exam.attempt.waitingForSaves': 'Saving your last answer…',
  'exam.attempt.submitting': 'Submitting your exam…',
  'exam.attempt.retryingSubmit': 'Still submitting -- please stay on this page…',
  'exam.attempt.offlineMessage':
    "You're offline. Your answers are kept and will be saved automatically the moment you're back online.",
  'exam.attempt.confirmSubmit.title': 'Submit your exam?',
  'exam.attempt.confirmSubmit.body':
    'You have answered {{answered}} of {{total}} questions. Once submitted, your attempt is final and cannot be changed.',
  'exam.attempt.confirmSubmit.unansweredWarning':
    'You still have {{unanswered}} unanswered question(s). You can go back and answer them before submitting.',
  'exam.attempt.confirmSubmit.acknowledge':
    'I understand this is final and I cannot change my answers afterward.',
  'exam.attempt.confirmSubmit.cancel': 'Go back',
  'exam.attempt.confirmSubmit.confirm': 'Yes, submit my exam',
  'exam.attempt.sessionConflict.title': 'This exam is already open elsewhere',
  'exam.attempt.sessionConflict.body':
    'This exam attempt is already in progress in another tab or window on this device. To avoid losing or conflicting answers, please continue there and close this tab.',
  'exam.attempt.sessionConflict.goToDashboard': 'Go to dashboard',
  'exam.attempt.submitted.title': 'Your exam has been submitted',
  'exam.attempt.submitted.body':
    'Your answers have been received and your attempt is now locked. You will be notified once results are published.',
  'exam.attempt.submitted.goToDashboard': 'Return to dashboard',

  'postResult.documents.loading': 'Loading your document verification status…',
  'postResult.documents.error':
    'We could not load your document verification status. Please try again later.',
  'postResult.documents.title': 'Document verification',
  'postResult.documents.summary': '{{approved}} of {{total}} documents verified so far',
  'postResult.documents.none': 'No documents are on file for this application yet.',
  'postResult.documents.status.Pending': 'Under review',
  'postResult.documents.status.Approved': 'Verified',
  'postResult.documents.status.Rejected': 'Needs attention',

  'result.lookup.title': 'Check your result',
  'result.lookup.subtitle': 'Enter your application number to check your admission result.',
  'result.lookup.applicationNumber.label': 'Application number',
  'result.lookup.applicationNumber.required': 'Please enter your application number.',
  'result.lookup.privacyNote':
    "On a shared or public device, remember to close this window once you're done -- your result stays visible to anyone who knows your application number.",
  'result.lookup.submit': 'Check result',

  'result.check.checking.title': 'Checking your result…',
  'result.check.checking.body': 'This will only take a moment.',
  'result.check.queued.title': "You're in line",
  'result.check.queued.body':
    "A lot of people are checking their results right now, so we're taking turns to keep things running smoothly. You'll be taken to your result automatically -- no need to refresh.",
  'result.check.queued.position': 'Your position in line: {{position}}',
  'result.check.queued.estimatedWait': 'Estimated wait: about {{seconds}} seconds',
  'result.check.followerNotice': "You're already checking in another tab on this device.",
  'result.check.notPublished.title': 'Not published yet',
  'result.check.notPublished.body':
    'Your result has not been published yet. Please check back later.',
  'result.check.checkAgain': 'Check again',
  'result.check.error.title': 'Something went wrong',
  'result.check.error.body':
    'We could not check your result just now. Please try again in a moment.',
  'result.check.error.action': 'Back to result check',

  'result.reveal.admitted.title': 'Congratulations!',
  'result.reveal.admitted.body': 'You have been admitted.',
  'result.reveal.admitted.nextSteps':
    'Next, confirm your seat and pay the admission fee before the stated deadline.',
  'result.reveal.admitted.action': 'Continue to seat confirmation',
  'result.reveal.meritRank': 'Your merit position: {{rank}}',
  'result.reveal.waitlisted.title': "You're on the waitlist",
  'result.reveal.waitlisted.body':
    'You have not been admitted yet, but you are on the waitlist for your applied program(s), based on your submitted preference order and merit position.',
  'result.reveal.waitlisted.nextSteps':
    "We'll notify you if a seat becomes available. No action is needed from you right now.",
  'result.reveal.waitlistRank': 'Your waitlist position: {{rank}}',
  'result.reveal.notAdmitted.title': 'Your result is ready',
  'result.reveal.notAdmitted.body':
    'You have not been admitted this time, based on your submitted preference order and merit position.',
  'result.reveal.notAdmitted.nextSteps':
    'Thank you for applying. Please watch for information on future admission cycles.',
};
