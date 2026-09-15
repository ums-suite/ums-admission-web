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
};
