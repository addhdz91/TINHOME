import type { DocumentData, DocumentSnapshot } from 'firebase-admin/firestore';
import {
  VERIFICATION_FILES,
  type PropertyDocType,
  type Tenure,
  type VerificationFile,
  type VerificationStatus,
} from '@tinhome/shared/constants';
import type {
  MyVerification,
  VerificationAdminView,
  VerificationSummary,
} from '@tinhome/shared/schemas';

export function iso(value: unknown): string | null {
  return value && typeof value === 'object' && 'toDate' in value
    ? (value as { toDate: () => Date }).toDate().toISOString()
    : null;
}

/** «Laura M.» — what admins see in lists (full name only in the detail). */
export function shortName(user: DocumentData | undefined): string {
  const first = typeof user?.firstName === 'string' ? user.firstName : '';
  const last = typeof user?.lastName === 'string' ? user.lastName : '';
  return `${first} ${last.charAt(0)}${last ? '.' : ''}`.trim();
}

function str(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export function toMyVerification(snap: DocumentSnapshot): MyVerification {
  const data = snap.data() ?? {};
  return {
    id: snap.id,
    status: data.status as VerificationStatus,
    tenure: data.tenure as Tenure,
    propertyDocType: data.propertyDocType as PropertyDocType,
    decisionReason: str(data.decisionReason),
    infoRequest: str(data.infoRequest),
    submittedAt: iso(data.submittedAt) ?? new Date(0).toISOString(),
    decidedAt: iso(data.decidedAt),
  };
}

export function toSummary(
  snap: DocumentSnapshot,
  user: DocumentData | undefined,
): VerificationSummary {
  const data = snap.data() ?? {};
  return {
    id: snap.id,
    uid: String(data.uid),
    displayName: shortName(user),
    cityId: str(user?.cityId),
    tenure: data.tenure as Tenure,
    status: data.status as VerificationStatus,
    submittedAt: iso(data.submittedAt) ?? new Date(0).toISOString(),
    duplicate: typeof data.duplicateOfUid === 'string',
    fraudSuspicion: data.fraudSuspicion === true,
  };
}

export function toAdminView(
  snap: DocumentSnapshot,
  user: DocumentData | undefined,
): VerificationAdminView {
  const data = snap.data() ?? {};
  const files = (data.files ?? {}) as Partial<Record<VerificationFile, string>>;
  return {
    ...toSummary(snap, user),
    propertyDocType: data.propertyDocType as PropertyDocType,
    files: VERIFICATION_FILES.filter((key) => typeof files[key] === 'string'),
    filesPurged: data.filesPurgedAt != null,
    reviewerUid: str(data.reviewerUid),
    decisionReason: str(data.decisionReason),
    infoRequest: str(data.infoRequest),
    decidedAt: iso(data.decidedAt),
  };
}
