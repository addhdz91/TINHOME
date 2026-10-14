import { useMutation } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { useMe } from '@/app/auth/auth-context';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { Seo } from '@/components/Seo';
import { Skeleton } from '@/components/Skeleton';
import { Button } from '@/components/ui/button';
import { toUserMessage } from '@/lib/app-error';
import { markAllNotificationsRead } from '@/lib/callables';
import { formatInstant, formatTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { markNotificationRead, useNotifications } from '../api/use-notifications';

/** FR-46 — `/app/avisos`: notification centre in real time; opening one marks it read. */
export function NotificationsPage() {
  const { t } = useTranslation();
  const me = useMe();
  const list = useNotifications(me.uid);
  const markAll = useMutation({
    mutationFn: () => markAllNotificationsRead({}),
    onError: (error) => toast.error(toUserMessage(t, error)),
  });
  const unread = list.status === 'ready' ? list.data.filter((n) => !n.read).length : 0;

  let content;
  if (list.status === 'loading') content = <Skeleton className="h-64" />;
  else if (list.status === 'error') content = <ErrorState />;
  else if (list.data.length === 0)
    content = (
      <EmptyState
        icon={<Bell />}
        title={t('notifications.empty')}
        body={t('notifications.emptyBody')}
      />
    );
  else
    content = (
      <ul className="flex flex-col gap-2">
        {list.data.map((item) => (
          <li key={item.id}>
            <Link
              to={item.link}
              onClick={() => {
                if (!item.read) void markNotificationRead(me.uid, item.id).catch(() => undefined);
              }}
              className={cn(
                'flex flex-col gap-1 rounded-md border px-4 py-3 hover:bg-surface-muted',
                item.read ? 'border-border bg-surface' : 'border-primary bg-brand-soft',
              )}
            >
              <span className="flex items-baseline justify-between gap-3">
                <span className="font-semibold">
                  {item.read ? null : <span className="sr-only">{t('notifications.unread')} </span>}
                  {item.title}
                </span>
                {item.createdAt ? (
                  <time
                    className="shrink-0 text-xs text-muted"
                    dateTime={item.createdAt.toISOString()}
                  >
                    {formatInstant(item.createdAt)} · {formatTime(item.createdAt)}
                  </time>
                ) : null}
              </span>
              <span className="text-sm text-muted">{item.body}</span>
            </Link>
          </li>
        ))}
      </ul>
    );

  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-4 py-4">
      <Seo title={`${t('notifications.title')} — TinHome`} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-h1">{t('notifications.title')}</h1>
        {unread > 0 ? (
          <Button variant="ghost" disabled={markAll.isPending} onClick={() => markAll.mutate()}>
            {t('notifications.markAll')}
          </Button>
        ) : null}
      </div>
      {content}
      <Link to="/app/perfil#avisos" className="text-sm font-semibold text-link underline">
        {t('notifications.settingsLink')}
      </Link>
    </section>
  );
}
