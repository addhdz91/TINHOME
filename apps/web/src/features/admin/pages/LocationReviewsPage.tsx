import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Inbox } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { ReviewDecision } from '@tinhome/shared/constants';
import type { LocationReviewSummary } from '@tinhome/shared/schemas';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { Seo } from '@/components/Seo';
import { Skeleton } from '@/components/Skeleton';
import { Button } from '@/components/ui/button';
import { toUserMessage } from '@/lib/app-error';
import { adminDecideLocationReview, adminListLocationReviews } from '@/lib/callables';
import { relativeAge } from '../lib/format';

function ReviewCard({ item }: { item: LocationReviewSummary }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [reason, setReason] = useState('');
  const decide = useMutation({
    mutationFn: (decision: ReviewDecision) =>
      adminDecideLocationReview({ homeId: item.homeId, decision, reason }),
    onSuccess: async () => {
      toast.success(t('admin.locations.decided'));
      await queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
  });
  const reasonId = `reason-${item.homeId}`;
  return (
    <li className="flex flex-col gap-3 rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-semibold">
          {item.displayName} · {item.cityId}
        </p>
        <p className="text-sm text-muted">{relativeAge(item.requestedAt)}</p>
      </div>
      <p>
        <span className="text-muted">{t('admin.locations.note')}: </span>
        {item.note}
      </p>
      <p className="text-sm text-muted">
        {item.lastCheck
          ? t('admin.locations.lastCheck', {
              result: t(`admin.locations.results.${item.lastCheck.result}`),
              km: item.lastCheck.distanceKm,
              accuracy: item.lastCheck.accuracyM,
            })
          : t('admin.locations.noCheck')}
      </p>
      <label htmlFor={reasonId} className="font-semibold">
        {t('admin.locations.reason')}
      </label>
      <textarea
        id={reasonId}
        rows={2}
        maxLength={1000}
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        className="rounded-md border border-border bg-surface p-3 text-text"
      />
      {decide.isError ? (
        <p role="alert" className="text-sm font-semibold text-danger">
          {toUserMessage(t, decide.error)}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={decide.isPending || reason.trim().length < 3}
          onClick={() => decide.mutate('APPROVE')}
        >
          {t('admin.locations.approve')}
        </Button>
        <Button
          variant="danger"
          disabled={decide.isPending || reason.trim().length < 3}
          onClick={() => decide.mutate('REJECT')}
        >
          {t('admin.locations.reject')}
        </Button>
      </div>
    </li>
  );
}

/** FR-63 — manual location reviews requested by owners. */
export function LocationReviewsPage() {
  const { t } = useTranslation();
  const list = useQuery({
    queryKey: ['admin', 'location-reviews'],
    queryFn: () => adminListLocationReviews({}),
  });
  return (
    <section className="flex flex-col gap-6">
      <Seo title={`${t('admin.locations.title')} — ${t('admin.title')}`} />
      <h1 className="text-h1">{t('admin.locations.title')}</h1>
      {list.isPending ? (
        <Skeleton className="h-64" />
      ) : list.isError ? (
        <ErrorState onRetry={() => void list.refetch()} />
      ) : list.data.items.length === 0 ? (
        <EmptyState icon={<Inbox />} title={t('admin.locations.empty')} />
      ) : (
        <ul className="flex flex-col gap-4">
          {list.data.items.map((item) => (
            <ReviewCard key={item.homeId} item={item} />
          ))}
        </ul>
      )}
    </section>
  );
}
