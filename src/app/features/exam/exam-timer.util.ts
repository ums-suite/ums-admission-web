/**
 * Pure countdown-timer presentation logic for the exam in-progress screen (AWEB-22,
 * requirement-spec.md §7 "The exam screen"). Kept free of components/signals so it is trivially
 * unit-testable, mirroring `payment-idempotency.ts`'s "pure logic lives outside the component"
 * convention.
 *
 * The actual remaining-time *value* always comes from {@link ExamSessionStore.remainingMs}
 * (Domain Invariant #2, server-clock-authoritative) -- this module only ever formats/classifies
 * that already-authoritative number, never computes or adjusts it.
 */

export type TimerTone = 'neutral' | 'warning' | 'critical';

/** §7: "color transitions gradually (neutral -> amber -> a restrained red), never a jarring flash". */
const WARNING_THRESHOLD_MS = 5 * 60 * 1000;
const CRITICAL_THRESHOLD_MS = 60 * 1000;

/** `remainingMs` -> which of the three gradual visual tones the timer should render in. */
export function timerTone(remainingMs: number): TimerTone {
  if (remainingMs <= CRITICAL_THRESHOLD_MS) {
    return 'critical';
  }
  if (remainingMs <= WARNING_THRESHOLD_MS) {
    return 'warning';
  }
  return 'neutral';
}

/** `mm:ss` below one hour of remaining time, `h:mm:ss` at or above -- always floored, never rounded up past the true remaining time. */
export function formatRemainingTime(remainingMs: number): string {
  const totalSeconds = Math.floor(Math.max(0, remainingMs) / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number): string => n.toString().padStart(2, '0');

  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${minutes}:${pad(seconds)}`;
}

/**
 * `NFR §4`: "screen-reader-friendly timer announcements" -- announcing every one-second tick
 * would be unusable noise for a screen-reader user, so the live-region text this function
 * produces is only meant to be pushed into the DOM at meaningful checkpoints (see
 * `exam-attempt.component.ts`'s own `shouldAnnounce` gate), never on every tick.
 */
export function remainingTimeAnnouncement(remainingMs: number): string {
  const totalSeconds = Math.ceil(Math.max(0, remainingMs) / 1000);
  if (totalSeconds <= 0) {
    return 'Time is up.';
  }
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) {
    return `${seconds} second${seconds === 1 ? '' : 's'} remaining.`;
  }
  if (seconds === 0) {
    return `${minutes} minute${minutes === 1 ? '' : 's'} remaining.`;
  }
  return `${minutes} minute${minutes === 1 ? '' : 's'} remaining.`;
}

/**
 * Which whole-minute/whole-ten-second checkpoints get announced (throttled, per this module's own
 * class doc) -- every 5 minutes normally, every minute inside the final 5, and every 10 seconds
 * inside the final minute, plus the exact zero instant.
 */
export function isAnnouncementCheckpoint(remainingMs: number): boolean {
  const totalSeconds = Math.round(remainingMs / 1000);
  if (totalSeconds <= 0) {
    return remainingMs <= 0;
  }
  if (totalSeconds <= 60) {
    return totalSeconds % 10 === 0;
  }
  if (totalSeconds <= 5 * 60) {
    return totalSeconds % 60 === 0;
  }
  return totalSeconds % (5 * 60) === 0;
}
