import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import { toast } from 'sonner';
import { TICKET_STATUS, type TicketStatus } from '@tinhome/shared/constants';
import { ErrorState } from '@/components/ErrorState';
import { Seo } from '@/components/Seo';
import { Skeleton } from '@/components/Skeleton';
import { Button } from '@/components/ui/button';
import { TicketThread } from '@/features/support/components/TicketThread';
import { toUserMessage } from '@/lib/app-error';
import { adminGetComplaint, adminReplyComplaint } from '@/lib/callables';
import { relativeAge } from '../lib/format';

const REPLY_TEMPLATES = ['ask', 'refund', 'explain', 'resolved'] as const;

/** UX §9 — answer a complaint with templates (PROVISIONAL) and set its status (FR-67). */
export function ComplaintDetailPage() {
  const { t } = useTranslation();
  const { ticketId = '' } = useParams();
  const detail = useQuery({
    queryKey: ['admin', 'complaint', ticketId],
    queryFn: () => adminGetComplaint({ ticketId }),
  });
  const [text, setText] = useState('');
  const [status, setStatus] = useState<TicketStatus>('WAITING_USER');
  const reply = useMutation({
    mutationFn: () => adminReplyComplaint({ ticketId, text: text.trim(), status }),
    onSuccess: async () => {
      toast.success(t('admin.complaints.sent'));
      setText('');
      await detail.refetch();
    },
    onError: (error) => toast.error(toUserMessage(t, error)),
  });
  if (detail.isPending) return <Skeleton className="h-96" />;
  if (detail.isError) return <ErrorState onRetry={() => void detail.refetch()} />;
  const { ticket } = detail.data;
  return (
    <section className="flex max-w-3xl flex-col gap-4">
      <Seo title={`${ticket.number} — ${t('admin.title')}`} />
      <Link to="/admin/quejas" className="text-sm font-semibold text-link underline">
        {t('admin.complaints.title')}
      </Link>
      <h1 className="text-h1">
        {ticket.number} · {ticket.subject}
      </h1>
      <p className="text-sm text-muted">
        {t(`support.categories.${ticket.category}`)} · {t(`support.status.${ticket.status}`)} ·{' '}
        {t('admin.reports.due')} {relativeAge(ticket.dueAt)} · {ticket.email ?? '—'}
      </p>
      <TicketThread detail={detail.data} />
      <form
        className="flex flex-col gap-3 rounded-lg border border-border p-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (text.trim()) reply.mutate();
        }}
      >
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label={t('admin.complaints.templates')}
        >
          {REPLY_TEMPLATES.map((key) => (
            <button
              key={key}
              type="button"
              className="min-h-11 rounded-full border border-border px-3 text-sm"
              onClick={() => setText(t(`admin.complaints.template.${key}`))}
            >
              {t(`admin.complaints.templateName.${key}`)}
            </button>
          ))}
        </div>
        <label htmlFor="complaint-reply" className="font-semibold">
          {t('admin.complaints.answer')}
        </label>
        <textarea
          id="complaint-reply"
          className="min-h-32 rounded-md border border-border bg-surface p-3"
          maxLength={4000}
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
        <label className="flex flex-col gap-1">
          <span className="font-semibold">{t('admin.complaints.newStatus')}</span>
          <select
            className="min-h-11 rounded-md border border-border bg-surface px-3"
            value={status}
            onChange={(event) => setStatus(event.target.value as TicketStatus)}
          >
            {TICKET_STATUS.map((value) => (
              <option key={value} value={value}>
                {t(`support.status.${value}`)}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" className="self-start" disabled={!text.trim() || reply.isPending}>
          {t('admin.complaints.send')}
        </Button>
      </form>
    </section>
  );
}
