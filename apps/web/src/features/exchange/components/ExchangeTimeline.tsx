import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { EXCHANGE_PHASES, type ExchangePhase } from '@tinhome/shared/constants';
import { cn } from '@/lib/utils';

/** S-09 — Propuesto → Confirmado → En curso → Completado, with the current step marked. */
export function ExchangeTimeline({ phase }: { phase: ExchangePhase }) {
  const { t } = useTranslation();
  const current = EXCHANGE_PHASES.indexOf(phase);
  return (
    <ol className="grid grid-cols-4 gap-1" aria-label={t('exchange.page.timeline')}>
      {EXCHANGE_PHASES.map((step, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li
            key={step}
            aria-current={active ? 'step' : undefined}
            className="flex min-w-0 flex-col items-center gap-1 text-center"
          >
            <span
              className={cn(
                'flex size-8 items-center justify-center rounded-full border-2 text-sm font-bold',
                done && 'border-primary bg-primary text-primary-foreground',
                active && 'border-primary text-primary',
                !done && !active && 'border-border text-muted',
              )}
            >
              {done ? <Check aria-hidden="true" className="size-4" /> : index + 1}
            </span>
            <span className={cn('text-xs', active ? 'font-semibold' : 'text-muted')}>
              {t(`exchange.phases.${step}`)}
              {done ? <span className="sr-only"> {t('exchange.page.stepDone')}</span> : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
