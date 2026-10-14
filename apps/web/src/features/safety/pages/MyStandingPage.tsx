import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { ModerationActionView } from '@tinhome/shared/schemas';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { Seo } from '@/components/Seo';
import { Skeleton } from '@/components/Skeleton';
import { Button } from '@/components/ui/button';
import { toUserMessage } from '@/lib/app-error';
import { submitAppeal } from '@/lib/callables';
import { formatInstant } from '@/lib/format';
import { standingKey, useStanding } from '../api/use-standing';

const APPEAL_MIN = 20;

function ActionCard({ action }: { action: ModerationActionView }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const appeal = useMutation({
    mutationFn: () => submitAppeal({ actionId: action.id, text: text.trim() }),
    onSuccess: async () => {
      toast.success(t('standing.appealSent'));
      setOpen(false);
      await queryClient.invalidateQueries({ queryKey: standingKey });
    },
    onError: (error) => toast.error(toUserMessage(t, error)),
  });
  const headingId = `action-${action.id}`;
  return (
    <article
      aria-labelledby={headingId}
      className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4"
    >
      <h3 id={headingId} className="font-semibold">
        {t(`standing.actions.${action.action}`)} · {formatInstant(new Date(action.createdAt))}
      </h3>
      {action.statement ? (
        <dl className="grid gap-1 text-sm">
          <dt className="font-semibold">{t('standing.facts')}</dt>
          <dd>{action.statement.facts}</dd>
          <dt className="font-semibold">{t('standing.ground')}</dt>
          <dd>{action.statement.groundDetail}</dd>
          <dt className="font-semibold">{t('standing.scope')}</dt>
          <dd>{action.statement.scope}</dd>
          <dt className="font-semibold">{t('standing.duration')}</dt>
          <dd>{action.statement.duration}</dd>
          <dt className="font-semibold">{t('standing.redress')}</dt>
          <dd>{action.statement.redress}</dd>
        </dl>
      ) : null}
      {action.appeal ? (
        <p className="text-sm">
          {t(`standing.appealStatus.${action.appeal.status}`)}
          {action.appeal.decisionText ? ` — ${action.appeal.decisionText}` : ''}
        </p>
      ) : null}
      {action.appealable && !open ? (
        <Button variant="secondary" className="self-start" onClick={() => setOpen(true)}>
          {t('standing.appeal')}
        </Button>
      ) : null}
      {open ? (
        <form
          className="flex flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (text.trim().length >= APPEAL_MIN) appeal.mutate();
          }}
        >
          <label htmlFor={`appeal-${action.id}`} className="font-semibold">
            {t('standing.appealLabel')}
          </label>
          <textarea
            id={`appeal-${action.id}`}
            className="min-h-24 rounded-md border border-border bg-surface p-3"
            maxLength={2000}
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
          <p className="text-sm text-muted">{t('standing.appealHint', { min: APPEAL_MIN })}</p>
          <div className="flex gap-2">
            <Button type="submit" disabled={appeal.isPending || text.trim().length < APPEAL_MIN}>
              {t('standing.appealSend')}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </Button>
          </div>
        </form>
      ) : null}
    </article>
  );
}

/** S-20 / FR-68 — `/app/mi-cuenta`: active strikes, decisions with reasons and appeals. */
export function MyStandingPage() {
  const { t } = useTranslation();
  const standing = useStanding();
  let content;
  if (standing.isPending) content = <Skeleton className="h-64" />;
  else if (standing.isError) content = <ErrorState onRetry={() => void standing.refetch()} />;
  else {
    const { strikes, actions, hold } = standing.data;
    content =
      strikes.length === 0 && actions.length === 0 && !hold ? (
        <EmptyState
          icon={<ShieldCheck />}
          title={t('standing.clean')}
          body={t('standing.cleanBody')}
        />
      ) : (
        <>
          {hold ? (
            <section
              aria-labelledby="standing-hold"
              className="rounded-lg border border-warning p-4"
            >
              <h2 id="standing-hold" className="text-h3">
                {t('standing.holdTitle')}
              </h2>
              <p>{t('standing.holdBody')}</p>
            </section>
          ) : null}
          <section aria-labelledby="standing-strikes" className="flex flex-col gap-2">
            <h2 id="standing-strikes" className="text-h3">
              {t('standing.strikes', { count: strikes.length })}
            </h2>
            <ul className="flex flex-col gap-1">
              {strikes.map((strike) => (
                <li key={strike.id} className="text-sm">
                  {t('standing.strikeItem', {
                    date: formatInstant(new Date(strike.createdAt)),
                    expires: formatInstant(new Date(strike.expiresAt)),
                  })}
                </li>
              ))}
            </ul>
          </section>
          <section aria-labelledby="standing-actions" className="flex flex-col gap-3">
            <h2 id="standing-actions" className="text-h3">
              {t('standing.decisions')}
            </h2>
            {actions.map((action) => (
              <ActionCard key={action.id} action={action} />
            ))}
          </section>
        </>
      );
  }
  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-5 py-4">
      <Seo title={`${t('standing.title')} — TinHome`} />
      <h1 className="text-h1">{t('standing.title')}</h1>
      {content}
    </section>
  );
}
