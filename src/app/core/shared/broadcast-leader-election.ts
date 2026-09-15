import { signal } from '@angular/core';

interface ClaimMessage {
  readonly kind: 'claim';
  readonly instanceId: string;
  readonly claimedAtMs: number;
}

interface StateMessage<T> {
  readonly kind: 'state';
  readonly payload: T;
}

type ChannelMessage<T> = ClaimMessage | StateMessage<T>;

/**
 * A same-instant claim race is only actually resolved once every other same-device tab's own
 * claim message has had a chance to arrive -- `BroadcastChannel` delivery is asynchronous even to
 * instances created moments apart, so `isLeader()` briefly reads `true` for every tab immediately
 * after construction, before any competing claim can possibly have been received. Callers MUST
 * wait for {@link BroadcastLeaderElection.settled} before treating {@link
 * BroadcastLeaderElection.isLeader} as reliable for anything that actually matters (e.g. deciding
 * whether to make a real network call) -- reading `isLeader()` before settling defeats the whole
 * point of election (every tab would see itself as the leader and none would back off). A generous
 * but still-imperceptible fixed delay, not configurable per instance -- this is an implementation
 * detail of the handshake, not a tuning knob callers should need to think about.
 */
const SETTLE_DELAY_MS = 150;

/**
 * Same-device, same-`channelName` `BroadcastChannel` leader election (design-decisions.md
 * "Same-Device Cross-Tab Leader Election"; `edge-cases.md`'s "Two Browser Tabs Both Polling/
 * Retrying the Same Applicant's Result-Check or Waiting-Room Session", AWEB-27). Extracted as a
 * small, independently-testable, general-purpose primitive rather than duplicated inline --
 * `ExamSessionStore`'s own `setupSessionLock` (AWEB-25, see its class doc) already implements
 * this exact "first announcement wins, everyone else detects a conflict" algorithm for the
 * analogous exam-attempt two-tab case; this class is the same approach reused for a second,
 * unrelated consumer (the result/waiting-room screens) rather than a copy-pasted duplicate of
 * `ExamSessionStore`'s own private, exam-attempt-specific implementation.
 *
 * Beyond plain leader/follower election, this also carries an optional one-way leader-to-
 * followers state broadcast ({@link broadcastState}/{@link latestState}) -- the result/waiting-
 * room edge case specifically requires "a follower tab renders the leader's state" (not just
 * "knows it isn't the leader"), which the exam-attempt use case never needed.
 *
 * Fails open to "I'm the leader" when `BroadcastChannel` doesn't exist (very old browsers,
 * §4's low-end-device NFR) -- every tab independently polling in that rare case is a strictly
 * better fallback than every tab silently doing nothing.
 *
 * Not `providedIn: 'root'` -- construct one instance per logical session (e.g. one per applicant's
 * waiting-room visit), scoped to that screen's own lifetime, exactly like `ExamSessionStore`'s own
 * per-attempt scoping. Call {@link close} when the owning component is destroyed.
 */
export class BroadcastLeaderElection<T = unknown> {
  private readonly instanceId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  private claimedAtMs = 0;
  private channel: BroadcastChannel | null = null;

  private readonly isLeaderInternal = signal(true);
  private readonly latestStateInternal = signal<T | null>(null);
  private readonly settledInternal = signal(false);
  private settleTimeoutId: ReturnType<typeof setTimeout> | null = null;

  /** True until another tab is discovered to have claimed leadership first. Unreliable before {@link settled} -- see this module's own note above. */
  readonly isLeader = this.isLeaderInternal.asReadonly();
  /** The most recent state a leader tab broadcast via {@link broadcastState} -- `null` until the first one arrives. */
  readonly latestState = this.latestStateInternal.asReadonly();
  /** Flips to `true` once every other same-device tab's own claim has had a chance to arrive -- see this module's own note above. */
  readonly settled = this.settledInternal.asReadonly();

  constructor(private readonly channelName: string) {
    this.claim();
    this.settleTimeoutId = setTimeout(() => this.settledInternal.set(true), SETTLE_DELAY_MS);
  }

  /** Leader-only by convention (the caller decides when to call this based on {@link isLeader}) -- a follower calling it is harmless but pointless, since no one is listening for a follower's own state. */
  broadcastState(payload: T): void {
    this.latestStateInternal.set(payload);
    this.channel?.postMessage({ kind: 'state', payload } satisfies StateMessage<T>);
  }

  close(): void {
    if (this.settleTimeoutId !== null) {
      clearTimeout(this.settleTimeoutId);
      this.settleTimeoutId = null;
    }
    this.channel?.close();
    this.channel = null;
  }

  private claim(): void {
    if (typeof BroadcastChannel === 'undefined') {
      return;
    }
    this.claimedAtMs = Date.now();
    this.channel = new BroadcastChannel(this.channelName);
    this.channel.onmessage = (event: MessageEvent<ChannelMessage<T>>) => {
      const message = event.data;
      if (message.kind === 'state') {
        this.latestStateInternal.set(message.payload);
        return;
      }
      if (message.instanceId === this.instanceId) {
        return;
      }
      const otherClaimedFirst =
        message.claimedAtMs < this.claimedAtMs ||
        (message.claimedAtMs === this.claimedAtMs && message.instanceId < this.instanceId);
      if (otherClaimedFirst) {
        this.isLeaderInternal.set(false);
      } else {
        // We claimed first -- re-announce so the later tab (re)detects the conflict, including one
        // that joins after our very first announcement (mirrors ExamSessionStore's identical note).
        this.channel?.postMessage({
          kind: 'claim',
          instanceId: this.instanceId,
          claimedAtMs: this.claimedAtMs,
        } satisfies ClaimMessage);
      }
    };
    this.channel.postMessage({
      kind: 'claim',
      instanceId: this.instanceId,
      claimedAtMs: this.claimedAtMs,
    } satisfies ClaimMessage);
  }
}
