import { BadgeCheck, Ban, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const ICONS = [BadgeCheck, Star, Ban];

/** S-01 — trust block: manual verification, reviews, no money between users (BR-33). */
export function Trust() {
  const { t } = useTranslation();
  const items = t('landing.trust.items', { returnObjects: true });
  return (
    <section aria-labelledby="trust-title" className="bg-surface py-12">
      <div className="mx-auto max-w-[1200px] px-4">
        <h2 id="trust-title" className="mb-6 text-h2">
          {t('landing.trust.title')}
        </h2>
        <ul className="grid gap-6 md:grid-cols-3">
          {items.map((item, index) => {
            const Icon = ICONS[index] ?? BadgeCheck;
            return (
              <li key={item.title} className="flex gap-3">
                <Icon aria-hidden="true" className="mt-1 size-6 shrink-0 text-brand-text" />
                <div className="flex flex-col gap-1">
                  <h3 className="text-h3">{item.title}</h3>
                  <p className="text-muted">{item.body}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
