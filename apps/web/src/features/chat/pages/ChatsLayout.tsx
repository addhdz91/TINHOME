import { useTranslation } from 'react-i18next';
import { Outlet, useParams } from 'react-router';
import { useMe } from '@/app/auth/auth-context';
import { Seo } from '@/components/Seo';
import { cn } from '@/lib/utils';
import { useMatches } from '../api/use-chat-data';
import { ChatList } from '../components/ChatList';

/** S-08 — mobile: list or conversation; desktop: list on the left, conversation on the right. */
export function ChatsLayout() {
  const { t } = useTranslation();
  const me = useMe();
  const { matchId } = useParams();
  const matches = useMatches(me.uid);
  return (
    <div className="grid gap-4 py-2 lg:grid-cols-[320px_minmax(0,1fr)]">
      <aside className={cn('flex flex-col gap-3', matchId && 'hidden lg:flex')}>
        <Seo title={`${t('nav.chats')} — TinHome`} />
        <h1 className={cn('text-h1', matchId && 'sr-only lg:not-sr-only')}>{t('nav.chats')}</h1>
        <ChatList uid={me.uid} matches={matches} />
      </aside>
      <div className={cn(!matchId && 'hidden lg:block')}>
        <Outlet />
      </div>
    </div>
  );
}

export function ChatsIndex() {
  const { t } = useTranslation();
  return <p className="hidden p-8 text-center text-muted lg:block">{t('chat.pick')}</p>;
}
