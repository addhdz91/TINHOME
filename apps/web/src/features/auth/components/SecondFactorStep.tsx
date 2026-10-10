import type { MultiFactorResolver } from 'firebase/auth';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TextField } from '@/components/TextField';
import { Button } from '@/components/ui/button';
import { isPhoneHint, resolveWithSms, resolveWithTotp, sendSmsCode } from '../lib/mfa';

const RECAPTCHA_ID = 'mfa-recaptcha';

/** FR-48 — second step of the sign-in for accounts with a second factor. */
export function SecondFactorStep({
  resolver,
  onCancel,
}: {
  resolver: MultiFactorResolver;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const hint = resolver.hints[0];
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (!hint) return null;
  const phone = isPhoneHint(hint);

  const run = async (action: () => Promise<void>) => {
    setError(null);
    setBusy(true);
    try {
      await action();
    } catch {
      setError(t('mfa.invalid'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="flex flex-col gap-4" aria-labelledby="mfa-title">
      <h1 id="mfa-title" className="text-h1">
        {t('mfa.title')}
      </h1>
      <div id={RECAPTCHA_ID} />
      {phone && !verificationId ? (
        <Button
          size="lg"
          disabled={busy}
          onClick={() =>
            void run(async () => setVerificationId(await sendSmsCode(resolver, hint, RECAPTCHA_ID)))
          }
        >
          {t('mfa.sendSms')}
        </Button>
      ) : (
        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            void run(() =>
              verificationId
                ? resolveWithSms(resolver, verificationId, code)
                : resolveWithTotp(resolver, hint, code),
            );
          }}
        >
          <TextField
            label={t('mfa.codeLabel')}
            hint={phone ? t('mfa.smsHint', { phone: hint.phoneNumber }) : t('mfa.totpHint')}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
            error={error ?? undefined}
          />
          <Button type="submit" size="lg" disabled={busy || code.length !== 6}>
            {busy ? t('mfa.verifying') : t('mfa.verify')}
          </Button>
        </form>
      )}
      <Button variant="ghost" onClick={onCancel}>
        {t('mfa.cancel')}
      </Button>
    </section>
  );
}
