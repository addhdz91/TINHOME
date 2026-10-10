import { useMutation, useQuery } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { Seo } from '@/components/Seo';
import { Skeleton } from '@/components/Skeleton';
import { Button } from '@/components/ui/button';
import { toUserMessage } from '@/lib/app-error';
import { listBlocked, unblockUser } from '@/lib/callables';

/** S-15 «Bloqueados» — only the person who blocked can unblock (BR-10). */
export function BlockedPage() {
  const { t } = useTranslation();
  const list = useQuery({ queryKey: ['blocked'], queryFn: () => listBlocked({}) });
  const unblock = useMutation({
    mutationFn: (uid: string) => unblockUser({ targetUid: uid }),
    onSuccess: async () => {
      toast.success(t('blocked.unblocked'));
      await list.refetch();
    },
    onError: (error) => toast.error(toUserMessage(t, error)),
  });
  return (
    <section className="flex max-w-2xl flex-col gap-4 py-4">
      <Seo title={`${t('blocked.title')} — TinHome`} />
      <h1 className="text-h1">{t('blocked.title')}</h1>
      <p className="text-muted">{t('blocked.body')}</p>
      {list.isPending ? (
        <Skeleton className="h-32" />
      ) : list.isError ? (
        <ErrorState onRetry={() => void list.refetch()} />
      ) : list.data.items.length === 0 ? (
        <EmptyState icon={<ShieldCheck />} title={t('blocked.empty')} />
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {list.data.items.map((item) => (
            <li key={item.uid} className="flex items-center justify-between gap-3 py-3">
              <span>
                <span className="block font-semibold">{item.displayName}</span>
                <span className="text-sm text-muted">
                  {t('blocked.since', {
                    date: new Date(item.blockedAt).toLocaleDateString('es-ES'),
                  })}
                </span>
              </span>
              <Button
                variant="secondary"
                disabled={unblock.isPending}
                onClick={() => unblock.mutate(item.uid)}
              >
                {t('blocked.unblock')}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
