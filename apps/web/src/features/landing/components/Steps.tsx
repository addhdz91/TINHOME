import { HeartHandshake, Home, KeyRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const ICONS = [Home, HeartHandshake, KeyRound];

/** S-01 — three steps: publish · match · agree and exchange. */
export function Steps() {
  const { t } = useTranslation();
  const items = t('landing.steps.items', { returnObjects: true });
  return (
    <section aria-labelledby="steps-title" className="mx-auto max-w-[1200px] px-4 py-12">
      <h2 id="steps-title" className="mb-6 text-h2">
        {t('landing.steps.title')}
      </h2>
      <ol className="grid gap-4 md:grid-cols-3">
        {items.map((item, index) => {
          const Icon = ICONS[index] ?? Home;
          return (
            <li
              key={item.title}
              className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-5"
            >
              <Icon aria-hidden="true" className="size-6 text-primary" />
              <h3 className="text-h3">{item.title}</h3>
              <p className="text-muted">{item.body}</p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
