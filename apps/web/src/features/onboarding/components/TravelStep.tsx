import { useQuery } from '@tanstack/react-query';
import { doc, getDoc } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useAuth, useMe } from '@/app/auth/auth-context';
import { ErrorState } from '@/components/ErrorState';
import { Skeleton } from '@/components/Skeleton';
import { TravelPrefsEditor, useMyHome } from '@/features/home';
import { firebase } from '@/lib/firebase';

/** FR-19 — preferences given in the waitlist with the same e-mail (`users.waitlistPrefill`). */
function useWaitlistPrefill(uid: string) {
  return useQuery({
    queryKey: ['waitlistPrefill', uid],
    queryFn: async () => {
      const snap = await getDoc(doc(firebase().db, 'users', uid));
      const prefill = snap.get('waitlistPrefill') as
        { destinations?: string[]; windowIds?: string[] } | undefined;
      return prefill
        ? { destinations: prefill.destinations ?? [], windowIds: prefill.windowIds ?? [] }
        : null;
    },
  });
}

/** S-03 step 4 — where and when to travel; travellers and pet. */
export function TravelStep() {
  const { t } = useTranslation();
  const me = useMe();
  const navigate = useNavigate();
  const { refreshMe } = useAuth();
  const home = useMyHome();
  const prefill = useWaitlistPrefill(me.uid);

  if (home.isPending || prefill.isPending) return <Skeleton className="h-96" />;
  if (home.isError || !home.data) return <ErrorState onRetry={() => void home.refetch()} />;
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-h1">{t('trip.title')}</h1>
      <TravelPrefsEditor
        home={home.data}
        prefill={prefill.data ?? undefined}
        onDone={() => void refreshMe().then(() => navigate('/app/onboarding/5'))}
      />
    </div>
  );
}
