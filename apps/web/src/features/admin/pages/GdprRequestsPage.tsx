import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { GDPR_REQUEST_STATUS, type GdprRequestStatus } from '@tinhome/shared/constants';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { Seo } from '@/components/Seo';
import { Skeleton } from '@/components/Skeleton';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { toUserMessage } from '@/lib/app-error';
import { adminCloseGdprRequest, adminListGdprRequests } from '@/lib/callables';
import { formatInstant } from '@/lib/format';

const NOTE_MIN = 5;
const PAGE = 50;

function CloseForm({ id, onClosed }: { id: string; onClosed: () => void }) {
  const { t } = useTranslation();
  const [note, setNote] = useState('');
  const close = useMutation({
    mutationFn: (status: 'DONE' | 'REJECTED') => adminCloseGdprRequest({ id, status, note }),
    onSuccess: () => {
      toast.success(t('admin.gdpr.closed'));
      onClosed();
    },
    onError: (error) => toast.error(toUserMessage(t, error)),
  });
  const ready = note.trim().length >= NOTE_MIN && !close.isPending;
  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span className="font-semibold">{t('admin.gdpr.note')}</span>
        <textarea
          className="min-h-28 rounded-md border border-border bg-surface p-3"
          value={note}
          maxLength={2000}
          onChange={(e) => setNote(e.target.value)}
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <Button disabled={!ready} onClick={() => close.mutate('DONE')}>
          {t('admin.gdpr.done')}
        </Button>
        <Button variant="secondary" disabled={!ready} onClick={() => close.mutate('REJECTED')}>
          {t('admin.gdpr.rejected')}
        </Button>
      </div>
    </div>
  );
}

/** UX §9 / FR-59 — GDPR rights queue by due date, overdue first. */
export function GdprRequestsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<GdprRequestStatus | ''>('OPEN');
  const [closing, setClosing] = useState<string | null>(null);
  const list = useQuery({
    queryKey: ['admin', 'gdpr', status],
    queryFn: () => adminListGdprRequests({ limit: PAGE, ...(status ? { status } : {}) }),
  });
  let content;
  if (list.isPending) content = <Skeleton className="h-64" />;
  else if (list.isError) content = <ErrorState onRetry={() => void list.refetch()} />;
  else if (list.data.items.length === 0)
    content = <EmptyState headingLevel={2} title={t('admin.gdpr.empty')} />;
  else
    content = (
      <ul className="flex flex-col gap-2">
        {list.data.items.map((item) => (
          <li key={item.id} className="flex flex-col gap-2 rounded-md border border-border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold">
                {t(`admin.gdpr.types.${item.type}`)} · {t(`admin.gdpr.status.${item.status}`)}
                {item.overdue ? (
                  <span className="ml-2 text-danger">{t('admin.gdpr.overdue')}</span>
                ) : null}
              </span>
              <span className="text-sm text-muted">
                {t('admin.gdpr.due', { date: formatInstant(new Date(item.dueAt)) })}
              </span>
            </div>
            <span className="text-sm text-muted">
              {t('admin.gdpr.from', { name: item.displayName })}
            </span>
            <p className="break-words whitespace-pre-line">{item.details}</p>
            {item.note ? <p className="text-sm break-words text-muted">{item.note}</p> : null}
            {item.status === 'OPEN' ? (
              <Button
                size="sm"
                variant="secondary"
                className="self-start"
                onClick={() => setClosing(item.id)}
              >
                {t('admin.gdpr.close')}
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
    );
  return (
    <section className="flex flex-col gap-4">
      <Seo title={`${t('admin.gdpr.title')} — ${t('admin.title')}`} />
      <h1 className="text-h1">{t('admin.gdpr.title')}</h1>
      <p className="text-muted">{t('admin.gdpr.intro')}</p>
      <label className="flex items-center gap-2 self-start">
        <span className="font-semibold">{t('admin.gdpr.filter')}</span>
        <select
          className="min-h-11 rounded-md border border-border bg-surface px-3"
          value={status}
          onChange={(e) => setStatus(e.target.value as GdprRequestStatus | '')}
        >
          <option value="">{t('admin.gdpr.all')}</option>
          {GDPR_REQUEST_STATUS.map((option) => (
            <option key={option} value={option}>
              {t(`admin.gdpr.status.${option}`)}
            </option>
          ))}
        </select>
      </label>
      {content}
      <Dialog open={closing !== null} onOpenChange={(open) => !open && setClosing(null)}>
        <DialogContent title={t('admin.gdpr.close')} closeLabel={t('common.close')}>
          {closing ? (
            <CloseForm
              id={closing}
              onClosed={() => {
                setClosing(null);
                void queryClient.invalidateQueries({ queryKey: ['admin', 'gdpr'] });
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}
