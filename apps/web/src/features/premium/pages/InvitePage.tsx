import { useQuery } from '@tanstack/react-query';
import { Copy, Gift, MessageCircle, Share2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useMe } from '@/app/auth/auth-context';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { Seo } from '@/components/Seo';
import { Skeleton } from '@/components/Skeleton';
import { Button } from '@/components/ui/button';
import { useCities } from '@/features/cities';
import { track } from '@/lib/analytics';
import { getReferralSummary } from '@/lib/callables';

/** S-13 — `/app/invita`: code, link, share (native, WhatsApp, copy) and invited people (FR-39). */
export function InvitePage() {
  const { t } = useTranslation();
  const me = useMe();
  const cities = useCities();
  const summary = useQuery({ queryKey: ['referrals'], queryFn: () => getReferralSummary({}) });
  const otherCity =
    (cities.data ?? []).find((c) => c.status === 'OPEN' && c.id !== me.city?.id)?.name ?? '';

  let content;
  if (summary.isPending) content = <Skeleton className="h-64" />;
  else if (summary.isError) content = <ErrorState onRetry={() => void summary.refetch()} />;
  else {
    const { code, link, invited, rewardsThisYear, maxRewards, rewardDays } = summary.data;
    const message = t('invite.message', { link });
    const share = async () => {
      track('invite_shared');
      try {
        if (typeof navigator.share === 'function')
          await navigator.share({ title: 'TinHome', text: message, url: link });
        else {
          await navigator.clipboard.writeText(link);
          toast.success(t('invite.copied'));
        }
      } catch {
        // Share sheet closed.
      }
    };
    content = (
      <>
        <div className="flex flex-col gap-3 rounded-xl bg-brand-gradient p-5 text-on-media">
          <p className="text-h2">
            {otherCity ? t('invite.highlight', { city: otherCity }) : t('invite.highlightAny')}
          </p>
          <p>{t('invite.reward', { days: rewardDays })}</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => void share()}>
              <Share2 aria-hidden="true" />
              {t('invite.share')}
            </Button>
            <Button asChild variant="secondary">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(message)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle aria-hidden="true" />
                {t('chat.whatsapp')}
              </a>
            </Button>
          </div>
        </div>
        <div className="flex flex-col gap-2 rounded-lg border border-border p-4">
          <p className="text-sm text-muted">{t('invite.yourCode')}</p>
          <p className="font-mono text-h2 tracking-widest">{code}</p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded bg-surface-muted px-2 py-1 text-sm">
              {link}
            </code>
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                void navigator.clipboard.writeText(link).then(
                  () => toast.success(t('invite.copied')),
                  () => toast.error(t('invite.copyFailed')),
                )
              }
            >
              <Copy aria-hidden="true" />
              {t('invite.copy')}
            </Button>
          </div>
        </div>
        <p className="font-semibold">
          {t('invite.rewards', { count: rewardsThisYear, max: maxRewards })}
        </p>
        <section aria-labelledby="invited" className="flex flex-col gap-2">
          <h2 id="invited" className="text-h3">
            {t('invite.invited')}
          </h2>
          {invited.length === 0 ? (
            <EmptyState icon={<Gift />} title={t('invite.empty')} />
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {invited.map((person, i) => (
                <li
                  key={`${person.displayName}-${String(i)}`}
                  className="flex items-center justify-between gap-3 py-2"
                >
                  <span>{person.displayName || t('invite.someone')}</span>
                  <span className="text-sm text-muted">{t(`invite.status.${person.status}`)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </>
    );
  }
  return (
    <section className="flex max-w-2xl flex-col gap-5 py-4">
      <Seo title={`${t('invite.title')} — TinHome`} />
      <h1 className="text-h1">{t('invite.title')}</h1>
      {content}
    </section>
  );
}
