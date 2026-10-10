import { ErrorState } from '@/components/ErrorState';
import { Skeleton } from '@/components/Skeleton';
import { PublishReview, useMyHome } from '@/features/home';
import { usePublicConfig } from '@/hooks/use-public-config';

/** S-03 step 6 — review and publish. */
export function ReviewStep() {
  const home = useMyHome();
  const config = usePublicConfig();
  if (home.isPending || config.isPending) return <Skeleton className="h-96" />;
  if (home.isError || !home.data) return <ErrorState onRetry={() => void home.refetch()} />;
  return (
    <PublishReview
      home={home.data}
      photosMin={config.data?.photosMin ?? 5}
      onPublished={() => undefined}
    />
  );
}
