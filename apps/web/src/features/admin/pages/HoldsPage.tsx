import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Inbox } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { Seo } from '@/components/Seo';
import { Skeleton } from '@/components/Skeleton';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { toUserMessage } from '@/lib/app-error';
import { adminListHolds, adminResolveHold } from '@/lib/callables';
import { StatementFields } from '../components/StatementFields';
import { relativeAge } from '../lib/format';
import { EMPTY_STATEMENT, statementReady } from '../lib/statement';

interface Hold {
  uid: string;
  scope: 'HOME' | 'USER';
  displayName: string;
}

/** UX §9 / FR-69 — preventive holds with time left: release or confirm (with statement). */
export function HoldsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const holds = useQuery({ queryKey: ['admin', 'holds'], queryFn: () => adminListHolds({}) });
  const [confirming, setConfirming] = useState<Hold | null>(null);
  const [statement, setStatement] = useState(EMPTY_STATEMENT);
  const resolve = useMutation({
    mutationFn: (input: Hold & { decision: 'RELEASE' | 'CONFIRM' }) =>
      adminResolveHold({
        uid: input.uid,
        scope: input.scope,
        decision: input.decision,
        ...(input.decision === 'CONFIRM' ? { statement } : {}),
      }),
    onSuccess: async () => {
      toast.success(t('admin.holds.done'));
      setConfirming(null);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'holds'] });
    },
    onError: (error) => toast.error(toUserMessage(t, error)),
  });

  let content;
  if (holds.isPending) content = <Skeleton className="h-64" />;
  else if (holds.isError) content = <ErrorState onRetry={() => void holds.refetch()} />;
  else if (holds.data.items.length === 0)
    content = <EmptyState icon={<Inbox />} title={t('admin.holds.empty')} />;
  else
    content = (
      <ul className="flex flex-col gap-2">
        {holds.data.items.map((hold) => (
          <li
            key={`${hold.scope}-${hold.uid}`}
            className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3"
          >
            <span>
              <span className="font-semibold">{hold.displayName}</span> ·{' '}
              {t(`admin.holds.scopes.${hold.scope}`)} · {t(`home.hold.${hold.reason as 'REPORT'}`)}
              {hold.dueAt ? ` · ${t('admin.reports.due')} ${relativeAge(hold.dueAt)}` : ''}
            </span>
            <span className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => resolve.mutate({ ...hold, decision: 'RELEASE' })}
              >
                {t('admin.holds.release')}
              </Button>
              <Button size="sm" variant="danger" onClick={() => setConfirming(hold)}>
                {t('admin.holds.confirm')}
              </Button>
            </span>
          </li>
        ))}
      </ul>
    );

  return (
    <section className="flex flex-col gap-6">
      <Seo title={`${t('admin.holds.title')} — ${t('admin.title')}`} />
      <h1 className="text-h1">{t('admin.holds.title')}</h1>
      {content}
      <Dialog open={confirming !== null} onOpenChange={(open) => !open && setConfirming(null)}>
        <DialogContent
          title={t('admin.holds.confirmTitle')}
          description={t(`admin.holds.confirmBody.${confirming?.scope ?? 'HOME'}`)}
          closeLabel={t('common.close')}
        >
          <StatementFields value={statement} onChange={setStatement} idPrefix="hold" />
          <Button
            variant="danger"
            disabled={!statementReady(statement) || resolve.isPending}
            onClick={() => confirming && resolve.mutate({ ...confirming, decision: 'CONFIRM' })}
          >
            {t('admin.holds.confirm')}
          </Button>
        </DialogContent>
      </Dialog>
    </section>
  );
}
