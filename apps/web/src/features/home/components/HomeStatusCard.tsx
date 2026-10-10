import { AlertTriangle, CheckCircle2, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { HomeOwnerView } from '@tinhome/shared/schemas';

/** FR-13 — status with explanation («Publicada · pendiente de verificación de identidad»). */
export function HomeStatusCard({ home }: { home: HomeOwnerView }) {
  const { t } = useTranslation();
  const problems = home.visibilityProblems.filter(
    (p) => p !== 'NOT_PUBLISHED' || home.status !== 'PUBLISHED',
  );
  return (
    <section
      aria-live="polite"
      className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4"
    >
      <p className="flex items-center gap-2 font-semibold">
        {home.visible ? (
          <CheckCircle2 aria-hidden="true" className="size-5 text-success" />
        ) : (
          <EyeOff aria-hidden="true" className="size-5 text-warning" />
        )}
        {t(`home.status.${home.status}`)} ·{' '}
        {home.visible ? t('home.status.visible') : t('home.status.hidden')}
      </p>
      {home.moderationHold ? (
        <p className="flex items-center gap-2 text-warning">
          <AlertTriangle aria-hidden="true" className="size-4" />
          {t(`home.hold.${home.moderationHold.reason}`)}
        </p>
      ) : null}
      {!home.visible && problems.length > 0 ? (
        <ul className="list-disc pl-5 text-sm text-muted">
          {problems.map((problem) => (
            <li key={problem}>{t(`home.problems.${problem as 'IDENTITY'}`)}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
