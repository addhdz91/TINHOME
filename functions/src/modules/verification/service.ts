import { FieldValue, Timestamp, type DocumentData, type Firestore } from 'firebase-admin/firestore';
import {
  VERIFICATION_URL_MINUTES,
  type AdminRole,
  type VerificationFile,
} from '@tinhome/shared/constants';
import { isValidSpanishId } from '@tinhome/shared/domain';
import type {
  AdminDecideVerificationInput,
  AdminGetVerificationOutput,
  MyVerification,
  SubmitIdentityVerificationInput,
  VerificationAdminView,
  VerificationSummary,
} from '@tinhome/shared/schemas';
import type { Params } from '@tinhome/shared/types';
import { appError } from '../../core/app-error.js';
import { writeAudit } from '../../core/audit.js';
import { docNumberHash } from '../../core/doc-hash.js';
import { enqueueMail } from '../../core/email/queue.js';
import { publicUrl } from '../../core/public-url.js';
import { bucket } from '../../core/storage.js';
import { loadUser, requirePhoneVerified, requireUserActive } from '../../core/users.js';
import { recomputeHome } from '../home/visibility.js';
import { applyApprovalRewards } from './rewards.js';
import { shortName, toAdminView, toMyVerification, toSummary } from './view.js';

const REQUIRED_FILES = ['idFront', 'idBack', 'selfie', 'propertyDoc'] as const;
const DAY_MS = 86_400_000;

interface Actor {
  uid: string;
  role: AdminRole;
}

/** Every file must live in `private/verifications/{uid}/{sameId}/{key}`. Returns that id. */
function verificationIdFromPaths(
  uid: string,
  files: Partial<Record<VerificationFile, string>>,
): string {
  let id: string | null = null;
  for (const [key, path] of Object.entries(files)) {
    const [root, folder, owner, vid, name] = path.split('/');
    if (root !== 'private' || folder !== 'verifications' || owner !== uid || name !== key || !vid)
      throw appError('E_VALIDATION', { fields: { files: 'path' } });
    if (id !== null && vid !== id) throw appError('E_VALIDATION', { fields: { files: 'path' } });
    id = vid;
  }
  if (id === null) throw appError('E_FILES_MISSING', { meta: { missing: [...REQUIRED_FILES] } });
  return id;
}

/** FR-08 — A, EV, PV, ACT. Creates a PENDING verification; never stores the document number. */
export async function submitVerification(
  db: Firestore,
  uid: string,
  input: SubmitIdentityVerificationInput,
  now: Date,
): Promise<{ verificationId: string; status: 'PENDING' }> {
  const user = await loadUser(db, uid);
  requireUserActive(user);
  requirePhoneVerified(user);
  const identity = (user.verification as { identity?: string } | undefined)?.identity ?? 'NONE';
  if (identity === 'PENDING') throw appError('E_VERIFICATION_PENDING');
  if (identity === 'APPROVED') throw appError('E_ALREADY_APPROVED');

  // AC-08.2 before AC-08.1: a tenant without the authorization sees the specific message.
  if (input.tenure === 'TENANT' && !input.files.landlordAuthorization)
    throw appError('E_LANDLORD_AUTH_REQUIRED');
  const missing = REQUIRED_FILES.filter((key) => !input.files[key]);
  if (missing.length > 0) throw appError('E_FILES_MISSING', { meta: { missing } });
  if (!isValidSpanishId(input.docNumber))
    throw appError('E_VALIDATION', { fields: { docNumber: 'invalid' } });

  const files = Object.fromEntries(
    Object.entries(input.files).filter(
      ([key]) => input.tenure === 'TENANT' || key !== 'landlordAuthorization',
    ),
  ) as Partial<Record<VerificationFile, string>>;
  const verificationId = verificationIdFromPaths(uid, files);
  const exists = await Promise.all(
    Object.entries(files).map(
      async ([key, path]) => [key, (await bucket().file(path).exists())[0]] as const,
    ),
  );
  const notUploaded = exists.filter(([, ok]) => !ok).map(([key]) => key);
  if (notUploaded.length > 0) throw appError('E_FILES_MISSING', { meta: { missing: notUploaded } });

  const hash = docNumberHash(input.docNumber);
  const verificationRef = db.doc(`verifications/${verificationId}`);
  const previousId = (user.verification as { latestId?: string } | undefined)?.latestId;
  await db.runTransaction(async (tx) => {
    const [hashSnap, existing] = await Promise.all([
      tx.get(db.doc(`docHashes/${hash}`)),
      tx.get(verificationRef),
    ]);
    if (existing.exists) throw appError('E_ALREADY_EXISTS');
    const owner = hashSnap.exists ? String(hashSnap.get('uid')) : null;
    const duplicateOfUid = owner !== null && owner !== uid ? owner : null;
    if (!hashSnap.exists) tx.create(hashSnap.ref, { uid, createdAt: FieldValue.serverTimestamp() });
    tx.create(verificationRef, {
      uid,
      status: 'PENDING',
      tenure: input.tenure,
      propertyDocType: input.propertyDocType,
      files,
      docNumberHash: hash,
      duplicateOfUid,
      fraudSuspicion: false,
      submittedAt: FieldValue.serverTimestamp(),
      filesPurgeAt: null,
    });
    // A resubmission replaces the previous files (BR-25: keep documents as little as possible).
    if (previousId && previousId !== verificationId) {
      tx.update(db.doc(`verifications/${previousId}`), { filesPurgeAt: Timestamp.fromDate(now) });
    }
    tx.update(db.doc(`users/${uid}`), {
      'verification.identity': 'PENDING',
      'verification.latestId': verificationId,
      updatedAt: FieldValue.serverTimestamp(),
    });
    if (duplicateOfUid) {
      // FR-09 — the reviewer is warned; the submission is not blocked.
      tx.create(db.collection('adminAlerts').doc(), {
        type: 'VERIFICATION_DUPLICATE',
        refType: 'verification',
        refId: verificationId,
        priority: 'HIGH',
        createdAt: FieldValue.serverTimestamp(),
        handledAt: null,
      });
    }
  });
  return { verificationId, status: 'PENDING' };
}

