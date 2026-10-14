import type { PartnerCategory, SponsoredPlacement } from '../constants/enums.js';

export interface PartnerCandidate {
  id: string;
  category: PartnerCategory;
  cityIds: string[] | null;
  placements: SponsoredPlacement[];
  active: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
}

export interface SponsoredContext {
  placement: SponsoredPlacement;
  cityId: string | null;
  isPremium: boolean;
  /** P-26 — insurance partners stay off until legal validation. */
  insuranceEnabled: boolean;
  now: Date;
}

/** BR-28 — partner eligible for this screen (active, in dates, placement, city, category). */
export function isPartnerEligible(partner: PartnerCandidate, context: SponsoredContext): boolean {
  if (!partner.active) return false;
  if (!partner.placements.includes(context.placement)) return false;
  if (partner.category === 'TRAVEL_INSURANCE' && !context.insuranceEnabled) return false;
  const now = context.now.getTime();
  if (partner.startsAt && partner.startsAt.getTime() > now) return false;
  if (partner.endsAt && partner.endsAt.getTime() <= now) return false;
  if (partner.cityIds && (!context.cityId || !partner.cityIds.includes(context.cityId))) {
    return false;
  }
  return true;
}

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * BR-28 — at most one card per screen; the deck interstitial is only for free users. The pick
 * rotates by `seed` (viewer + day) so it is stable within a day and fair across partners.
 */
export function pickSponsored<T extends PartnerCandidate>(
  partners: T[],
  context: SponsoredContext,
  seed: string,
): T | null {
  if (context.placement === 'DECK' && context.isPremium) return null;
  const eligible = partners
    .filter((partner) => isPartnerEligible(partner, context))
    .sort((a, b) => a.id.localeCompare(b.id));
  if (eligible.length === 0) return null;
  return eligible[hash(`${seed}|${context.placement}`) % eligible.length] ?? null;
}

/** BR-28 — the deck shows the interstitial after every P-15 cards (never before the first). */
export function isSponsoredSlot(cardsSeen: number, everyN: number): boolean {
  return everyN > 0 && cardsSeen > 0 && cardsSeen % everyN === 0;
}

/** 05 §2.15 — own redirect that counts the click (no cookies, no third-party pixels). */
export function sponsoredClickPath(partnerId: string, placement: SponsoredPlacement): string {
  return `/r/${encodeURIComponent(partnerId)}?p=${placement}`;
}

/** 05 §2.15 — destination with `utm_source=tinhome` (keeps the partner's own parameters). */
export function withUtmSource(targetUrl: string): string {
  const url = new URL(targetUrl);
  url.searchParams.set('utm_source', 'tinhome');
  return url.toString();
}
