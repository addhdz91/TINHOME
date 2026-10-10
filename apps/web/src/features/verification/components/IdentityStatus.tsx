import { CheckCircle2, Clock, MessageSquareWarning, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { MyVerification } from '@tinhome/shared/schemas';

/** S-14 — current status with its explanation; the form is shown again when it can be resent. */
export function IdentityStatus({ verification }: { verification: MyVerification }) {
  const { t } = useTranslation();
  switch (verification.status) {
    case 'PENDING':
      return (
        <p role="status" className="flex items-start gap-3 rounded-md bg-surface-muted p-4">
          <Clock aria-hidden="true" className="mt-0.5 size-6 shrink-0 text-brand-text" />
          <span>
            <strong className="block">{t('verification.status.PENDING')}</strong>
            {t('verification.status.pendingBody')}
          </span>
        </p>
      );
    case 'APPROVED':
      return (
        <p
          role="status"
          className="flex items-center gap-3 rounded-md bg-surface-muted p-4 font-semibold"
        >
          <CheckCircle2 aria-hidden="true" className="size-6 shrink-0 text-success" />
          {t('verification.status.APPROVED')}
        </p>
      );
    case 'INFO_REQUESTED':
      return (
        <div role="status" className="flex items-start gap-3 rounded-md border border-warning p-4">
          <MessageSquareWarning aria-hidden="true" className="mt-0.5 size-6 shrink-0" />
          <div>
            <strong className="block">{t('verification.status.INFO_REQUESTED')}</strong>
            <p>{verification.infoRequest}</p>
            <p className="text-sm text-muted">{t('verification.status.resendBody')}</p>
          </div>
        </div>
      );
    case 'REJECTED':
      return (
        <div role="status" className="flex items-start gap-3 rounded-md border border-danger p-4">
          <XCircle aria-hidden="true" className="mt-0.5 size-6 shrink-0 text-danger" />
          <div>
            <strong className="block">{t('verification.status.REJECTED')}</strong>
            <p>{t('verification.status.reason', { reason: verification.decisionReason ?? '' })}</p>
            <p className="text-sm text-muted">{t('verification.status.resendBody')}</p>
          </div>
        </div>
      );
  }
}
