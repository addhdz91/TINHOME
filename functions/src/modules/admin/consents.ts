import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import { CONSENT_SOURCES, LEGAL_ACCEPTANCE_TYPES } from '@tinhome/shared/constants';
import type { ConsentRecordView } from '@tinhome/shared/schemas';
import { writeAudit } from '../../core/audit.js';
import { sha256Hex } from '../../core/crypto.js';
import type { Actor } from '../moderation/moderate.js';

const MAX = 200;
const text = (value: unknown) => (typeof value === 'string' ? value : null);

/**
 * BR-35 / RGPD art. 7.1 — the evidence of what a person accepted, when and how: by account or
 * by the e-mail a visitor used (stored hashed). Superadmin only, and every lookup is audited.
 */
export async function listConsents(
  db: Firestore,
  actor: Actor,
  input: { uid?: string | undefined; email?: string | undefined },
): Promise<{ items: ConsentRecordView[] }> {
  const query = input.uid
    ? db.collection('legalAcceptances').where('uid', '==', input.uid)
    : db
        .collection('legalAcceptances')
        .where('emailHash', '==', sha256Hex((input.email ?? '').trim().toLowerCase()));
  const snaps = await query.limit(MAX).get();
  const items = snaps.docs
    .map((doc): ConsentRecordView => {
      const acceptedAt = doc.get('acceptedAt') as unknown;
      const type = doc.get('type') as unknown;
      const source = doc.get('source') as unknown;
      return {
        id: doc.id,
        uid: text(doc.get('uid')),
        type: LEGAL_ACCEPTANCE_TYPES.find((t) => t === type) ?? 'TERMS',
        slug: text(doc.get('slug')),
        version: String(doc.get('version') ?? ''),
        contentHash: text(doc.get('contentHash')),
        source: CONSENT_SOURCES.find((s) => s === source) ?? null,
        method: text(doc.get('method')),
        consentText: text(doc.get('consentText')),
        authProvider: text(doc.get('authProvider')),
        acceptedAt: acceptedAt instanceof Timestamp ? acceptedAt.toDate().toISOString() : null,
        ipTruncated: text(doc.get('ipTruncated')),
        userAgent: text(doc.get('userAgent')),
      };
    })
    .sort((a, b) => (b.acceptedAt ?? '').localeCompare(a.acceptedAt ?? ''));
  await writeAudit({
    actorUid: actor.uid,
    actorRole: actor.role,
    action: 'consents.view',
    targetType: input.uid ? 'user' : 'email',
    targetId: input.uid ?? sha256Hex((input.email ?? '').trim().toLowerCase()).slice(0, 16),
  });
  return { items };
}
