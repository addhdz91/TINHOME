import { useMutation } from '@tanstack/react-query';
import { CalendarDays, FileDown, MessageCircle, Square, Star } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import { toast } from 'sonner';
import { canCancelExchange, daysBetween, exchangePhase, toIsoDate } from '@tinhome/shared/domain';
import { useMe } from '@/app/auth/auth-context';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { Seo } from '@/components/Seo';
import { Skeleton } from '@/components/Skeleton';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useAgreementDownload, useMatch } from '@/features/chat';
import { SponsoredCard, useSponsored } from '@/features/sponsored';
import { toUserMessage } from '@/lib/app-error';
import { cancelExchange, respondExchange } from '@/lib/callables';
import { formatInstant, formatIsoDate } from '@/lib/format';
import { useExchange, useMyReview } from '../api/use-exchanges';
import { ExchangeTimeline } from '../components/ExchangeTimeline';
import type { ExchangeDoc } from '../lib/types';

const CANCEL_REASON_MAX = 300;
const CHECKLIST = ['keys', 'photos', 'inventory', 'meters', 'contacts'] as const;

function ReviewAction({ exchange, uid }: { exchange: ExchangeDoc; uid: string }) {
  const { t } = useTranslation();
  const reviewed = useMyReview(exchange.id, uid);
  const today = toIsoDate(new Date());
  const open = exchange.reviewDeadlineDate !== null && today <= exchange.reviewDeadlineDate;
  if (reviewed.status !== 'ready') return null;
  if (reviewed.data) return <p className="text-sm text-muted">{t('exchange.page.reviewed')}</p>;
  if (!open) return <p className="text-sm text-muted">{t('rate.closed')}</p>;
  return (
    <div className="flex flex-col gap-2">
      <Button asChild size="lg">
        <Link to={`/app/valorar/${exchange.id}`}>
          <Star aria-hidden="true" />
          {t('exchange.page.review')}
        </Link>
      </Button>
      <p className="text-sm text-muted">
        {t('exchange.page.reviewUntil', { date: formatIsoDate(exchange.reviewDeadlineDate ?? '') })}
      </p>
    </div>
  );
}

