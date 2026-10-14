import { useTranslation } from 'react-i18next';
import type { TicketDetail } from '@tinhome/shared/schemas';
import { formatInstant, formatTime } from '@/lib/format';
import { cn } from '@/lib/utils';

/** Description + replies of a complaint, for the person and for the team. */
export function TicketThread({ detail }: { detail: TicketDetail }) {
  const { t } = useTranslation();
  return (
    <ol className="flex flex-col gap-3" aria-label={t('support.thread')}>
      <li className="rounded-md border border-border p-3">
        <p className="text-sm font-semibold">{t('support.you')}</p>
        <p className="break-words whitespace-pre-wrap">{detail.ticket.description}</p>
      </li>
      {detail.messages.map((message) => (
        <li
          key={message.id}
          className={cn(
            'rounded-md p-3',
            message.authorType === 'ADMIN'
              ? 'bg-brand-soft text-brand-text'
              : 'border border-border',
          )}
        >
          <p className="text-sm font-semibold">
            {message.authorType === 'ADMIN' ? t('support.team') : t('support.you')} ·{' '}
            {formatInstant(new Date(message.createdAt))} {formatTime(new Date(message.createdAt))}
          </p>
          <p className="break-words whitespace-pre-wrap">{message.text}</p>
        </li>
      ))}
    </ol>
  );
}
