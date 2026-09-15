import {
  blocksNewPaymentAttempt,
  generateIdempotencyKey,
  isConfirmedPaymentStatus,
  isTerminalPaymentStatus,
} from './payment-idempotency';
import type { PaymentStatus } from './payment.types';

describe('isTerminalPaymentStatus', () => {
  it('is true for Successful, Failed, and Reconciled', () => {
    expect(isTerminalPaymentStatus('Successful')).toBeTrue();
    expect(isTerminalPaymentStatus('Failed')).toBeTrue();
    expect(isTerminalPaymentStatus('Reconciled')).toBeTrue();
  });

  it('is false for Initiated and Pending', () => {
    expect(isTerminalPaymentStatus('Initiated')).toBeFalse();
    expect(isTerminalPaymentStatus('Pending')).toBeFalse();
  });
});

describe('isConfirmedPaymentStatus (Domain Invariant #3)', () => {
  it('is true only for Successful and Reconciled', () => {
    expect(isConfirmedPaymentStatus('Successful')).toBeTrue();
    expect(isConfirmedPaymentStatus('Reconciled')).toBeTrue();
  });

  it('is false for Failed -- a terminal outcome is not the same as a confirmed one', () => {
    expect(isConfirmedPaymentStatus('Failed')).toBeFalse();
  });

  it('is false for every non-terminal status', () => {
    expect(isConfirmedPaymentStatus('Initiated')).toBeFalse();
    expect(isConfirmedPaymentStatus('Pending')).toBeFalse();
  });

  it('never reports confirmed for any status other than the two confirmed ones', () => {
    const allStatuses: readonly PaymentStatus[] = [
      'Initiated',
      'Pending',
      'Successful',
      'Failed',
      'Reconciled',
    ];
    const confirmed = allStatuses.filter(isConfirmedPaymentStatus);
    expect(confirmed.sort()).toEqual(['Reconciled', 'Successful']);
  });
});

describe('blocksNewPaymentAttempt (design-decisions.md pre-payment check)', () => {
  it('does not block when there is no prior attempt at all', () => {
    expect(blocksNewPaymentAttempt(null)).toBeFalse();
  });

  it('blocks while a prior attempt is Initiated or Pending', () => {
    expect(blocksNewPaymentAttempt('Initiated')).toBeTrue();
    expect(blocksNewPaymentAttempt('Pending')).toBeTrue();
  });

  it('does not block once a prior attempt is terminal, including a Failed one', () => {
    expect(blocksNewPaymentAttempt('Failed')).toBeFalse();
    expect(blocksNewPaymentAttempt('Successful')).toBeFalse();
    expect(blocksNewPaymentAttempt('Reconciled')).toBeFalse();
  });
});

describe('generateIdempotencyKey', () => {
  it('returns a non-empty string', () => {
    const key = generateIdempotencyKey();
    expect(typeof key).toBe('string');
    expect(key.length).toBeGreaterThan(0);
  });

  it('returns a different key on every call -- never reused across attempts', () => {
    const keys = new Set(Array.from({ length: 20 }, () => generateIdempotencyKey()));
    expect(keys.size).toBe(20);
  });

  it('uses crypto.randomUUID when available', () => {
    const fixedUuid = '11111111-1111-4111-8111-111111111111';
    spyOn(crypto, 'randomUUID').and.returnValue(fixedUuid);

    expect(generateIdempotencyKey()).toBe(fixedUuid);
  });

  it('falls back to a timestamp+random string when crypto.randomUUID is unavailable', () => {
    // randomUUID lives on Crypto.prototype -- `delete crypto.randomUUID` has no own property to
    // remove and is a no-op, so an own-property override (shadowing the prototype method) is what
    // actually exercises the documented fallback path here. Jasmine randomizes spec order by
    // default, so this restores the EXACT original descriptor (including `writable`) rather than a
    // fresh, differently-shaped one -- otherwise a later-running spyOn() on this same property (in
    // this file's own suite) fails with "not declared writable" depending on run order.
    const originalDescriptor = Object.getOwnPropertyDescriptor(crypto, 'randomUUID');
    Object.defineProperty(crypto, 'randomUUID', {
      value: undefined,
      configurable: true,
      writable: true,
    });

    try {
      const key = generateIdempotencyKey();
      expect(key.startsWith('idempotency-')).toBeTrue();
    } finally {
      if (originalDescriptor) {
        Object.defineProperty(crypto, 'randomUUID', originalDescriptor);
      } else {
        delete (crypto as { randomUUID?: unknown }).randomUUID;
      }
    }
  });
});
