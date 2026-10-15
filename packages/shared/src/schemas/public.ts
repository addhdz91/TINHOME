import { z } from 'zod/mini';
import { CITY_STATUS, FAQ_CATEGORIES } from '../constants/enums.js';
import { IsoDateSchema } from './common.js';

/**
 * Client-side validation of publicly readable documents (cities, windows, demand stats,
 * legal texts). Unknown fields are dropped; bad documents are skipped by the caller.
 */
export const CityDocSchema = z.object({
  name: z.string(),
  province: z.string(),
  region: z.string(),
  timezone: z.enum(['Europe/Madrid', 'Atlantic/Canary']),
  center: z.object({ lat: z.number(), lng: z.number() }),
  radiusKm: z.number(),
  status: z.enum(CITY_STATUS),
  openThreshold: z.int().check(z.positive()),
  counters: z.object({
    visibleCandidates: z.int().check(z.nonnegative()),
    waitlist: z.int().check(z.nonnegative()),
    foundersAwarded: z.int().check(z.nonnegative()),
  }),
  order: z.number(),
});

export const WindowDocSchema = z.object({
  name: z.string(),
  startDate: IsoDateSchema,
  endDate: IsoDateSchema,
  active: z.boolean(),
  cityIds: z.nullable(z.array(z.string())),
  order: z.number(),
});

export const DemandStatDocSchema = z.object({
  fromCityId: z.string(),
  toCityId: z.string(),
  windowId: z.string(),
  count: z.int().check(z.nonnegative()),
});

export const LegalDocMetaSchema = z.object({
  title: z.string(),
  currentVersion: z.string(),
});

export const LegalDocVersionSchema = z.object({
  markdown: z.string(),
  requiresReacceptance: z.boolean(),
  changeSummary: z.optional(z.string()),
});

/** `faqs/{slug}` (04 §2.24b), FR-66. Only published articles are readable. */
export const FaqDocSchema = z.object({
  category: z.enum(FAQ_CATEGORIES),
  question: z.string(),
  answerMarkdown: z.string(),
  order: z.number(),
  published: z.literal(true),
  tags: z._default(z.array(z.string()), []),
});
export type FaqDoc = z.infer<typeof FaqDocSchema>;
