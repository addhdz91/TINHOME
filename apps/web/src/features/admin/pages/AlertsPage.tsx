import { useMutation } from '@tanstack/react-query';
import { BellRing } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { EmptyState } from '@/components/EmptyState';
import { Seo } from '@/components/Seo';
import { Skeleton } from '@/components/Skeleton';
import { Button } from '@/components/ui/button';
import { toUserMessage } from '@/lib/app-error';
import { adminHandleAlert } from '@/lib/callables';
import { cn } from '@/lib/utils';
import { useAdminAlerts, type AlertItem } from '../api/use-alerts';
import { relativeAge } from '../lib/format';

const LINKS: Record<string, (id: string) => string> = {
  report: (id) => `/admin/denuncias/${id}`,
  home: () => '/admin/retenciones',
  user: () => '/admin/retenciones',
  ticket: (id) => `/admin/quejas/${id}`,
  verification: (id) => `/admin/verificaciones/${id}`,
};

function beep(): void {
  try {
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    oscillator.frequency.value = 880;
    oscillator.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.15);
  } catch {
    // No audio available.
  }
}

/** UX §9 — real-time alerts (N-26) with an optional sound and «atendida». */
export function AlertsPage() {
  const { t } = useTranslation();
  const alerts = useAdminAlerts();
  const [sound, setSound] = useState(false);
  const seen = useRef<number | null>(null);
  useEffect(() => {
    if (!alerts) return;
    if (sound && seen.current !== null && alerts.length > seen.current) beep();
    seen.current = alerts.length;
  }, [alerts, sound]);
  const handle = useMutation({
    mutationFn: (alert: AlertItem) => adminHandleAlert({ alertId: alert.id }),
    onError: (error) => toast.error(toUserMessage(t, error)),
  });
  return (
    <section className="flex flex-col gap-4">
      <Seo title={`${t('admin.alerts.title')} — ${t('admin.title')}`} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-h1">{t('admin.alerts.title')}</h1>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            className="size-5 accent-primary"
            checked={sound}
            onChange={(event) => setSound(event.target.checked)}
          />
          {t('admin.alerts.sound')}
        </label>
      </div>
      {alerts === null ? (
        <Skeleton className="h-64" />
      ) : alerts.length === 0 ? (
        <EmptyState icon={<BellRing />} title={t('admin.alerts.empty')} />
      ) : (
        <ul className="flex flex-col gap-2" aria-live="polite">
          {alerts.map((alert) => (
            <li
              key={alert.id}
              className={cn(
                'flex flex-wrap items-center justify-between gap-3 rounded-md border p-3',
                alert.priority === 'HIGH' ? 'border-danger' : 'border-border',
              )}
            >
              <span>
                <span className="font-semibold">{t(`admin.alerts.types.${alert.type}`)}</span>
                {alert.createdAt ? ` · ${relativeAge(alert.createdAt.toISOString())}` : ''}
              </span>
              <span className="flex gap-2">
                <Button asChild size="sm" variant="secondary">
                  <Link to={(LINKS[alert.refType] ?? (() => '/admin'))(alert.refId)}>
                    {t('admin.alerts.open')}
                  </Link>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={handle.isPending}
                  onClick={() => handle.mutate(alert)}
                >
                  {t('admin.alerts.handle')}
                </Button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
