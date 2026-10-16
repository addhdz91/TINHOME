import { onRequest } from 'firebase-functions/v2/https';
import { REGION } from '@tinhome/shared/constants';
import {
  AdminListPartnersOutput,
  AdminUpsertPartnerInput,
  AdminUpsertPartnerOutput,
  EmptyInput,
  GetSponsoredInput,
  GetSponsoredOutput,
} from '@tinhome/shared/schemas';
import { defineCallable } from '../../core/callable.js';
import { clock } from '../../core/clock.js';
import { db } from '../../core/firebase.js';
import { requireSuperadmin, verifiedUid } from '../../core/guards.js';
import { logger } from '../../core/logger.js';
import { MAX_INSTANCES } from '../../core/options.js';
import { getParams } from '../../core/params.js';
import { publicUrl } from '../../core/public-url.js';
import { requestIp } from '../../core/rate-limit.js';
import * as sponsored from './service.js';

/** BR-28 — A, EV. */
export const getSponsored = defineCallable(
  'getSponsored',
  { input: GetSponsoredInput, output: GetSponsoredOutput },
  async ({ input, request, now }) =>
    sponsored.getSponsored(db(), verifiedUid(request), input, await getParams(), now),
);

/** FR-47 — SADM. */
export const adminUpsertPartner = defineCallable(
  'adminUpsertPartner',
  { input: AdminUpsertPartnerInput, output: AdminUpsertPartnerOutput },
  async ({ input, request, now }) =>
    sponsored.upsertPartner(db(), requireSuperadmin(request), input, await getParams(), now),
);

export const adminListPartners = defineCallable(
  'adminListPartners',
  { input: EmptyInput, output: AdminListPartnersOutput },
  async ({ request, now }) => {
    requireSuperadmin(request);
    return sponsored.listPartners(db(), now);
  },
);

/** The partner id is the segment after `/r/` (Hosting rewrite) or the last one (direct call). */
export function partnerIdFromPath(path: string): string {
  const parts = path.split('/').filter(Boolean);
  const index = parts.indexOf('r');
  return decodeURIComponent((index >= 0 ? parts[index + 1] : parts.at(-1)) ?? '');
}

/** 05 §2.15 — `GET /r/{partnerId}?p=` → click counted, 302 to the partner (no cookies). */
export const partnerRedirect = onRequest(
  { region: REGION, memory: '256MiB', maxInstances: MAX_INSTANCES.http },
  async (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.set('Referrer-Policy', 'no-referrer');
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.status(405).send('Method Not Allowed');
      return;
    }
    const placement = typeof req.query.p === 'string' ? req.query.p : undefined;
    try {
      const target = await sponsored.recordClick(
        db(),
        partnerIdFromPath(req.path),
        placement,
        clock.now(),
        requestIp(req),
      );
      res.redirect(302, target ?? `${publicUrl()}/app`);
    } catch (error) {
      logger.error('partner redirect failed', {
        cause: error instanceof Error ? error.message.slice(0, 200) : 'unknown',
      });
      res.redirect(302, `${publicUrl()}/app`);
    }
  },
);
