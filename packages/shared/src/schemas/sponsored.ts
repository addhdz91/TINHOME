import { z } from 'zod';
import { PARTNER_CATEGORIES, SPONSORED_PLACEMENTS } from '../constants/enums.js';
import { SponsoredCard } from './discover.js';

const HttpsUrl = z.url({ protocol: /^https$/ }).max(500);
/** Logo: an https URL or a path served by TinHome (e.g. `/partners/logo.webp`). */
const LogoUrl = z.union([HttpsUrl, z.string().regex(/^\/[A-Za-z0-9/_.-]{1,200}$/)]);

/** FR-47 — `adminUpsertPartner` (SADM). Without `id` a new partner is created. */
export const AdminUpsertPartnerInput = z
  .object({
    id: z.string().min(1).max(60).optional(),
    name: z.string().trim().min(2).max(80),
    category: z.enum(PARTNER_CATEGORIES),
    title: z.string().trim().min(2).max(60),
    text: z.string().trim().min(2).max(140),
    logoUrl: LogoUrl,
    targetUrl: HttpsUrl,
    cityIds: z.array(z.string().min(1).max(60)).max(50).nullable(),
    placements: z.array(z.enum(SPONSORED_PLACEMENTS)).min(1).max(3),
    active: z.boolean(),
    startsAt: z.iso.datetime({ offset: true }).nullable().default(null),
    endsAt: z.iso.datetime({ offset: true }).nullable().default(null),
  })
  .refine((p) => !p.startsAt || !p.endsAt || p.startsAt < p.endsAt, {
    path: ['endsAt'],
    message: 'before_start',
  });
export type AdminUpsertPartnerInput = z.input<typeof AdminUpsertPartnerInput>;

export const PartnerView = z.object({
  id: z.string(),
  name: z.string(),
  category: z.enum(PARTNER_CATEGORIES),
  title: z.string(),
  text: z.string(),
  logoUrl: z.string(),
  targetUrl: z.string(),
  cityIds: z.array(z.string()).nullable(),
  placements: z.array(z.enum(SPONSORED_PLACEMENTS)),
  active: z.boolean(),
  startsAt: z.string().nullable(),
  endsAt: z.string().nullable(),
  /** Clicks in the last 30 days (partnerClicks). */
  clicks30d: z.number().int(),
});
export type PartnerView = z.infer<typeof PartnerView>;

export const AdminUpsertPartnerOutput = z.object({ partner: PartnerView });
export const AdminListPartnersOutput = z.object({ items: z.array(PartnerView) });

/** BR-28 — `getSponsored` (A, EV). */
export const GetSponsoredInput = z.object({
  placement: z.enum(SPONSORED_PLACEMENTS),
  cityId: z.string().min(1).max(60).optional(),
});
export const GetSponsoredOutput = z.object({ card: SponsoredCard.nullable() });
export type GetSponsoredOutput = z.infer<typeof GetSponsoredOutput>;
