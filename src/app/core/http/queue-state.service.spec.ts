import { TestBed } from '@angular/core/testing';
import { QueueStateService } from './queue-state.service';
import type { QueueStatus } from './queue-status.types';

describe('QueueStateService', () => {
  let service: QueueStateService;

  const status: QueueStatus = {
    queued: true,
    queuePosition: 100,
    estimatedWaitSeconds: 45,
    nextPollMs: 3000,
    intervalIsServerSuggested: true,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(QueueStateService);
  });

  it('starts with no queue state', () => {
    expect(service.current()).toBeNull();
    expect(service.isQueued()).toBeFalse();
  });

  it('reports a queue status and flips isQueued', () => {
    service.report(status);
    expect(service.current()).toEqual(status);
    expect(service.isQueued()).toBeTrue();
  });

  it('clears back to no queue state', () => {
    service.report(status);
    service.clear();
    expect(service.current()).toBeNull();
    expect(service.isQueued()).toBeFalse();
  });
});
