import { Check, Minus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PARAM_DEFAULTS } from '@tinhome/shared/constants';
import type { PublicConfig } from '@tinhome/shared/types';

type Cell = string | boolean;

function CellValue({ value }: { value: Cell }) {
  const { t } = useTranslation();
  if (value === true) {
    return (
      <>
        <Check aria-hidden="true" className="mx-auto size-5 text-success" />
        <span className="sr-only">{t('pricing.included')}</span>
      </>
    );
  }
  if (value === false) {
    return (
      <>
        <Minus aria-hidden="true" className="mx-auto size-5 text-muted" />
        <span className="sr-only">{t('pricing.notIncluded')}</span>
      </>
    );
  }
  return <>{value}</>;
}

/** FR-34 — Free vs Premium comparison (values from config/public where they exist). */
export function FeatureTable({ config }: { config: PublicConfig }) {
  const { t } = useTranslation();
  const rows: { key: string; label: string; free: Cell; premium: Cell }[] = [
    { key: 'publish', label: t('pricing.rows.publish'), free: true, premium: true },
    {
      key: 'likes',
      label: t('pricing.rows.likes'),
      free: t('pricing.rows.likesFree', { count: config.freeDailyLikes }),
      premium: t('pricing.rows.likesPremium'),
    },
    {
      key: 'whoLiked',
      label: t('pricing.rows.whoLiked'),
      free: t('pricing.rows.whoLikedFree'),
      premium: t('pricing.rows.whoLikedPremium'),
    },
    {
      key: 'visibility',
      label: t('pricing.rows.visibility'),
      free: t('pricing.rows.visibilityFree'),
      premium: t('pricing.rows.visibilityPremium'),
    },
    { key: 'top', label: t('pricing.rows.top'), free: false, premium: true },
    { key: 'filters', label: t('pricing.rows.filters'), free: false, premium: true },
    {
      key: 'undo',
      label: t('pricing.rows.undo'),
      free: t('pricing.rows.undoFree'),
      premium: t('pricing.rows.undoPremium'),
    },
    { key: 'chat', label: t('pricing.rows.chat'), free: true, premium: true },
    {
      key: 'messageLike',
      label: t('pricing.rows.messageLike'),
      free: false,
      // P-27 is not part of config/public; the documented default is shown.
      premium: t('pricing.rows.messageLikePremium', {
        count: PARAM_DEFAULTS.premiumMessageLikesPerDay,
      }),
    },
    {
      key: 'sponsored',
      label: t('pricing.rows.sponsored'),
      free: true,
      premium: t('pricing.rows.sponsoredPremium'),
    },
  ];

  return (
    <div className="w-full min-w-0 overflow-x-auto rounded-lg border border-border">
      <table className="w-full border-collapse bg-surface text-left">
        <caption className="sr-only">{t('pricing.tableCaption')}</caption>
        <thead>
          <tr className="border-b border-border">
            <th scope="col" className="p-3 text-sm font-semibold text-muted">
              {t('pricing.feature')}
            </th>
            <th scope="col" className="p-3 text-center text-sm font-semibold">
              {t('pricing.free')}
            </th>
            <th scope="col" className="p-3 text-center text-sm font-semibold text-brand-text">
              {t('pricing.premium')}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-b border-border last:border-b-0">
              <th scope="row" className="p-3 font-normal">
                {row.label}
              </th>
              <td className="p-3 text-center text-sm">
                <CellValue value={row.free} />
              </td>
              <td className="p-3 text-center text-sm">
                <CellValue value={row.premium} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
