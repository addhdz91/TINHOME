import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import { toast } from 'sonner';
import { isTicketOpen } from '@tinhome/shared/domain';
import { ErrorState } from '@/components/ErrorState';
import { Seo } from '@/components/Seo';
import { Skeleton } from '@/components/Skeleton';
import { Button } from '@/components/ui/button';
import { toUserMessage } from '@/lib/app-error';
import { addComplaintMessage, getComplaint } from '@/lib/callables';
import { formatInstant } from '@/lib/format';
import { TicketThread } from '../components/TicketThread';

/** `/app/soporte/:id` — status, deadline and thread with replies (FR-67). */
export function ComplaintDetailPage() {
  const { t } = useTranslation();
  const { ticketId = '' } = useParams();
  const detail = useQuery({
    queryKey: ['complaint', ticketId],
    queryFn: () => getComplaint({ ticketId }),
  });
  const [text, setText] = useState('');
  const reply = useMutation({
    mutationFn: () => addComplaintMessage({ ticketId, text: text.trim() }),
    onSuccess: async () => {
      setText('');
      await detail.refetch();
    },
    onError: (error) => toast.error(toUserMessage(t, error)),
  });
  if (detail.isPending) return <Skeleton className="mt-4 h-64" />;
  if (detail.isError) return <ErrorState onRetry={() => void detail.refetch()} />;
  const { ticket } = detail.data;
  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-4 py-4">
      <Seo title={`${ticket.number} — TinHome`} />
      <Link to="/app/soporte" className="text-sm font-semibold text-link underline">
        {t('support.mine.title')}
      </Link>
      <h1 className="text-h1">
        {ticket.number} · {ticket.subject}
      </h1>
      <p className="font-semibold">
        {t(`support.status.${ticket.status}`)} ·{' '}
        {t('support.mine.due', { date: formatInstant(new Date(ticket.dueAt)) })}
      </p>
      <TicketThread detail={detail.data} />
      {isTicketOpen(ticket.status) ? (
        <form
          className="flex flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (text.trim()) reply.mutate();
          }}
        >
          <label htmlFor="ticket-reply" className="font-semibold">
            {t('support.reply')}
          </label>
          <textarea
            id="ticket-reply"
            className="min-h-24 rounded-md border border-border bg-surface p-3"
            maxLength={4000}
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
          <Button type="submit" className="self-start" disabled={!text.trim() || reply.isPending}>
            {t('support.send')}
          </Button>
        </form>
      ) : (
        <p className="text-sm text-muted">{t('support.closed')}</p>
      )}
      <p className="text-sm text-muted">{t('support.official')}</p>
    </section>
  );
}
