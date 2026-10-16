import {
  FieldValue,
  type DocumentReference,
  type Firestore,
  type WriteBatch,
  type Transaction,
} from 'firebase-admin/firestore';
import {
  CONSENT_DOCS,
  CONSENT_TEXTS,
  MARKETING_CONSENT_TEXT,
  MARKETING_CONSENT_VERSION,
  type ConsentSource,
  type LegalAcceptanceType,
} from '@tinhome/shared/constants';
import { truncateIp } from '@tinhome/shared/domain';
import { appError } from './app-error.js';
import { sha256Hex } from './crypto.js';
import { currentLegalVersions } from './legal.js';

const USER_AGENT_MAX = 300;

/** How and from where the acceptance was given (the «cómo» of the evidence). */
export interface ConsentContext {
  uid: string | null;
  /** E-mail the person used (stored only as a hash, to find visitor records). */
  email: string | null;
  source: ConsentSource;
  /** `password`, `google.com`… for sign-ups (from the ID token). */
  authProvider?: string | null;
  ip: string;
  userAgent: string | null;
}

export interface ConsentItem {
  slug: string;
  version: string;
  type: LegalAcceptanceType;
}

/** The browser that sent the request (shortened; part of the evidence). */
export function requestUserAgent(
  rawRequest: { headers?: Record<string, unknown> } | undefined,
): string | null {
  const value = rawRequest?.headers?.['user-agent'];
  return typeof value === 'string' && value.length > 0 ? value.slice(0, USER_AGENT_MAX) : null;
}

/** E_LEGAL_VERSION unless every `slug → version` is the current version of that text. */
export async function assertCurrentVersions(
  db: Firestore,
  versions: Readonly<Record<string, string>>,
): Promise<void> {
  const slugs = Object.keys(versions);
  const current = await currentLegalVersions(db, slugs);
  for (const slug of slugs) {
    if (current.find((doc) => doc.slug === slug)?.version !== versions[slug])
      throw appError('E_LEGAL_VERSION');
  }
}

/**
 * BR-35 / RGPD art. 7.1 — builds one evidence record per accepted text: who, which text and
 * version (plus the SHA-256 of its exact content), when (server time), how (form, checkbox
 * wording, sign-in method) and from where (truncated IP, browser). Reads happen here, before
 * any transaction; `writeConsents` only writes.
 */
export async function prepareConsents(
  db: Firestore,
  items: readonly ConsentItem[],
  context: ConsentContext,
): Promise<Record<string, unknown>[]> {
  const versions = items.length
    ? await db.getAll(
        ...items.map((item) => db.doc(`legalDocs/${item.slug}/versions/${item.version}`)),
      )
    : [];
  const emailHash = context.email ? sha256Hex(context.email.trim().toLowerCase()) : null;
  return items.map((item, index) => {
    const markdown = versions[index]?.get('markdown') as string | undefined;
    const consentDoc = CONSENT_DOCS.find((slug) => slug === item.slug);
    return {
      uid: context.uid,
      emailHash,
      type: item.type,
      slug: item.slug,
      version: item.version,
      contentHash: markdown === undefined ? null : sha256Hex(markdown),
      source: context.source,
      method: 'CHECKBOX',
      consentText: consentDoc ? CONSENT_TEXTS[consentDoc] : null,
      authProvider: context.authProvider ?? null,
      acceptedAt: FieldValue.serverTimestamp(),
      ipTruncated: truncateIp(context.ip),
      userAgent: context.userAgent,
    };
  });
}

/**
 * FR-46 / LSSI art. 21 — evidence of turning commercial e-mails on or off in Ajustes: the exact
 * wording and its version, when, and from where. Insert-only, like the legal acceptances.
 */
export function marketingConsentRecord(
  optIn: boolean,
  context: Omit<ConsentContext, 'source' | 'authProvider'>,
): Record<string, unknown> {
  return {
    uid: context.uid,
    emailHash: context.email ? sha256Hex(context.email.trim().toLowerCase()) : null,
    type: optIn ? 'MARKETING_OPT_IN' : 'MARKETING_OPT_OUT',
    slug: null,
    version: MARKETING_CONSENT_VERSION,
    contentHash: sha256Hex(MARKETING_CONSENT_TEXT),
    source: 'SETTINGS',
    method: 'TOGGLE',
    consentText: MARKETING_CONSENT_TEXT,
    authProvider: null,
    acceptedAt: FieldValue.serverTimestamp(),
    ipTruncated: truncateIp(context.ip),
    userAgent: context.userAgent,
  };
}

/** Writes the prepared records (insert-only) inside a transaction or a batch. */
export function writeConsents(
  db: Firestore,
  writer: Transaction | WriteBatch,
  records: readonly Record<string, unknown>[],
): void {
  for (const record of records) {
    const ref: DocumentReference = db.collection('legalAcceptances').doc();
    writer.create(ref, record);
  }
}

/** Prepares and stores them on their own (when no other write needs to be atomic with them). */
export async function recordConsents(
  db: Firestore,
  items: readonly ConsentItem[],
  context: ConsentContext,
): Promise<void> {
  const batch = db.batch();
  writeConsents(db, batch, await prepareConsents(db, items, context));
  await batch.commit();
}
