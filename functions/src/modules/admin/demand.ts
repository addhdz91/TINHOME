import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import { demandStatId } from '@tinhome/shared/domain';
import type { Params } from '@tinhome/shared/types';

/**
 * J-08 / FR-18 — recomputes the demand of visible homes by city pair × window (`homeCount`)
 * next to the waitlist part kept live by `confirmWaitlist` (`count`), and republishes
 * `demandStats` only for pairs at or above P-18.
 */
export async function recomputeDemand(db: Firestore, params: Params): Promise<number> {
  const homes = await db.collection('homes').where('visible', '==', true).get();
  const homeCounts = new Map<
    string,
    { fromCityId: string; toCityId: string; windowId: string; n: number }
  >();
  for (const home of homes.docs) {
    const from = String(home.get('cityId') ?? '');
    const destinations =
      (home.get('destinations') as { cityIds?: string[] } | undefined)?.cityIds ?? [];
    const windows =
      (home.get('availability') as { windowIds?: string[] } | undefined)?.windowIds ?? [];
    for (const to of destinations) {
      for (const windowId of windows) {
        if (!from || to === from) continue;
        const id = demandStatId(from, to, windowId);
        const entry = homeCounts.get(id) ?? { fromCityId: from, toCityId: to, windowId, n: 0 };
        entry.n += 1;
        homeCounts.set(id, entry);
      }
    }
  }
  const counters = await db.collection('demandCounters').get();
  const ids = new Set([...counters.docs.map((doc) => doc.id), ...homeCounts.keys()]);
  let published = 0;
  for (const id of ids) {
    const counter = counters.docs.find((doc) => doc.id === id);
    const fromHomes = homeCounts.get(id);
    const pair = {
      fromCityId: String(counter?.get('fromCityId') ?? fromHomes?.fromCityId ?? ''),
      toCityId: String(counter?.get('toCityId') ?? fromHomes?.toCityId ?? ''),
      windowId: String(counter?.get('windowId') ?? fromHomes?.windowId ?? ''),
    };
    const waitlist = Number(counter?.get('count') ?? 0);
    const homeCount = fromHomes?.n ?? 0;
    await db
      .doc(`demandCounters/${id}`)
      .set(
        { ...pair, count: waitlist, homeCount, updatedAt: FieldValue.serverTimestamp() },
        { merge: true },
      );
    const total = waitlist + homeCount;
    if (total >= params.demandCounterMin) {
      await db
        .doc(`demandStats/${id}`)
        .set({ ...pair, count: total, updatedAt: FieldValue.serverTimestamp() });
      published += 1;
    } else {
      await db.doc(`demandStats/${id}`).delete();
    }
  }
  return published;
}
