import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UmsButtonComponent } from '@ums/design-system';
import type { UmsApiError } from '@ums/shared';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { BroadcastLeaderElection } from '../../core/shared/broadcast-leader-election';
import { QueueStateService } from '../../core/http/queue-state.service';
import { QueueingRequiredError } from '../../core/http/queueing-required.error';
import { ResultApi } from './result.api';
import { isWellFormedResult, type AdmissionResultSearchDto } from './result.types';

type ResultCheckState = 'checking' | 'not-published' | 'queued' | 'published' | 'error';

interface MirroredState {
  readonly state: ResultCheckState;
  readonly result: AdmissionResultSearchDto | null;
}

/**
 * Result-check screen, covering both AWEB-27 (waiting-room UI) and AWEB-28 (result reveal) as one
 * continuous state machine -- mirrors `PaymentConfirmationComponent`'s own established pattern of
 * one component owning a "waiting -> resolved outcome" flow's every state, rather than splitting
 * a single continuous wait-then-reveal experience across a route boundary.
 *
 * **AWEB-27 (waiting room, Domain Invariant #6)**: a `QueueingRequiredError` (AWEB-7's
 * `queueingInterceptor`) is the only thing that ever puts this screen in the `'queued'` state --
 * `edge-cases.md`'s "An Early 'Your Turn' Signal..." decision is honored by scheduling the next
 * check at exactly `QueueStatus.nextPollMs` (server-suggested when available, see
 * `queue-status.types.ts`), never a fixed client-side interval.
 *
 * **Same-device leader election** (design-decisions.md, `edge-cases.md`'s "Two Browser Tabs..."):
 * {@link BroadcastLeaderElection} reuses the exact pattern `ExamSessionStore` already established
 * for the analogous exam-attempt case. Only the leader tab actually calls {@link ResultApi}; every
 * other same-device tab renders the leader's broadcast state instead of independently polling,
 * halving (or more) this applicant's own contribution to result-day load.
 *
 * **AWEB-28 (reveal, Domain Invariants #5/#7)**: `'published'` is reached ONLY via
 * {@link isWellFormedResult} (see `result.types.ts`'s class doc for the confirmed gap this
 * compensates for -- the real endpoint has no explicit readiness field). The admitted and
 * not-admitted branches in the template are two equally-detailed branches of one component, never
 * a happy path with a bare fallback, per Domain Invariant #7.
 */
@Component({
  selector: 'app-result-check',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UmsButtonComponent, TranslatePipe],
  templateUrl: './result-check.component.html',
  styleUrl: './result-check.component.scss',
})
export class ResultCheckComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly resultApi = inject(ResultApi);
  private readonly queueState = inject(QueueStateService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly applicationNumber = signal<string | null>(null);
  protected readonly state = signal<ResultCheckState>('checking');
  protected readonly result = signal<AdmissionResultSearchDto | null>(null);
  protected readonly queueInfo = this.queueState.current;

  private readonly leaderElection = signal<BroadcastLeaderElection<MirroredState> | null>(null);
  private retryTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private hasStartedChecking = false;

  protected readonly isFollower = computed(() => this.leaderElection()?.isLeader() === false);

  protected readonly effectiveState = computed<ResultCheckState>(() => {
    if (this.isFollower()) {
      return this.leaderElection()?.latestState()?.state ?? 'checking';
    }
    return this.state();
  });

  protected readonly effectiveResult = computed<AdmissionResultSearchDto | null>(() => {
    if (this.isFollower()) {
      return this.leaderElection()?.latestState()?.result ?? null;
    }
    return this.result();
  });

  constructor() {
    // See BroadcastLeaderElection's own class doc: `isLeader()` is unreliable until `settled()`
    // is true (every tab reads `isLeader() === true` for a brief window right after
    // construction, before a competing tab's own claim could possibly have arrived) -- this
    // effect is what actually starts the leader's real network activity, exactly once, only once
    // settling confirms this tab genuinely is the leader.
    effect(() => {
      const election = this.leaderElection();
      const applicationNumber = this.applicationNumber();
      if (!election || !applicationNumber || this.hasStartedChecking || !election.settled()) {
        return;
      }
      if (election.isLeader()) {
        this.hasStartedChecking = true;
        this.performCheck(applicationNumber);
      }
    });
  }

  ngOnInit(): void {
    const applicationNumber = this.route.snapshot.queryParamMap.get('applicationNumber');
    if (!applicationNumber) {
      this.state.set('error');
      return;
    }
    this.applicationNumber.set(applicationNumber);

    const election = new BroadcastLeaderElection<MirroredState>(
      `ums-admission-web:result-check:${applicationNumber}`,
    );
    this.leaderElection.set(election);
    this.destroyRef.onDestroy(() => {
      this.clearRetry();
      election.close();
    });
  }

  protected checkAgain(): void {
    const applicationNumber = this.applicationNumber();
    if (applicationNumber && !this.isFollower()) {
      this.performCheck(applicationNumber);
    }
  }

  protected backToLookup(): void {
    void this.router.navigateByUrl('/app/result');
  }

  protected continueToPostResult(): void {
    void this.router.navigateByUrl('/app/post-result');
  }

  private performCheck(applicationNumber: string): void {
    this.clearRetry();
    this.state.set('checking');
    this.broadcast();

    this.resultApi.searchByApplicationNumber(applicationNumber).subscribe({
      next: (raw) => {
        if (isWellFormedResult(raw)) {
          this.result.set(raw);
          this.state.set('published');
        } else {
          this.state.set('not-published');
        }
        this.broadcast();
      },
      error: (error: unknown) => {
        if (error instanceof QueueingRequiredError) {
          this.state.set('queued');
          this.broadcast();
          this.retryTimeoutId = setTimeout(
            () => this.performCheck(applicationNumber),
            error.status.nextPollMs,
          );
          return;
        }
        const apiError = error as UmsApiError;
        this.state.set(apiError.status === 404 ? 'not-published' : 'error');
        this.broadcast();
      },
    });
  }

  private broadcast(): void {
    this.leaderElection()?.broadcastState({ state: this.state(), result: this.result() });
  }

  private clearRetry(): void {
    if (this.retryTimeoutId !== null) {
      clearTimeout(this.retryTimeoutId);
      this.retryTimeoutId = null;
    }
  }
}
