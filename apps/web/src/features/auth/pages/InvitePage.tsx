import { Navigate, useParams } from 'react-router';
import { normalizeReferralCode } from '@tinhome/shared/domain';
import { rememberReferral } from '../lib/auth-actions';

/** `/i/:code` — remembers the invitation and opens the sign-up with `?ref=` (FR-01, BR-20). */
export function InvitePage() {
  const { code } = useParams();
  const normalized = normalizeReferralCode(code ?? '');
  if (normalized) rememberReferral(normalized);
  return <Navigate to={normalized ? `/registro?ref=${normalized}` : '/registro'} replace />;
}
