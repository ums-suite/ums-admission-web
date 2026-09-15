import {
  formatRemainingTime,
  isAnnouncementCheckpoint,
  remainingTimeAnnouncement,
  timerTone,
} from './exam-timer.util';

describe('exam-timer.util', () => {
  describe('timerTone', () => {
    it('is neutral well before the warning threshold', () => {
      expect(timerTone(30 * 60 * 1000)).toBe('neutral');
    });

    it('is warning at exactly 5 minutes remaining', () => {
      expect(timerTone(5 * 60 * 1000)).toBe('warning');
    });

    it('is warning just above the critical threshold', () => {
      expect(timerTone(61 * 1000)).toBe('warning');
    });

    it('is critical at exactly 1 minute remaining', () => {
      expect(timerTone(60 * 1000)).toBe('critical');
    });

    it('is critical at zero', () => {
      expect(timerTone(0)).toBe('critical');
    });
  });

  describe('formatRemainingTime', () => {
    it('formats sub-hour durations as mm:ss', () => {
      expect(formatRemainingTime(65 * 1000)).toBe('1:05');
    });

    it('pads seconds under 10', () => {
      expect(formatRemainingTime(9 * 1000)).toBe('0:09');
    });

    it('formats durations at or above one hour as h:mm:ss', () => {
      expect(formatRemainingTime(90 * 60 * 1000)).toBe('1:30:00');
    });

    it('floors rather than rounds up', () => {
      expect(formatRemainingTime(1999)).toBe('0:01');
    });

    it('never goes negative', () => {
      expect(formatRemainingTime(-500)).toBe('0:00');
    });
  });

  describe('remainingTimeAnnouncement', () => {
    it('announces minutes when whole', () => {
      expect(remainingTimeAnnouncement(5 * 60 * 1000)).toBe('5 minutes remaining.');
    });

    it('announces singular minute correctly', () => {
      expect(remainingTimeAnnouncement(60 * 1000)).toBe('1 minute remaining.');
    });

    it('announces seconds only in the final minute', () => {
      expect(remainingTimeAnnouncement(10 * 1000)).toBe('10 seconds remaining.');
    });

    it('announces time is up at zero', () => {
      expect(remainingTimeAnnouncement(0)).toBe('Time is up.');
    });
  });

  describe('isAnnouncementCheckpoint', () => {
    it('is a checkpoint every 5 minutes above the 5-minute mark', () => {
      expect(isAnnouncementCheckpoint(10 * 60 * 1000)).toBeTrue();
      expect(isAnnouncementCheckpoint(9 * 60 * 1000)).toBeFalse();
    });

    it('is a checkpoint every minute inside the final 5 minutes', () => {
      expect(isAnnouncementCheckpoint(3 * 60 * 1000)).toBeTrue();
      expect(isAnnouncementCheckpoint(3 * 60 * 1000 + 30 * 1000)).toBeFalse();
    });

    it('is a checkpoint every 10 seconds inside the final minute', () => {
      expect(isAnnouncementCheckpoint(30 * 1000)).toBeTrue();
      expect(isAnnouncementCheckpoint(35 * 1000)).toBeFalse();
    });

    it('is a checkpoint at exactly zero', () => {
      expect(isAnnouncementCheckpoint(0)).toBeTrue();
    });
  });
});