/** S-14 — the owner's latest verification without hashes or other users. */
export async function myVerification(db: Firestore, uid: string): Promise<MyVerification | null> {
  const user = await loadUser(db, uid);
  const latestId = (user.verification as { latestId?: string } | undefined)?.latestId;
  if (!latestId) return null;
  const snap = await db.doc(`verifications/${latestId}`).get();
  return snap.exists ? toMyVerification(snap) : null;
}

async function usersById(db: Firestore, uids: string[]): Promise<Map<string, DocumentData>> {
  const unique = [...new Set(uids)];
  if (unique.length === 0) return new Map();
  const snaps = await db.getAll(...unique.map((id) => db.doc(`users/${id}`)));
  return new Map(snaps.map((snap) => [snap.id, snap.data() ?? {}]));
}

/** FR-09 — queue by age (oldest first). */
export async function listVerifications(
  db: Firestore,
  input: { status: VerificationSummary['status']; cursor?: string | undefined; limit: number },
): Promise<{ items: VerificationSummary[]; nextCursor: string | null }> {
  let query = db
    .collection('verifications')
    .where('status', '==', input.status)
    .orderBy('submittedAt', 'asc')
    .limit(input.limit + 1);
  if (input.cursor) {
    const cursor = await db.doc(`verifications/${input.cursor}`).get();
    if (cursor.exists) query = query.startAfter(cursor);
  }
  const snaps = (await query.get()).docs;
  const page = snaps.slice(0, input.limit);
  const users = await usersById(
    db,
    page.map((snap) => String(snap.get('uid'))),
  );
  return {
    items: page.map((snap) => toSummary(snap, users.get(String(snap.get('uid'))))),
    nextCursor: snaps.length > input.limit ? (page.at(-1)?.id ?? null) : null,
  };
}

/** FR-09 — detail with declared data and duplicate alert. Every view is audited. */
export async function getVerification(
  db: Firestore,
  actor: Actor,
  id: string,
): Promise<AdminGetVerificationOutput> {
  const snap = await db.doc(`verifications/${id}`).get();
  if (!snap.exists) throw appError('E_NOT_FOUND');
  const uid = String(snap.get('uid'));
  const duplicateOfUid = snap.get('duplicateOfUid') as string | null;
  const [userSnap, homeSnap, duplicateSnap] = await Promise.all([
    db.doc(`users/${uid}`).get(),
    db.doc(`homes/${uid}`).get(),
    duplicateOfUid ? db.doc(`users/${duplicateOfUid}`).get() : Promise.resolve(null),
  ]);
  const user = userSnap.data() ?? {};
  await writeAudit({
    actorUid: actor.uid,
    actorRole: actor.role,
    action: 'verification.view',
    targetType: 'verification',
    targetId: id,
  });
  const text = (value: unknown) => (typeof value === 'string' ? value : null);
  return {
    verification: toAdminView(snap, user),
    user: {
      uid,
      firstName: text(user.firstName) ?? '',
      lastName: text(user.lastName) ?? '',
      birthDate: text(user.birthDate) ?? '',
      email: text(user.email) ?? '',
      cityId: text(user.cityId),
    },
    home: homeSnap.exists
      ? {
          title: text(homeSnap.get('title')),
          cityId: text(homeSnap.get('cityId')),
          zone: text(homeSnap.get('zone')),
          tenure: (text(homeSnap.get('tenure')) as 'OWNER' | 'TENANT' | null) ?? null,
        }
      : null,
    duplicateUser:
      duplicateSnap && duplicateOfUid
        ? { uid: duplicateOfUid, displayName: shortName(duplicateSnap.data()) }
        : null,
  };
}

/**
 * BR-24 — short-lived URL of one document, always audited. Deployed: V4 signed URL (5 min).
 * Emulator: signed URLs need a service account, so the bytes travel as a `data:` URL.
 */
