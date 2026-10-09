import { ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePublicConfig } from '@/hooks/use-public-config';
import { formatPrice } from '@/lib/format';

/** S-01 — FAQ with native disclosure widgets (keyboard and screen reader friendly). */
export function Faq() {
  const { t } = useTranslation();
  const config = usePublicConfig();
  const monthly = config.data ? formatPrice(config.data.premiumMonthlyPriceCents) : '…';
  const yearly = config.data ? formatPrice(config.data.premiumYearlyPriceCents) : '…';
  const items = t('landing.faq.items', { returnObjects: true, monthly, yearly });

  return (
    <section aria-labelledby="faq-title" className="mx-auto max-w-3xl px-4 py-12">
      <h2 id="faq-title" className="mb-6 text-h2">
        {t('landing.faq.title')}
      </h2>
      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <details key={item.q} className="group rounded-lg border border-border bg-surface">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 p-4 font-semibold [&::-webkit-details-marker]:hidden">
              {item.q}
              <ChevronDown
                aria-hidden="true"
                className="size-5 shrink-0 transition-transform duration-base group-open:rotate-180"
              />
            </summary>
            <p className="px-4 pb-4 text-muted">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
