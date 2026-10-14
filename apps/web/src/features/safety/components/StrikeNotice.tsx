import { ShieldAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useStanding } from '../api/use-standing';

/** S-20 — banner with active strikes or a preventive hold, linking to «Mi cuenta». */
export function StrikeNotice() {
  const { t } = useTranslation();
  const standing = useStanding();
  if (!standing.data) return null;
  const { hold, strikes } = standing.data;
  if (!hold && strikes.length === 0) return null;
  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-md border border-warning bg-surface p-4"
    >
      <ShieldAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-warning" />
      <div className="flex flex-col gap-1">
        <p className="font-semibold">
          {hold ? t('standing.holdTitle') : t('standing.strikes', { count: strikes.length })}
        </p>
        <p className="text-sm">{hold ? t('standing.holdBody') : t('standing.strikesBody')}</p>
        <Link to="/app/mi-cuenta" className="text-sm font-semibold text-link underline">
          {t('standing.open')}
        </Link>
      </div>
    </div>
  );
}
