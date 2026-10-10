import type { TotpSecret, User } from 'firebase/auth';
import { ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { QrCode } from '@/components/QrCode';
import { TextField } from '@/components/TextField';
import { Button } from '@/components/ui/button';
import { finishTotpEnrollment, hasEnrolledFactor, startTotpEnrollment } from '@/features/auth';

/**
 * FR-48 / 03 §12 — guided TOTP enrolment on the first visit to /admin. A session that did not
 * use the second factor (enrolled earlier) must sign in again to get it in the token.
 */
export function MfaSetup({ user, onSignOut }: { user: User; onSignOut: () => void }) {
  const { t } = useTranslation();
  const [secret, setSecret] = useState<TotpSecret | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  if (done || hasEnrolledFactor(user)) {
    return (
      <div className="flex flex-col items-start gap-4">
        <h1 className="text-h1">{t('mfa.title')}</h1>
        <p>{done ? t('mfa.enrolled') : t('mfa.reauth')}</p>
        <Button onClick={onSignOut}>{t('mfa.signInAgain')}</Button>
      </div>
    );
  }

  const run = async (action: () => Promise<void>, failure: string) => {
    setError(null);
    setBusy(true);
    try {
      await action();
    } catch {
      setError(failure);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex max-w-lg flex-col items-start gap-4">
      <ShieldCheck aria-hidden="true" className="size-10 text-brand-text" />
      <h1 className="text-h1">{t('mfa.setupTitle')}</h1>
      <p>{t('mfa.setupBody')}</p>
      {secret ? (
        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            void run(async () => {
              await finishTotpEnrollment(user, secret, code);
              setDone(true);
            }, t('mfa.invalid'));
          }}
        >
          <div className="rounded-md bg-surface p-2">
            <QrCode
              value={secret.generateQrCodeUrl(user.email ?? 'admin', 'TinHome')}
              label={t('mfa.qrLabel')}
            />
          </div>
          <p className="text-sm">
            {t('mfa.secretLabel')}: <code className="font-mono">{secret.secretKey}</code>
          </p>
          <TextField
            label={t('mfa.codeLabel')}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
            error={error ?? undefined}
          />
          <Button type="submit" disabled={busy || code.length !== 6}>
            {t('mfa.enroll')}
          </Button>
        </form>
      ) : (
        <>
          {error ? (
            <p role="alert" className="rounded-md border border-danger p-3">
              {error}
            </p>
          ) : null}
          <Button
            disabled={busy}
            onClick={() =>
              void run(async () => setSecret(await startTotpEnrollment(user)), t('mfa.unsupported'))
            }
          >
            {t('mfa.start')}
          </Button>
        </>
      )}
    </div>
  );
}
