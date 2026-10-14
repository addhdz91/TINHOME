import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
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
  const { signOut } = useAuth();
  const config = usePublicConfig();
  const [word, setWord] = useState('');
  const [reauth, setReauth] = useState(false);
  const [purgeAt, setPurgeAt] = useState<string | null>(null);
  const confirmWord = t('deletion.confirmWord');
  const consequences = t('deletion.consequences', {
    returnObjects: true,
    days: config.data?.accountPurgeDays ?? 30,
  });
  if (purgeAt) {
    return (
      <section className="mx-auto flex max-w-2xl flex-col gap-5 py-4">
        <Seo title={`${t('deletion.title')} — TinHome`} />
        <h1 className="text-h1">{t('deletion.doneTitle')}</h1>
        <p role="status" className="rounded-md bg-brand-soft p-4 text-brand-text">
          {t('deletion.done', { date: formatInstant(new Date(purgeAt)) })}
        </p>
        <Button
          className="self-start"
          onClick={() => {
            // Full reload to the landing: the signed-in guard must not catch the sign-out.
            void signOut().then(() => window.location.assign('/'));
          }}
        >
          {t('deletion.leave')}
        </Button>
      </section>
    );
  }
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
              const result = await requestAccountDeletion({ confirm: 'ELIMINAR' });
              setReauth(false);
              setPurgeAt(result.purgeAt);
            }}
          />
        </DialogContent>
      </Dialog>
    </section>
  );
}
