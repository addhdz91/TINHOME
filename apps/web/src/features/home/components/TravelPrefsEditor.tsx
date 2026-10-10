import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { HomeOwnerView, TravelPrefsInput } from '@tinhome/shared/schemas';
import { ErrorState } from '@/components/ErrorState';
import { Skeleton } from '@/components/Skeleton';
import { useActiveWindows, useCities } from '@/features/cities';
import { usePublicConfig } from '@/hooks/use-public-config';
import { toUserMessage } from '@/lib/app-error';
import { updateTravelPrefs } from '@/lib/callables';
import { useSetMyHome } from '../api/use-my-home';
import { TravelPrefsForm } from './TravelPrefsForm';

/** Loads cities, windows and limits, then shows the travel preferences form. */
export function TravelPrefsEditor({
  home,
  prefill,
  onDone,
}: {
  home: HomeOwnerView;
  prefill?: { destinations: string[]; windowIds: string[] } | undefined;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const cities = useCities();
  const windows = useActiveWindows();
  const config = usePublicConfig();
  const setHome = useSetMyHome();
  const save = useMutation({ mutationFn: (input: TravelPrefsInput) => updateTravelPrefs(input) });

  if (cities.isPending || windows.isPending || config.isPending)
    return <Skeleton className="h-96" />;
  if (cities.isError || windows.isError || config.isError)
    return <ErrorState onRetry={() => void Promise.all([cities.refetch(), windows.refetch()])} />;

  return (
    <>
      {save.isError ? (
        <p role="alert" className="rounded-md border border-danger p-3">
          {toUserMessage(t, save.error)}
        </p>
      ) : null}
      <TravelPrefsForm
        home={home}
        cities={cities.data}
        windows={windows.data}
        maxDestinations={config.data.maxDestinations}
        maxRanges={config.data.maxFlexibleRanges}
        prefill={prefill}
        submitLabel={t('trip.save')}
        onSubmit={async (input) => {
          const { home: saved } = await save.mutateAsync(input);
          setHome(saved);
          onDone();
        }}
      />
    </>
  );
}
