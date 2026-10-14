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
import { toUserMessage } from '@/lib/app-error';
import { adminDecideAppeal, adminListAppeals } from '@/lib/callables';
import { formatInstant } from '@/lib/format';

function AppealCard({
  appeal,
}: {
  appeal: Awaited<ReturnType<typeof adminListAppeals>>['items'][number];
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const decide = useMutation({
    mutationFn: (decision: 'UPHOLD' | 'REJECT') =>
      adminDecideAppeal({ appealId: appeal.id, decision, text: text.trim() }),
    onSuccess: async (result) => {
      toast.success(t(result.sameAdmin ? 'admin.appeals.doneSameAdmin' : 'admin.appeals.done'));
      await queryClient.invalidateQueries({ queryKey: ['admin', 'appeals'] });
    },
    onError: (error) => toast.error(toUserMessage(t, error)),
  });
  const id = `appeal-${appeal.id}`;
  return (
    <article
      aria-labelledby={id}
      className="flex flex-col gap-2 rounded-lg border border-border p-4"
    >
      <h2 id={id} className="font-semibold">
        {t(`admin.moderation.actions.${appeal.action.action}`)} ·{' '}
        {formatInstant(new Date(appeal.action.createdAt))}
      </h2>
      {appeal.action.statement ? <p className="text-sm">{appeal.action.statement.facts}</p> : null}
      <blockquote className="border-l-4 border-primary pl-3">{appeal.text}</blockquote>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold">{t('admin.appeals.answer')}</span>
        <textarea
          className="min-h-20 rounded-md border border-border bg-surface p-3"
          value={text}
          maxLength={2000}
          onChange={(event) => setText(event.target.value)}
        />
      </label>
      <div className="flex gap-2">
        <Button
          disabled={text.trim().length < 10 || decide.isPending}
          onClick={() => decide.mutate('UPHOLD')}
        >
          {t('admin.appeals.uphold')}
        </Button>
        <Button
          variant="secondary"
          disabled={text.trim().length < 10 || decide.isPending}
          onClick={() => decide.mutate('REJECT')}
        >
          {t('admin.appeals.reject')}
        </Button>
      </div>
    </article>
  );
}

/** FR-45 — open appeals; ideally decided by an admin other than the one who decided. */
export function AppealsPage() {
  const { t } = useTranslation();
  const appeals = useQuery({ queryKey: ['admin', 'appeals'], queryFn: () => adminListAppeals({}) });
  let content;
  if (appeals.isPending) content = <Skeleton className="h-64" />;
  else if (appeals.isError) content = <ErrorState onRetry={() => void appeals.refetch()} />;
  else if (appeals.data.items.length === 0)
    content = <EmptyState icon={<Inbox />} title={t('admin.appeals.empty')} />;
  else content = appeals.data.items.map((appeal) => <AppealCard key={appeal.id} appeal={appeal} />);
  return (
    <section className="flex flex-col gap-4">
      <Seo title={`${t('admin.appeals.title')} — ${t('admin.title')}`} />
      <h1 className="text-h1">{t('admin.appeals.title')}</h1>
      {content}
    </section>
  );
}
