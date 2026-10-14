import { Bell } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useMe } from '@/app/auth/auth-context';
import { useUnreadNotifications } from '../api/use-notifications';

/** FR-46 — bell in the app header with the unread badge (real time). */
export function NotificationBell() {
  const { t } = useTranslation();
  const me = useMe();
  const unread = useUnreadNotifications(me.uid);
  return (
    <Link
      to="/app/avisos"
      aria-label={
        unread > 0 ? t('notifications.bellUnread', { count: unread }) : t('notifications.title')
      }
      className="relative inline-flex size-11 items-center justify-center rounded-md hover:bg-surface-muted"
    >
      <Bell aria-hidden="true" className="size-5" />
      {unread > 0 ? (
        <span
          aria-hidden="true"
          className="absolute top-1 right-1 min-w-5 rounded-full bg-primary px-1 text-center text-xs font-bold text-primary-foreground"
        >
          {unread > 9 ? '9+' : unread}
        </span>
      ) : null}
    </Link>
  );
}