/** S-09 — `/app/intercambios/:id`: status timeline, countdown, kit, checklist and actions. */
export function ExchangePage() {
  const { t } = useTranslation();
  const { exchangeId = '' } = useParams();
  const me = useMe();
  const exchange = useExchange(exchangeId);
  const data = exchange.status === 'ready' ? exchange.data : null;
  const match = useMatch(data?.matchId ?? exchangeId);
  const matchData = match.status === 'ready' ? match.data : null;
  const sponsored = useSponsored('EXCHANGE', data !== null);
  const otherUid = data?.participants.find((p) => p !== me.uid) ?? '';
  const otherName = matchData?.people[otherUid]?.displayName ?? t('exchange.page.otherFallback');
  const dates = data
    ? t('exchange.page.datesRange', {
        start: formatIsoDate(data.startDate),
        end: formatIsoDate(data.endDate),
      })
    : '';
  const agreement = useAgreementDownload(matchData, dates);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState('');

  const respond = useMutation({
    mutationFn: (accept: boolean) => respondExchange({ exchangeId, accept }),
    onSuccess: (_, accept) =>
      toast.success(accept ? t('exchange.page.confirmedToast') : t('exchange.page.declinedToast')),
    onError: (error) => toast.error(toUserMessage(t, error)),
  });
  const cancel = useMutation({
    mutationFn: () => cancelExchange({ exchangeId, reason }),
    onSuccess: () => {
      setCancelOpen(false);
      toast.success(t('exchange.page.cancelledToast'));
    },
    onError: (error) => toast.error(toUserMessage(t, error)),
  });

  if (exchange.status === 'loading') return <Skeleton className="mt-4 h-96" />;
  if (exchange.status === 'error') return <ErrorState />;
  if (!data) {
    return (
      <EmptyState
        headingLevel={1}
        icon={<CalendarDays />}
        title={t('exchange.page.notFound')}
        action={
          <Button asChild variant="secondary">
            <Link to="/app/intercambios">{t('exchange.list.title')}</Link>
          </Button>
        }
      />
    );
  }

  const today = toIsoDate(new Date());
  const phase = exchangePhase(data.status, data, today);
  const daysLeft = daysBetween(today, data.startDate);
  const mine = data.proposedBy === me.uid;
  const canCancel = canCancelExchange(data, me.uid, today);
  const people = (uid: string) => ({
    guests: data.guests[uid] ?? 0,
    pets: data.pets[uid] ?? 0,
  });

  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-5 py-4">
      <Seo title={`${t('exchange.page.title', { name: otherName })} — TinHome`} />
      <header className="flex flex-col gap-2">
        <h1 className="text-h1">{t('exchange.page.title', { name: otherName })}</h1>
        <p className="font-semibold">{dates}</p>
        <p className="text-sm text-muted">
          {t('exchange.nights', { count: data.nights })} ·{' '}
          <span className="font-semibold">{t(`exchange.status.${data.status}`)}</span>
        </p>
      </header>

      {phase ? (
        <ExchangeTimeline phase={phase} />
      ) : (
        <p role="status" className="rounded-md bg-surface-muted p-3">
          {t(`exchange.page.ended.${data.status}`)}
        </p>
      )}

      {data.status === 'CONFIRMED' ? (
        <p className="rounded-md bg-brand-soft p-4 text-h3 text-brand-text" aria-live="polite">
          {daysLeft > 0
            ? t('exchange.page.countdown', { count: daysLeft })
            : t('exchange.page.inProgress')}
        </p>
      ) : null}

      {data.status === 'PROPOSED' ? (
        mine ? (
          <p className="rounded-md border border-border p-4">
            {t('exchange.page.waiting', {
              name: otherName,
              date: data.expiresAt ? formatInstant(data.expiresAt) : '',
            })}
          </p>
        ) : (
          <div className="flex flex-col gap-3 rounded-md border border-primary p-4">
            <p className="font-semibold">{t('exchange.page.askConfirm', { name: otherName })}</p>
            <div className="flex flex-wrap gap-2">
              <Button disabled={respond.isPending} onClick={() => respond.mutate(true)}>
                {t('exchange.page.confirm')}
              </Button>
              <Button
                variant="secondary"
                disabled={respond.isPending}
                onClick={() => respond.mutate(false)}
              >
                {t('exchange.page.decline')}
              </Button>
            </div>
          </div>
        )
      ) : null}

      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 rounded-lg border border-border bg-surface p-4">
        <dt className="text-muted">{t('exchange.page.youTake', { name: otherName })}</dt>
        <dd>{t('exchange.page.people', people(me.uid))}</dd>
        <dt className="text-muted">{t('exchange.page.theyTake', { name: otherName })}</dt>
        <dd>{t('exchange.page.people', people(otherUid))}</dd>
        {data.note ? (
          <>
            <dt className="text-muted">{t('exchange.page.note')}</dt>
            <dd className="break-words">{data.note}</dd>
          </>
        ) : null}
      </dl>

      {data.status === 'COMPLETED' ? <ReviewAction exchange={data} uid={me.uid} /> : null}

      {data.status === 'CONFIRMED' || data.status === 'PROPOSED' ? (
        <section aria-labelledby="exchange-kit" className="flex flex-col gap-3">
          <h2 id="exchange-kit" className="text-h3">
            {t('exchange.page.kit')}
          </h2>
          <Button
            variant="secondary"
            className="self-start"
            disabled={!agreement.ready}
            onClick={() => void agreement.download()}
          >
            <FileDown aria-hidden="true" />
            {t('chat.agreement')}
          </Button>
          <ul className="flex flex-col gap-1 text-sm">
            {CHECKLIST.map((item) => (
              <li key={item} className="flex gap-2">
                <Square aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                {t(`agreement.checklist.${item}`)}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="ghost">
          <Link to={`/app/chats/${data.matchId}`}>
            <MessageCircle aria-hidden="true" />
            {t('exchange.page.backToChat')}
          </Link>
        </Button>
        {canCancel ? (
          <Button variant="ghost" className="text-danger" onClick={() => setCancelOpen(true)}>
            {mine && data.status === 'PROPOSED'
              ? t('exchange.page.withdraw')
              : t('exchange.page.cancel')}
          </Button>
        ) : null}
      </div>
      <p className="text-xs text-muted">{t('exchange.propose.disclaimer')}</p>
      {sponsored.data ? <SponsoredCard card={sponsored.data} /> : null}

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent
          title={t('exchange.page.cancelTitle')}
          description={t('exchange.page.cancelBody', { name: otherName })}
          closeLabel={t('common.close')}
        >
          <label className="flex flex-col gap-1.5">
            <span className="font-semibold">{t('exchange.page.cancelReason')}</span>
            <textarea
              className="min-h-20 rounded-md border border-border bg-surface p-3"
              maxLength={CANCEL_REASON_MAX}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </label>
          <Button variant="danger" disabled={cancel.isPending} onClick={() => cancel.mutate()}>
            {t('exchange.page.cancelConfirm')}
          </Button>
        </DialogContent>
      </Dialog>
    </section>
  );
}
