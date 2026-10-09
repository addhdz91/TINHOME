import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EmailProvider } from '../src/core/email/types.js';
import { db } from '../src/core/firebase.js';
import { deliverMail } from '../src/modules/mail/service.js';
import { clearFirestore } from './helpers.js';

vi.mock('firebase-functions/logger', () => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

const item = {
  to: 'a@b.es',
  templateId: 'N-19' as const,
  data: { cityName: 'Madrid', confirmUrl: 'http://x/y', expiresInDays: 7 },
  status: 'QUEUED',
  attempts: 0,
};

beforeEach(clearFirestore);

describe('deliverMail', () => {
  it('marks the item as SENT', async () => {
    const ref = db().collection('mailQueue').doc();
    await ref.set(item);
    const provider: EmailProvider = { name: 'fake', send: vi.fn(async () => undefined) };
    expect(await deliverMail(ref, item, provider)).toEqual({ retry: false });
    expect((await ref.get()).get('status')).toBe('SENT');
  });

  it('retries and finally marks FAILED after 5 attempts', async () => {
    const ref = db().collection('mailQueue').doc();
    await ref.set(item);
    const provider: EmailProvider = {
      name: 'fake',
      send: vi.fn(async () => Promise.reject(new Error('boom'))),
    };
    expect(await deliverMail(ref, { ...item, attempts: 0 }, provider)).toEqual({ retry: true });
    expect((await ref.get()).data()).toMatchObject({
      status: 'QUEUED',
      attempts: 1,
      lastError: 'boom',
    });
    expect(await deliverMail(ref, { ...item, attempts: 4 }, provider)).toEqual({ retry: false });
    expect((await ref.get()).get('status')).toBe('FAILED');
  });

  it('ignores items that are not queued', async () => {
    const ref = db().collection('mailQueue').doc();
    const send = vi.fn(async () => undefined);
    const provider: EmailProvider = { name: 'fake', send };
    expect(await deliverMail(ref, { ...item, status: 'SENT' }, provider)).toEqual({ retry: false });
    expect(send).not.toHaveBeenCalled();
  });
});
