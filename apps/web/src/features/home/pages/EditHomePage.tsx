import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { ErrorState } from '@/components/ErrorState';
import { Seo } from '@/components/Seo';
import { Skeleton } from '@/components/Skeleton';
import { useMyHome } from '../api/use-my-home';
import { HomeEditor } from '../components/HomeEditor';

/** `/app/mi-casa/editar` — same editor as step 3 (FR-10, FR-65 applies on the server). */
export function EditHomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const home = useMyHome();
  return (
    <section className="flex flex-col gap-6 py-4">
      <Seo title={`${t('home.my.editTitle')} — TinHome`} />
      <h1 className="text-h1">{t('home.my.editTitle')}</h1>
      {home.isPending ? (
        <Skeleton className="h-96" />
      ) : home.isError ? (
        <ErrorState onRetry={() => void home.refetch()} />
      ) : (
        <HomeEditor
          home={home.data}
          onDone={() => {
            toast.success(t('home.saved'));
            void navigate('/app/mi-casa');
          }}
        />
      )}
    </section>
  );
}
