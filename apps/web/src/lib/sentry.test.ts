import type { ErrorEvent } from '@sentry/react';
import { describe, expect, it } from 'vitest';
import { scrubEvent } from './sentry';

describe('scrubEvent', () => {
  it('removes identity, request data and inline personal data', () => {
    const event: ErrorEvent = {
      type: undefined,
      message: 'Failed for laura@demo.tinhome / +34 600 000 000',
      user: { id: 'u1', email: 'laura@demo.tinhome', ip_address: '1.2.3.4' },
      request: {
        url: 'https://app.example/verifica-email?oobCode=secret#x',
        cookies: { session: 'abc' },
        headers: { Authorization: 'Bearer x' },
        query_string: 'oobCode=secret',
      },
      exception: { values: [{ type: 'Error', value: 'phone +34600000000 invalid' }] },
      breadcrumbs: [
        { message: 'navigate', data: { from: '/i/ABC?ref=1', to: '/registro?email=a@b.es' } },
      ],
    };

    const scrubbed = scrubEvent(event);

    expect(scrubbed.user).toBeUndefined();
    expect(scrubbed.message).toBe('Failed for [redacted] / [redacted]');
    expect(scrubbed.request).toEqual({ url: 'https://app.example/verifica-email' });
    expect(scrubbed.exception?.values?.[0]?.value).toBe('phone [redacted] invalid');
    expect(scrubbed.breadcrumbs?.[0]?.data).toEqual({ from: '/i/ABC', to: '/registro' });
  });
});