export async function verificationFileUrl(
  db: Firestore,
  actor: Actor,
  id: string,
  file: VerificationFile,
  now: Date,
): Promise<{ url: string; contentType: string; expiresAt: string }> {
  const snap = await db.doc(`verifications/${id}`).get();
  if (!snap.exists) throw appError('E_NOT_FOUND');
  if (snap.get('filesPurgedAt') != null) throw appError('E_FILES_PURGED');
  const path = (snap.get('files') as Partial<Record<VerificationFile, string>> | undefined)?.[file];
  if (!path) throw appError('E_NOT_FOUND');
  await writeAudit({
    actorUid: actor.uid,
    actorRole: actor.role,
    action: 'verification.file.open',
    targetType: 'verification',
    targetId: id,
    after: { file },
  });
  const expires = new Date(now.getTime() + VERIFICATION_URL_MINUTES * 60_000);
  const object = bucket().file(path);
  const [meta] = await object.getMetadata();
  const contentType =
    typeof meta.contentType === 'string' ? meta.contentType : 'application/octet-stream';
  if (process.env.FUNCTIONS_EMULATOR === 'true' || process.env.VITEST) {
    const [data] = await object.download();
    const url = `data:${contentType};base64,${data.toString('base64')}`;
    return { url, contentType, expiresAt: expires.toISOString() };
  }
  const [url] = await object.getSignedUrl({ version: 'v4', action: 'read', expires });
  return { url, contentType, expiresAt: expires.toISOString() };
}

/** FR-09 — decision; on approval also founder (BR-19) and referral (BR-20) rewards. */
export async function decideVerification(
  db: Firestore,
  actor: Actor,
  input: AdminDecideVerificationInput,
  params: Params,
  now: Date,
): Promise<VerificationAdminView> {
  if (input.decision === 'REJECT' && !input.reason) throw appError('E_REASON_REQUIRED');
  if (input.decision === 'REQUEST_INFO' && !input.infoRequest) throw appError('E_REASON_REQUIRED');
  const ref = db.doc(`verifications/${input.id}`);
  const fraud = input.fraudSuspicion === true;
  const purgeAt = fraud
    ? null
    : Timestamp.fromMillis(now.getTime() + params.verificationDocsRetentionDays * DAY_MS);
  const status =
    input.decision === 'APPROVE'
      ? 'APPROVED'
      : input.decision === 'REJECT'
        ? 'REJECTED'
        : 'INFO_REQUESTED';

  const uid = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw appError('E_NOT_FOUND');
    if (snap.get('status') !== 'PENDING') throw appError('E_STATE');
    const ownerUid = String(snap.get('uid'));
    const userRef = db.doc(`users/${ownerUid}`);
    const user = (await tx.get(userRef)).data() ?? {};
    const rewards =
      input.decision === 'APPROVE'
        ? await applyApprovalRewards(db, tx, {
            uid: ownerUid,
            user,
            docHash: String(snap.get('docNumberHash')),
            params,
            now,
          })
        : null;

    tx.update(ref, {
      status,
      reviewerUid: actor.uid,
      decisionReason: input.decision === 'REJECT' ? (input.reason ?? null) : null,
      infoRequest: input.decision === 'REQUEST_INFO' ? (input.infoRequest ?? null) : null,
      fraudSuspicion: fraud,
      decidedAt: FieldValue.serverTimestamp(),
      filesPurgeAt: purgeAt,
    });
    tx.update(userRef, {
      'verification.identity': status,
      ...(input.decision === 'APPROVE'
        ? { 'verification.docHash': snap.get('docNumberHash') as string }
        : {}),
      updatedAt: FieldValue.serverTimestamp(),
    });
    if (input.decision === 'APPROVE') {
      tx.update(db.doc(`publicProfiles/${ownerUid}`), { identityVerified: true });
    }
    rewards?.apply();
    if (typeof user.email === 'string') {
      enqueueMail(
        db,
        tx,
        {
          to: user.email,
          templateId: 'N-03',
          data: {
            result: status,
            message:
              input.decision === 'REJECT' ? (input.reason ?? null) : (input.infoRequest ?? null),
            url: `${publicUrl()}/app/verificacion`,
          },
        },
        now,
      );
    }
    return ownerUid;
  });

  await writeAudit({
    actorUid: actor.uid,
    actorRole: actor.role,
    action: `verification.${input.decision.toLowerCase()}`,
    targetType: 'verification',
    targetId: input.id,
    after: { status, fraudSuspicion: fraud },
    ...(input.reason ? { reason: input.reason } : {}),
  });
  // Identity changes the home's visibility (BR-04) and the city counters (BR-21).
  if ((await db.doc(`homes/${uid}`).get()).exists) await recomputeHome(db, uid, params);
  const [snap, user] = await Promise.all([ref.get(), db.doc(`users/${uid}`).get()]);
  return toAdminView(snap, user.data());
}
