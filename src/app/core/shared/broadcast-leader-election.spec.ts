import { BroadcastLeaderElection } from './broadcast-leader-election';

/**
 * Mirrors `ExamSessionStore`'s own session-conflict spec's testing approach exactly (see its class
 * doc): rather than juggling two real `BroadcastChannel` instances' genuinely-async message
 * dispatch, this simulates an incoming message by invoking the private channel's `onmessage`
 * handler directly with crafted data -- deterministic and synchronous.
 */
describe('BroadcastLeaderElection', () => {
  function channelOf<T>(election: BroadcastLeaderElection<T>): BroadcastChannel {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (election as any).channel as BroadcastChannel;
  }

  function claimedAtMsOf(election: BroadcastLeaderElection): number {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (election as any).claimedAtMs as number;
  }

  function instanceIdOf(election: BroadcastLeaderElection): string {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (election as any).instanceId as string;
  }

  beforeEach(() => {
    jasmine.clock().install();
  });

  afterEach(() => {
    jasmine.clock().uninstall();
    (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel ??= BroadcastChannel;
  });

  it('is not settled immediately, and settles after the handshake delay', () => {
    const election = new BroadcastLeaderElection('test-channel-settle');
    expect(election.settled()).toBeFalse();

    jasmine.clock().tick(200);

    expect(election.settled()).toBeTrue();
    election.close();
  });

  it('starts as leader', () => {
    const election = new BroadcastLeaderElection('test-channel-1');
    expect(election.isLeader()).toBeTrue();
    election.close();
  });

  it('yields leadership when an earlier-claiming instance is heard from', () => {
    const election = new BroadcastLeaderElection('test-channel-2');
    const myClaimedAtMs = claimedAtMsOf(election);

    channelOf(election).onmessage?.({
      data: { kind: 'claim', instanceId: 'earlier', claimedAtMs: myClaimedAtMs - 1000 },
    } as MessageEvent);

    expect(election.isLeader()).toBeFalse();
    election.close();
  });

  it('keeps leadership and re-announces when a later-claiming instance is heard from', () => {
    const election = new BroadcastLeaderElection('test-channel-3');
    const myClaimedAtMs = claimedAtMsOf(election);
    const postSpy = spyOn(channelOf(election), 'postMessage');

    channelOf(election).onmessage?.({
      data: { kind: 'claim', instanceId: 'later', claimedAtMs: myClaimedAtMs + 1000 },
    } as MessageEvent);

    expect(election.isLeader()).toBeTrue();
    expect(postSpy).toHaveBeenCalled();
    election.close();
  });

  it('ignores its own echoed claim message', () => {
    const election = new BroadcastLeaderElection('test-channel-4');
    const myClaimedAtMs = claimedAtMsOf(election);
    const myInstanceId = instanceIdOf(election);

    channelOf(election).onmessage?.({
      data: { kind: 'claim', instanceId: myInstanceId, claimedAtMs: myClaimedAtMs },
    } as MessageEvent);

    expect(election.isLeader()).toBeTrue();
    election.close();
  });

  it('breaks a same-instant tie deterministically by instanceId', () => {
    const election = new BroadcastLeaderElection('test-channel-5');
    const myClaimedAtMs = claimedAtMsOf(election);
    const myInstanceId = instanceIdOf(election);

    channelOf(election).onmessage?.({
      data: { kind: 'claim', instanceId: `!${myInstanceId}`, claimedAtMs: myClaimedAtMs },
    } as MessageEvent);

    expect(election.isLeader()).toBeFalse();
    election.close();
  });

  it('exposes a leader-broadcast state to followers', () => {
    const election = new BroadcastLeaderElection<{ queuePosition: number }>('test-channel-6');
    expect(election.latestState()).toBeNull();

    channelOf(election).onmessage?.({
      data: { kind: 'state', payload: { queuePosition: 7 } },
    } as MessageEvent);

    expect(election.latestState()).toEqual({ queuePosition: 7 });
    election.close();
  });

  it('broadcastState updates its own latestState and posts to the channel', () => {
    const election = new BroadcastLeaderElection<{ queuePosition: number }>('test-channel-7');
    const postSpy = spyOn(channelOf(election), 'postMessage');

    election.broadcastState({ queuePosition: 3 });

    expect(election.latestState()).toEqual({ queuePosition: 3 });
    expect(postSpy).toHaveBeenCalledWith({ kind: 'state', payload: { queuePosition: 3 } });
    election.close();
  });

  it('gracefully fails open to leader when BroadcastChannel is unsupported', () => {
    const original = (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel;
    (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel = undefined;
    try {
      const election = new BroadcastLeaderElection('test-channel-8');
      expect(election.isLeader()).toBeTrue();
      expect(() => election.broadcastState('x')).not.toThrow();
      election.close();
    } finally {
      (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel = original;
    }
  });
});
