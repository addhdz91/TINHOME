import type { Firestore } from 'firebase-admin/firestore';
import { rankCandidates } from '@tinhome/shared/domain';
import type { ListLikesReceivedOutput } from '@tinhome/shared/schemas';
import type { Params } from '@tinhome/shared/types';
import { cursorOffset } from '../../core/pagination.js';
import { loadCandidates, loadCatalog, toCards } from '../discover/candidates.js';
import type { Viewer } from '../discover/viewer.js';

/**
 * FR-26 / BR-12 — likes received that are not a match yet (the viewer has not liked back),
 * from visible homes and without blocks. Free users get the count and the likes that came
 * with a message (FR-61); Premium the whole list, perfect fits first.
 */
export async function likesReceived(
  db: Firestore,
  viewer: Viewer,
  input: { cursor?: string | undefined; limit: number },
  params: Params,
  now: Date,
): Promise<ListLikesReceivedOutput> {
  const pending = [...viewer.likedYouUids].filter(
    (uid) => !viewer.likedUids.has(uid) && !viewer.blockedUids.has(uid),
  );
  if (pending.length === 0)
    return { count: 0, items: viewer.isPremium ? [] : null, withMessage: [], nextCursor: null };
  const catalog = await loadCatalog(db);
  const cities = [...catalog.cities.keys()];
  const candidates = (
    await loadCandidates(db, viewer, catalog, cities.slice(0, 30), { skipInteracted: false })
  ).filter((candidate) => pending.includes(candidate.ownerUid));
  const ranked = rankCandidates(candidates, params.rankingWeights, viewer.seed, now);
  const withMessage = await toCards(
    db,
    ranked.filter((c) => viewer.likeMessages.has(c.ownerUid)),
    viewer,
    catalog,
  );
  if (!viewer.isPremium)
    return { count: ranked.length, items: null, withMessage, nextCursor: null };
  const offset = cursorOffset(input.cursor);
  const page = ranked.slice(offset, offset + input.limit);
  return {
    count: ranked.length,
    items: await toCards(db, page, viewer, catalog),
    withMessage,
    nextCursor: offset + input.limit < ranked.length ? String(offset + input.limit) : null,
  };
}
