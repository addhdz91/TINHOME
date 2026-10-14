import { useMutation } from '@tanstack/react-query';
import { Star } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import { toast } from 'sonner';
import { REVIEW_SUBSCORES, type ReviewSubscore } from '@tinhome/shared/constants';
import { toIsoDate, validateListingText } from '@tinhome/shared/domain';
import { useMe } from '@/app/auth/auth-context';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { Seo } from '@/components/Seo';
import { Skeleton } from '@/components/Skeleton';
import { Button } from '@/components/ui/button';
import { useMatch } from '@/features/chat';
import { toUserMessage } from '@/lib/app-error';
import { submitReview } from '@/lib/callables';
import { formatIsoDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useExchange, useMyReview } from '../api/use-exchanges';

const COMMENT_MAX = 1000;
const SCORES = [1, 2, 3, 4, 5] as const;

/** 1–5 stars as a radio group (keyboard: arrows; screen readers: «4 estrellas»). */
function StarRating({
  label,
  value,
  onChange,
  large = false,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  large?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <fieldset className="flex flex-col gap-1">
      <legend className={cn('font-semibold', large && 'text-h3')}>{label}</legend>
      <div className="flex gap-1">
        {SCORES.map((score) => (
          <label key={score} className="cursor-pointer">
            <input
              type="radio"
              className="peer sr-only"
              name={label}
              value={score}
              checked={value === score}
              onChange={() => onChange(score)}
            />
            <span className="flex size-11 items-center justify-center rounded-md peer-focus-visible:outline-2 peer-focus-visible:outline-focus">
              <Star
                aria-hidden="true"
                className={cn(
                  large ? 'size-9' : 'size-7',
                  score <= value ? 'fill-current text-premium' : 'text-muted',
                )}
              />
            </span>
            <span className="sr-only">{t('rate.stars', { count: score })}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** S-10 — `/app/valorar/:id`: overall → sub-scores → comment → send (double blind, BR-16). */
export function ReviewPage() {
  const { t } = useTranslation();
  const { exchangeId = '' } = useParams();
  const me = useMe();
  const exchange = useExchange(exchangeId);
  const data = exchange.status === 'ready' ? exchange.data : null;
  const match = useMatch(data?.matchId ?? exchangeId);
  const reviewed = useMyReview(exchangeId, me.uid);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [overall, setOverall] = useState(0);
  const [sub, setSub] = useState<Record<ReviewSubscore, number>>({
    cleanliness: 0,
    accuracy: 0,
    communication: 0,
    care: 0,
  });
  const [comment, setComment] = useState('');
  const [done, setDone] = useState<'PENDING' | 'PUBLISHED' | null>(null);

  const send = useMutation({
    mutationFn: () => submitReview({ exchangeId, overall, sub, comment }),
    onSuccess: (result) => setDone(result.review.status),
    onError: (error) => toast.error(toUserMessage(t, error)),
  });

  if (exchange.status === 'loading' || reviewed.status === 'loading')
    return <Skeleton className="mt-4 h-96" />;
  if (exchange.status === 'error') return <ErrorState />;
  const otherUid = data?.participants.find((p) => p !== me.uid) ?? '';
  const otherName =
    (match.status === 'ready' ? match.data?.people[otherUid]?.displayName : undefined) ??
    t('exchange.page.otherFallback');
  const today = toIsoDate(new Date());
  const backAction = (
    <Button asChild variant="secondary">
      <Link to={data ? `/app/intercambios/${data.id}` : '/app/intercambios'}>
        {t('rate.backToExchange')}
      </Link>
    </Button>
  );

  if (done) {
    return (
      <EmptyState
        headingLevel={1}
        icon={<Star />}
        title={t('rate.thanks')}
        body={
          done === 'PUBLISHED'
            ? t('rate.sentPublished')
            : t('rate.sentPending', { name: otherName })
        }
        action={backAction}
      />
    );
  }
  let blocked: string | null = null;
  if (!data) blocked = t('exchange.page.notFound');
  else if (data.status !== 'COMPLETED') blocked = t('rate.notCompleted');
  else if (reviewed.status === 'ready' && reviewed.data) blocked = t('rate.alreadyDone');
  else if (!data.reviewDeadlineDate || today > data.reviewDeadlineDate) blocked = t('rate.closed');
  if (blocked)
    return <EmptyState headingLevel={1} icon={<Star />} title={blocked} action={backAction} />;

  const subsComplete = REVIEW_SUBSCORES.every((key) => sub[key] > 0);
  const commentCheck = comment.trim() ? validateListingText(comment) : null;
  const commentError = commentCheck && !commentCheck.ok ? t('home.validation.text') : null;

  return (
    <section className="mx-auto flex max-w-xl flex-col gap-5 py-4">
      <Seo title={`${t('rate.title', { name: otherName })} — TinHome`} />
      <h1 className="text-h1">{t('rate.title', { name: otherName })}</h1>
      <p className="text-muted">
        {t('rate.blind', { name: otherName, date: formatIsoDate(data?.reviewDeadlineDate ?? '') })}
      </p>
      <p className="text-sm font-semibold text-muted" aria-live="polite">
        {t('rate.step', { step, total: 3 })}
      </p>

      {step === 1 ? (
        <>
          <StarRating label={t('rate.overall')} value={overall} onChange={setOverall} large />
          <Button size="lg" disabled={overall === 0} onClick={() => setStep(2)}>
            {t('rate.next')}
          </Button>
        </>
      ) : null}

      {step === 2 ? (
        <>
          {REVIEW_SUBSCORES.map((key) => (
            <StarRating
              key={key}
              label={t(`rate.sub.${key}`)}
              value={sub[key]}
              onChange={(value) => setSub((current) => ({ ...current, [key]: value }))}
            />
          ))}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setStep(1)}>
              {t('rate.back')}
            </Button>
            <Button
              size="lg"
              className="flex-1"
              disabled={!subsComplete}
              onClick={() => setStep(3)}
            >
              {t('rate.next')}
            </Button>
          </div>
        </>
      ) : null}

      {step === 3 ? (
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!commentError) send.mutate();
          }}
        >
          <div className="flex flex-col gap-1.5">
            <label htmlFor="rate-comment" className="font-semibold">
              {t('rate.comment')}
            </label>
            <span className="text-sm text-muted" id="rate-comment-hint">
              {t('rate.commentHint')}
            </span>
            <textarea
              id="rate-comment"
              className="min-h-32 rounded-md border border-border bg-surface p-3"
              maxLength={COMMENT_MAX}
              value={comment}
              aria-describedby="rate-comment-hint"
              aria-invalid={commentError ? true : undefined}
              onChange={(event) => setComment(event.target.value)}
            />
            <span
              className={cn('text-right text-xs', commentError ? 'text-danger' : 'text-muted')}
              role={commentError ? 'alert' : undefined}
            >
              {commentError ?? t('chat.counter', { count: comment.length, max: COMMENT_MAX })}
            </span>
          </div>
          <p className="text-sm text-muted">{t('rate.final')}</p>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => setStep(2)}>
              {t('rate.back')}
            </Button>
            <Button
              type="submit"
              size="lg"
              className="flex-1"
              disabled={send.isPending || Boolean(commentError)}
            >
              {t('rate.submit')}
            </Button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
