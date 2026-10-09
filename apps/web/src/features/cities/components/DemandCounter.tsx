import { Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { DemandStatDoc } from '@tinhome/shared/types';
import { formatNumber } from '@/lib/format';
import type { City, ExchangeWindow } from '../api/use-cities';

interface DemandCounterProps {
  stat: DemandStatDoc;
  cities: City[];
  windows: ExchangeWindow[];
}

/** C-14 — «47 personas de Valencia quieren ir a Madrid en Semana Santa» (FR-18). */
export function DemandCounter({ stat, cities, windows }: DemandCounterProps) {
  const { t } = useTranslation();
  const from = cities.find((c) => c.id === stat.fromCityId)?.name;
  const to = cities.find((c) => c.id === stat.toCityId)?.name;
  const window = windows.find((w) => w.id === stat.windowId)?.name;
  if (!from || !to || !window) return null;

  return (
    <p className="flex items-start gap-3 rounded-lg bg-brand-soft p-4 text-brand-text">
      <Users aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
      <span>
        <strong className="font-display text-h3 font-extrabold">{formatNumber(stat.count)}</strong>{' '}
        {t('demand.sentence', { from, to, window })}
      </span>
    </p>
  );
}
