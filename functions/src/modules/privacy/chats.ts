import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import { chatPurgeCutoff } from '@tinhome/shared/domain';

const BATCH = 400;

/**
 * J-14 — messages of chats closed more than P-39 months ago are erased (reported messages are
 * already copied into their report). The match stays with `messagesPurgedAt`.
 */
export async function purgeClosedChats(db: Firestore, months: number, now: Date): Promise<number> {
  const cutoff = Timestamp.fromDate(chatPurgeCutoff(now, months));
  const closed = await db
    .collection('matches')
    .where('status', 'in', ['UNMATCHED', 'BLOCKED'])
    .where('closedAt', '<', cutoff)
    .limit(200)
    .get();
  let purged = 0;
  for (const match of closed.docs) {
    if (match.get('messagesPurgedAt')) continue;
    for (;;) {
      const page = await match.ref.collection('messages').limit(BATCH).get();
      if (page.empty) break;
      const batch = db.batch();
      for (const doc of page.docs) batch.delete(doc.ref);
      await batch.commit();
      if (page.size < BATCH) break;
    }
    await match.ref.update({ messagesPurgedAt: Timestamp.fromDate(now) });
    purged += 1;
  }
  return purged;
}
