import { z } from 'zod/mini';
import { PARTNER_CATEGORIES, SPONSORED_PLACEMENTS } from '../constants/enums.js';
import { SponsoredCard } from './discover.js';

const HttpsUrl = z.url({ protocol: /^https$/ }).check(z.maxLength(500));
/** Logo: an https URL or a path served by TinHome (e.g. `/partners/logo.webp`; never `//host`). */
const LogoUrl = z.union([HttpsUrl, z.string().check(z.regex(/^\/(?!\/)[A-Za-z0-9/_.-]{1,200}$/))]);

/** FR-47 — `adminUpsertPartner` (SADM). Without `id` a new partner is created. */
export const AdminUpsertPartnerInput = z
  .object({
    id: z.optional(z.string().check(z.minLength(1), z.maxLength(60))),
    name: z.string().check(z.trim(), z.minLength(2), z.maxLength(80)),
    category: z.enum(PARTNER_CATEGORIES),
    title: z.string().check(z.trim(), z.minLength(2), z.maxLength(60)),
    text: z.string().check(z.trim(), z.minLength(2), z.maxLength(140)),
    logoUrl: LogoUrl,
    targetUrl: HttpsUrl,
    cityIds: z.nullable(
      z.array(z.string().check(z.minLength(1), z.maxLength(60))).check(z.maxLength(50)),
    ),
    placements: z.array(z.enum(SPONSORED_PLACEMENTS)).check(z.minLength(1), z.maxLength(3)),
    active: z.boolean(),
    startsAt: z._default(z.nullable(z.iso.datetime({ offset: true })), null),
    endsAt: z._default(z.nullable(z.iso.datetime({ offset: true })), null),
  })
  .check(
    z.refine((p) => !p.startsAt || !p.endsAt || p.startsAt < p.endsAt, {
      path: ['endsAt'],
      message: 'before_start',
    }),
  );
export type AdminUpsertPartnerInput = z.input<typeof AdminUpsertPartnerInput>;

export const PartnerView = z.object({
  id: z.string(),
  name: z.string(),
  category: z.enum(PARTNER_CATEGORIES),
  title: z.string(),
  text: z.string(),
  logoUrl: z.string(),
  targetUrl: z.string(),
  cityIds: z.nullable(z.array(z.string())),
  placements: z.array(z.enum(SPONSORED_PLACEMENTS)),
  active: z.boolean(),
  startsAt: z.nullable(z.string()),
  endsAt: z.nullable(z.string()),
  /** Clicks in the last 30 days (partnerClicks). */
  clicks30d: z.int(),
});
export type PartnerView = z.infer<typeof PartnerView>;

export const AdminUpsertPartnerOutput = z.object({ partner: PartnerView });
export const AdminListPartnersOutput = z.object({ items: z.array(PartnerView) });

/** BR-28 — `getSponsored` (A, EV). */
export const GetSponsoredInput = z.object({
  placement: z.enum(SPONSORED_PLACEMENTS),
  cityId: z.optional(z.string().check(z.minLength(1), z.maxLength(60))),
});
export const GetSponsoredOutput = z.object({ card: z.nullable(SponsoredCard) });
export type GetSponsoredOutput = z.infer<typeof GetSponsoredOutput>;
