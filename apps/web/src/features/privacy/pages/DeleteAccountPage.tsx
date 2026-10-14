import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { useAuth } from '@/app/auth/auth-context';
import { Seo } from '@/components/Seo';
import { TextField } from '@/components/TextField';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ReauthForm } from '@/features/auth';
import { usePublicConfig } from '@/hooks/use-public-config';
import { requestAccountDeletion } from '@/lib/callables';
import { formatInstant } from '@/lib/format';

/** UX §5 — account deletion: consequences, typed confirmation and re-authentication (BR-29). */
export function DeleteAccountPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const config = usePublicConfig();
  const [word, setWord] = useState('');
  const [reauth, setReauth] = useState(false);
  const confirmWord = t('deletion.confirmWord');
  const consequences = t('deletion.consequences', {
    returnObjects: true,
    days: config.data?.accountPurgeDays ?? 30,
  });
  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-5 py-4">
      <Seo title={`${t('deletion.title')} — TinHome`} />
      <h1 className="text-h1">{t('deletion.title')}</h1>
      <p className="font-semibold">{t('deletion.intro')}</p>
      <ul className="flex list-disc flex-col gap-2 pl-5">
        {consequences.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p className="rounded-md bg-surface-muted p-3">
        {t('deletion.before')}{' '}
        <Link to="/app/privacidad" className="font-semibold text-link underline">
          {t('privacy.title')}
        </Link>
      </p>
      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (word.trim() === confirmWord) setReauth(true);
        }}
      >
        <TextField
          label={t('deletion.confirmLabel')}
          value={word}
          autoComplete="off"
          onChange={(e) => setWord(e.target.value)}
        />
        <Button
          type="submit"
          variant="danger"
          className="self-start"
          disabled={word.trim() !== confirmWord}
        >
          {t('deletion.continue')}
        </Button>
      </form>
      <p className="text-xs text-muted">{t('deletion.provisional')}</p>
      <Dialog open={reauth} onOpenChange={setReauth}>
        <DialogContent
          title={t('deletion.reauthTitle')}
          description={t('deletion.reauthBody')}
          closeLabel={t('common.close')}
        >
          <ReauthForm
            danger
            confirmLabel={t('deletion.confirm')}
            action={async () => {
              const { purgeAt } = await requestAccountDeletion({ confirm: 'ELIMINAR' });
              toast.success(t('deletion.done', { date: formatInstant(new Date(purgeAt)) }), {
                duration: 10_000,
              });
              await signOut();
              void navigate('/', { replace: true });
            }}
          />
        </DialogContent>
      </Dialog>
    </section>
  );
}
