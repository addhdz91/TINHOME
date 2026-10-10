import { Home as HomeIcon, MessageCircleHeart } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, NavLink } from 'react-router';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { Skeleton } from '@/components/Skeleton';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { otherOf, type MatchView } from '../lib/types';

function Avatar({ src }: { src: string | null }) {
  return src ? (
    <img src={src} alt="" className="size-12 shrink-0 rounded-full object-cover" />
  ) : (
    <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-text">
      <HomeIcon aria-hidden="true" className="size-5" />
    </span>
  );
}

function time(date: Date | null): string {
  if (!date) return '';
  const today = new Date().toDateString() === date.toDateString();
  return today
    ? date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

/** S-08 — new matches carousel and conversations by last activity (FR-25). */
export function ChatList({
  uid,
  matches,
}: {
  uid: string;
  matches: { status: 'loading' } | { status: 'error' } | { status: 'ready'; data: MatchView[] };
}) {
  const { t } = useTranslation();
  if (matches.status === 'loading') {
    return (
      <div className="flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    );
  }
  if (matches.status === 'error') return <ErrorState />;
  if (matches.data.length === 0) {
    return (
      <EmptyState
        icon={<MessageCircleHeart />}
        title={t('chat.emptyTitle')}
        body={t('chat.emptyBody')}
        action={
          <Button asChild>
            <Link to="/app/descubrir">{t('nav.discover')}</Link>
          </Button>
        }
      />
    );
  }
  const fresh = matches.data.filter((m) => m.lastMessage?.type !== 'TEXT');
  return (
    <div className="flex flex-col gap-4">
      {fresh.length > 0 ? (
        <section aria-labelledby="new-matches">
          <h2 id="new-matches" className="mb-2 text-sm font-semibold text-muted">
            {t('chat.newMatches')}
          </h2>
          <ul className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
            {fresh.map((match) => {
              const other = match.people[otherOf(match, uid)];
              return (
                <li key={match.id}>
                  <Link
                    to={`/app/chats/${match.id}`}
                    className="flex w-16 flex-col items-center gap-1 text-center text-xs"
                  >
                    <Avatar src={other?.photoUrl ?? null} />
                    <span className="line-clamp-1">{other?.displayName}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
      <ul className="flex flex-col">
        {matches.data.map((match) => {
          const other = match.people[otherOf(match, uid)];
          const unread = match.unread[uid] ?? 0;
          const preview =
            match.lastMessage?.type === 'TEXT' ? match.lastMessage.text : t('chat.sayHi');
          return (
            <li key={match.id}>
              <NavLink
                to={`/app/chats/${match.id}`}
                className={({ isActive }) =>
                  cn(
                    'flex min-h-16 items-center gap-3 rounded-md p-2 hover:bg-surface-muted',
                    isActive && 'bg-brand-soft',
                  )
                }
              >
                <Avatar src={other?.photoUrl ?? null} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate font-semibold">{other?.displayName}</span>
                    <span className="shrink-0 text-xs text-muted">
                      {time(match.lastActivityAt)}
                    </span>
                  </span>
                  <span className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        'truncate text-sm',
                        unread > 0 ? 'font-semibold' : 'text-muted',
                      )}
                    >
                      {preview}
                    </span>
                    {unread > 0 ? (
                      <span className="shrink-0 rounded-full bg-primary px-2 text-xs font-bold text-primary-foreground">
                        <span className="sr-only">{t('chat.unread', { count: unread })}</span>
                        <span aria-hidden="true">{unread}</span>
                      </span>
                    ) : null}
                  </span>
                  <span className="text-xs text-muted">
                    {other?.cityName}
                    {match.perfectFit ? ` · ${t('compat.perfectFit')}` : ''}
                  </span>
                </span>
              </NavLink>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
