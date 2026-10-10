import type { Compatibility } from './compatibility.js';

const DAY_MS = 86_400_000;

export interface RankingInput {
  homeId: string;
  compatibility: Compatibility;
  /** The candidate's owner already liked the viewer's home. */
  likedYou: boolean;
  ownerPremium: boolean;
  rating: { avg: number; count: number } | null;
  publishedAt: Date | null;
  photoCount: number;
}

/** BR-14 factors, each normalised to [0, 1] (03 §8). */
export function rankingFactors(input: RankingInput, now: Date): number[] {
  const { compatibility } = input;
  const dateFit = Math.min(
    1,
    Math.max(compatibility.sharedWindowIds.length > 0 ? 1 : 0, compatibility.overlapDays / 7),
  );
  const rating =
    input.rating && input.rating.count > 0
      ? Math.min(1, Math.max(0, (input.rating.avg - 3) / 2))
      : 0.5;
  const ageDays = input.publishedAt ? (now.getTime() - input.publishedAt.getTime()) / DAY_MS : 90;
  const novelty = ageDays < 14 ? 1 : Math.max(0, 1 - (ageDays - 14) / (90 - 14));
  return [
    compatibility.wantsYourCity ? 1 : 0,
    dateFit,
    input.likedYou ? 1 : 0,
    input.ownerPremium ? 1 : 0,
    rating,
    novelty,
    Math.min(input.photoCount, 12) / 12,
  ];
}

/** Deterministic noise in [0, 5) from `seed` (viewer + day) and the home: varies without flicker. */
export function rankingNoise(seed: string, homeId: string): number {
  let hash = 2166136261;
  for (const char of `${seed}|${homeId}`) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 5000) / 1000;
}

/** BR-14 — `score = Σ Wi·factor_i + noise` with the P-14W weights. */
export function rankingScore(
  input: RankingInput,
  weights: readonly number[],
  seed: string,
  now: Date,
): number {
  const factors = rankingFactors(input, now);
  return (
    factors.reduce((sum, factor, i) => sum + (weights[i] ?? 0) * factor, 0) +
    rankingNoise(seed, input.homeId)
  );
}

/**
 * Discover order: perfect fits first (M5 DoD, 10_DECISIONS §5), then by BR-14 score.
 * Stable for the same seed.
 */
export function rankCandidates<T extends RankingInput>(
  candidates: readonly T[],
  weights: readonly number[],
  seed: string,
  now: Date,
): T[] {
  const scored = candidates.map((candidate) => ({
    candidate,
    score: rankingScore(candidate, weights, seed, now),
  }));
  return scored
    .toSorted(
      (a, b) =>
        Number(b.candidate.compatibility.perfectFit) -
          Number(a.candidate.compatibility.perfectFit) ||
        b.score - a.score ||
        a.candidate.homeId.localeCompare(b.candidate.homeId),
    )
    .map(({ candidate }) => candidate);
}
