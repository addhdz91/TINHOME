import { describe, expect, it, vi } from 'vitest';
import { writeAudit, type AuditSink } from './audit.js';
import { fixedClock, clock, resetClock, setClock } from './clock.js';

describe('writeAudit', () => {
  it('writes the entry with a server timestamp', async () => {
    const sink = vi.fn<AuditSink>(async () => undefined);
    await writeAudit(
      {
        actorUid: 'admin1',
        actorRole: 'admin',
        action: 'VERIFICATION_FILE_OPENED',
        targetType: 'verification',
        targetId: 'v1',
      },
      sink,
    );
    expect(sink).toHaveBeenCalledOnce();
    const written = sink.mock.calls[0]?.[0];
    expect(written).toMatchObject({ actorUid: 'admin1', action: 'VERIFICATION_FILE_OPENED' });
    expect(written?.createdAt).toBeDefined();
  });
});

describe('clock', () => {
  it('can be fixed and reset', () => {
    setClock(fixedClock('2027-03-01T10:00:00+01:00'));
    expect(clock.now().toISOString()).toBe('2027-03-01T09:00:00.000Z');
    resetClock();
    expect(Math.abs(clock.now().getTime() - Date.now())).toBeLessThan(1000);
  });
});
