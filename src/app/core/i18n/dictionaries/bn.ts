import type { TranslationDictionary } from '../translation-dictionary.types';

/**
 * Bengali UI-string dictionary (ADR-0011, `ums-requirements.md` §4.1). Any key not yet
 * translated here is intentionally omitted rather than duplicated with English text --
 * `TranslationService` falls back to `en.ts` for a missing key, matching the server-side
 * translation-table fallback convention (ums-conventions.md "Localization Implementation").
 */
export const BN_TRANSLATIONS: TranslationDictionary = {
  'marketing.appName': 'ইউএমএস ভর্তি',
  'marketing.tagline': 'আবেদনকারী ভর্তি পোর্টাল — নিবন্ধন, আবেদন, পরীক্ষা এবং ফলাফল।',
  'common.stepProgress': 'ধাপ {{current}} এর {{total}}',

  'registration.title': 'আপনার আবেদনকারী অ্যাকাউন্ট তৈরি করুন',
  'registration.subtitle': 'কিছু মৌলিক তথ্য দিয়ে শুরু করা যাক।',
  'registration.givenName.label': 'নামের প্রথম অংশ',
  'registration.familyName.label': 'নামের শেষ অংশ',
  'registration.email.label': 'ইমেইল',
  'registration.mobile.label': 'মোবাইল নম্বর (ঐচ্ছিক)',
  'registration.dateOfBirth.label': 'জন্ম তারিখ',
  'registration.submit': 'অ্যাকাউন্ট তৈরি করুন',
  'registration.submitting': 'অ্যাকাউন্ট তৈরি করা হচ্ছে…',
  'registration.serverError.generic':
    'কিছু একটা ভুল হয়েছে। আপনার তথ্য যাচাই করে আবার চেষ্টা করুন।',

  'validation.givenName.required': 'অনুগ্রহ করে আপনার নামের প্রথম অংশ লিখুন।',
  'validation.familyName.required': 'অনুগ্রহ করে আপনার নামের শেষ অংশ লিখুন।',
  'validation.email.required': 'অনুগ্রহ করে আপনার ইমেইল ঠিকানা লিখুন।',
  'validation.email.invalid': 'অনুগ্রহ করে একটি সঠিক ইমেইল ঠিকানা লিখুন।',
  'validation.mobile.invalid': 'অনুগ্রহ করে একটি সঠিক মোবাইল নম্বর লিখুন।',
  'validation.dateOfBirth.required': 'অনুগ্রহ করে আপনার জন্ম তারিখ লিখুন।',
  'validation.dateOfBirth.future': 'জন্ম তারিখ ভবিষ্যতের হতে পারে না।',

  'otp.title': 'আপনার ইমেইল যাচাই করুন',
  'otp.subtitle': 'আমরা {{destination}} ঠিকানায় একটি ৬-সংখ্যার যাচাইকরণ কোড পাঠাব।',
  'otp.useMobileInstead': 'পরিবর্তে মোবাইল নম্বর দিয়ে যাচাই করুন',
  'otp.useEmailInstead': 'পরিবর্তে ইমেইল দিয়ে যাচাই করুন',
  'otp.sendCode': 'কোড পাঠান',
  'otp.sending': 'পাঠানো হচ্ছে…',
  'otp.codeSentTo': 'আমরা {{destination}} ঠিকানায় একটি ৬-সংখ্যার কোড পাঠিয়েছি।',
  'otp.resend': 'কোড আবার পাঠান',
  'otp.resendIn': '{{seconds}} সেকেন্ড পর আবার পাঠানো যাবে',
  'otp.verify': 'যাচাই করুন',
  'otp.verifying': 'যাচাই করা হচ্ছে…',
  'otp.serverError.generic':
    'কোডটি কাজ করেনি। এটি পরীক্ষা করে আবার চেষ্টা করুন, অথবা একটি নতুন কোড অনুরোধ করুন।',

  'registration.complete.title': 'আপনার নিবন্ধন সম্পন্ন হয়েছে',
  'registration.complete.body':
    'আপনার আবেদনকারী অ্যাকাউন্ট তৈরি হয়েছে এবং আপনার যোগাযোগের তথ্য যাচাই করা হয়েছে। সাইন ইন করার পরবর্তী ধাপ সম্পর্কে আমরা শীঘ্রই আপনাকে জানাব।',

  'login.title': 'সাইন ইন করুন',
  'login.subtitle': 'স্বাগতম — আপনার আবেদন চালিয়ে যেতে সাইন ইন করুন।',
  'login.identifier.label': 'ইমেইল বা ইউজারনেম',
  'login.password.label': 'পাসওয়ার্ড',
  'login.submit': 'সাইন ইন',
  'login.submitting': 'সাইন ইন করা হচ্ছে…',
  'login.serverError.generic': 'এই তথ্য দিয়ে সাইন ইন করা যায়নি। আবার চেষ্টা করুন।',
  'validation.identifier.required': 'অনুগ্রহ করে আপনার ইমেইল বা ইউজারনেম লিখুন।',
  'validation.password.required': 'অনুগ্রহ করে আপনার পাসওয়ার্ড লিখুন।',

  'profile.loading': 'আপনার প্রোফাইল লোড হচ্ছে…',
  'profile.title': 'আপনার প্রোফাইল সম্পূর্ণ করুন',
  'profile.subtitle':
    'আবেদন শুরু করার আগে আরও কিছু তথ্য — আপনার বর্তমান ঠিকানা এবং প্রযোজ্য ক্ষেত্রে আপনার অভিভাবক।',
  'profile.presentAddress.label': 'বর্তমান ঠিকানা',
  'profile.guardian.heading': 'অভিভাবকের তথ্য',
  'profile.guardian.hint':
    'আপনার আবেদনকৃত ক্যাম্পেইনে অভিভাবকের তথ্য প্রয়োজন হলে নিচের তিনটি ঘরই পূরণ করুন।',
  'profile.guardianName.label': 'অভিভাবকের নাম',
  'profile.guardianRelation.label': 'আপনার সাথে সম্পর্ক',
  'profile.guardianContact.label': 'অভিভাবকের ফোন বা ইমেইল',
  'profile.save': 'প্রোফাইল সংরক্ষণ করুন',
  'profile.saving': 'সংরক্ষণ করা হচ্ছে…',
  'profile.saved': 'আপনার প্রোফাইল সংরক্ষণ করা হয়েছে।',
  'profile.continueToWizard': 'আবেদনে এগিয়ে যান',
  'profile.loadError': 'আপনার প্রোফাইল লোড করা যায়নি। পাতাটি রিফ্রেশ করে আবার চেষ্টা করুন।',
  'profile.serverError.generic': 'সংরক্ষণের সময় কিছু একটা ভুল হয়েছে। আবার চেষ্টা করুন।',

  'validation.presentAddress.required': 'অনুগ্রহ করে আপনার বর্তমান ঠিকানা লিখুন।',
  'validation.guardianName.required': 'অনুগ্রহ করে আপনার অভিভাবকের নাম লিখুন।',
  'validation.guardianRelation.required': 'অনুগ্রহ করে আপনার অভিভাবকের সাথে সম্পর্ক লিখুন।',
  'validation.guardianContact.required':
    'অনুগ্রহ করে আপনার অভিভাবকের সাথে যোগাযোগের একটি উপায় লিখুন।',

  'wizard.loading': 'আপনার আবেদন লোড হচ্ছে…',
  'wizard.next': 'পরবর্তী',
  'wizard.back': 'পেছনে',
  'wizard.deadlinePassed':
    'এই ক্যাম্পেইনের আবেদনের সময়সীমা শেষ হয়ে গেছে। আর কোনো পরিবর্তন বা জমা দেওয়া সম্ভব নয়।',
  'wizard.step.programChoices': 'প্রোগ্রাম পছন্দ',
  'wizard.step.academicHistory': 'শিক্ষাগত ইতিহাস',
  'wizard.step.documents': 'ডকুমেন্ট',
  'wizard.step.review': 'পর্যালোচনা ও জমা দিন',

  'wizard.programChoices.title': 'আপনার প্রোগ্রাম নির্বাচন করুন',
  'wizard.programChoices.subtitle':
    'আপনি যেসব প্রোগ্রামে আবেদন করতে চান তা পছন্দের ক্রম অনুসারে যোগ করুন। জমা দেওয়ার আগে যেকোনো সময় ক্রম পরিবর্তন বা মুছে ফেলতে পারবেন।',
  'wizard.programChoices.loading': 'উপলব্ধ প্রোগ্রামগুলো লোড হচ্ছে…',
  'wizard.programChoices.addPlaceholder': 'যোগ করার জন্য একটি প্রোগ্রাম নির্বাচন করুন',
  'wizard.programChoices.add': 'যোগ করুন',
  'wizard.programChoices.moveUp': 'উপরে সরান',
  'wizard.programChoices.moveDown': 'নিচে সরান',
  'wizard.programChoices.remove': 'মুছে ফেলুন',
  'wizard.programChoices.required': 'অনুগ্রহ করে অন্তত একটি প্রোগ্রাম নির্বাচন করুন।',
  'wizard.programChoices.serverError':
    'আপনার প্রোগ্রাম পছন্দ সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।',
  'wizard.programChoices.eligibilityKnown': 'এই প্রোগ্রামে যোগ্যতার নিয়ম প্রযোজ্য',

  'wizard.academicHistory.title': 'আপনার শিক্ষাগত ইতিহাস',
  'wizard.academicHistory.subtitle':
    'আপনার যোগ্যতার সাথে সম্পর্কিত প্রতিটি পরীক্ষার ফলাফল যোগ করুন।',
  'wizard.academicHistory.examName.label': 'পরীক্ষার নাম',
  'wizard.academicHistory.board.label': 'বোর্ড/বিশ্ববিদ্যালয়',
  'wizard.academicHistory.passingYear.label': 'পাসের সাল',
  'wizard.academicHistory.score.label': 'ফলাফল',
  'wizard.academicHistory.scale.label': 'ফলাফলের ধরন',
  'wizard.academicHistory.scale.gpa': 'জিপিএ',
  'wizard.academicHistory.scale.percentage': 'শতাংশ',
  'wizard.academicHistory.add': 'রেকর্ড যোগ করুন',
  'wizard.academicHistory.remove': 'মুছে ফেলুন',
  'wizard.academicHistory.required': 'অনুগ্রহ করে অন্তত একটি শিক্ষাগত রেকর্ড যোগ করুন।',
  'wizard.academicHistory.serverError':
    'আপনার একটি শিক্ষাগত রেকর্ড সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।',

  'wizard.documents.title': 'আপনার ডকুমেন্ট আপলোড করুন',
  'wizard.documents.subtitle':
    'নিচের প্রতিটি প্রয়োজনীয় ডকুমেন্ট আপলোড করুন। ফাইল সরাসরি ও নিরাপদে আপলোড হয় — কিছু ঠিক করার প্রয়োজন হলে আমরা সাথে সাথে জানিয়ে দেব।',
  'wizard.documents.registerError':
    'আপনার ফাইল সফলভাবে আপলোড হয়েছে কিন্তু আবেদনের সাথে যুক্ত করা যায়নি। আবার চেষ্টা করুন।',

  'wizard.review.title': 'আপনার আবেদন পর্যালোচনা করুন',
  'wizard.review.summary.title': 'আবেদনের সারসংক্ষেপ',
  'wizard.review.summary.status': 'অবস্থা',
  'wizard.review.summary.programChoices': 'প্রোগ্রাম পছন্দ',
  'wizard.review.summary.documents': 'ডকুমেন্ট',
  'wizard.review.lockWarning':
    'একবার জমা দিলে আপনার আবেদন লক হয়ে যাবে এবং আর কোনো পরিবর্তন করা যাবে না।',
  'wizard.review.alreadyLocked': 'আপনার আবেদন ইতিমধ্যে জমা দেওয়া ও লক করা হয়েছে।',
  'wizard.review.submit': 'আবেদন জমা দিন',
  'wizard.review.confirmTitle': 'আপনার আবেদন জমা দিয়ে লক করবেন?',
  'wizard.review.confirmDescription':
    'এটি পূর্বাবস্থায় ফেরানো যাবে না। একবার জমা দিলে আপনার আবেদন লক হয়ে যাবে এবং আর কোনো পরিবর্তন সম্ভব নয়। অনুগ্রহ করে উপরের সবকিছু সঠিক কিনা নিশ্চিত করুন।',
  'wizard.review.confirmSubmit': 'হ্যাঁ, জমা দিয়ে লক করুন',
  'wizard.review.confirmCancel': 'ফিরে গিয়ে আবার পর্যালোচনা করুন',
  'wizard.review.serverError': 'আপনার আবেদন জমা দেওয়া যায়নি। আবার চেষ্টা করুন।',

  'payment.method.loading': 'আপনার পেমেন্টের তথ্য লোড হচ্ছে…',
  'payment.method.alreadyPaid': 'আপনার আবেদন ফি ইতিমধ্যে পরিশোধ করা হয়েছে।',
  'payment.method.attemptInProgress':
    'এই আবেদনের একটি পেমেন্ট ইতিমধ্যে নিশ্চিত করা হচ্ছে। অনুগ্রহ করে অপেক্ষা করুন — সম্পন্ন হওয়ার সাথে সাথে আমরা আপনাকে জানাব।',
  'payment.method.title': 'আপনার আবেদন ফি পরিশোধ করুন',
  'payment.method.amountTitle': 'পরিশোধযোগ্য পরিমাণ',
  'payment.method.submit': 'এখনই পরিশোধ করুন',
  'payment.method.submitting': 'পেমেন্ট শুরু হচ্ছে…',
  'payment.method.serverError': 'আপনার পেমেন্ট শুরু করা যায়নি। আবার চেষ্টা করুন।',

  'payment.confirmation.waiting.title': 'আপনার পেমেন্ট নিশ্চিত করা হচ্ছে',
  'payment.confirmation.waiting.body':
    'অনুগ্রহ করে এই উইন্ডোটি বন্ধ করবেন না। আমরা আপনার পেমেন্ট প্রদানকারীর নিশ্চিতকরণের জন্য অপেক্ষা করছি — এটি সাধারণত কয়েক মুহূর্ত সময় নেয়।',
  'payment.confirmation.success.title': 'পেমেন্ট নিশ্চিত হয়েছে',
  'payment.confirmation.success.body': 'আপনার আবেদন ফি পেমেন্ট নিশ্চিত করা হয়েছে।',
  'payment.confirmation.success.action': 'এগিয়ে যান',
  'payment.confirmation.failed.title': 'পেমেন্ট সফল হয়নি',
  'payment.confirmation.failed.body':
    'আপনার পেমেন্ট সম্পন্ন করা যায়নি। এই চেষ্টার জন্য কোনো অর্থ কাটা হয়নি। আপনি একই বা ভিন্ন পদ্ধতিতে আবার চেষ্টা করতে পারেন।',
  'payment.confirmation.failed.action': 'আবার চেষ্টা করুন',
  'payment.confirmation.notFound.title': 'আমরা সেই পেমেন্ট চেষ্টাটি খুঁজে পাইনি',
  'payment.confirmation.notFound.body':
    'আপনি অন্য কোনোভাবে এই পাতায় ফিরে এলে এমনটি হতে পারে। আপনার অর্থ নিরাপদ আছে — আসুন আপনাকে পেমেন্টে ফিরিয়ে নিয়ে যাই।',
  'payment.confirmation.notFound.action': 'পেমেন্টে যান',

  'admitCard.loading': 'আপনার প্রবেশপত্র লোড হচ্ছে…',
  'admitCard.title': 'প্রবেশপত্র',
  'admitCard.notAvailable.body':
    'আপনার পরীক্ষার স্লট নির্ধারিত হওয়ার এবং আবেদন ফি নিশ্চিত হওয়ার পর আপনার প্রবেশপত্র এখানে পাওয়া যাবে।',
  'admitCard.preparing.body':
    'আপনার প্রবেশপত্র প্রস্তুত করা হচ্ছে। এটি সাধারণত অল্প সময় নেয় — অনুগ্রহ করে আবার দেখুন।',
  'admitCard.failed.body':
    'আমরা আপনার প্রবেশপত্র তৈরি করতে পারিনি। অনুগ্রহ করে সহায়তার সাথে যোগাযোগ করুন — এতে আপনার পরীক্ষার স্লট প্রভাবিত হয় না।',
  'admitCard.details.title': 'আপনার পরীক্ষার তথ্য',
  'admitCard.rollNumber': 'রোল নম্বর',
  'admitCard.testSlot': 'পরীক্ষার স্লট',
  'admitCard.verificationId': 'যাচাইকরণ কোড',
  'admitCard.download': 'প্রবেশপত্র ডাউনলোড করুন',
  'admitCard.error': 'আপনার প্রবেশপত্র লোড করা যায়নি। পরে আবার চেষ্টা করুন।',
};
