import type { ConfirmationResult } from 'firebase/auth';
import { CheckCircle2, ShieldCheck } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useAuth, useMe } from '@/app/auth/auth-context';
import { TextField } from '@/components/TextField';
import { Button } from '@/components/ui/button';
import { toAppError, toUserMessage } from '@/lib/app-error';
import { authErrorCode, authErrorKey } from '@/lib/auth-errors';
import { confirmPhoneLinked } from '@/lib/callables';
import { formatSpanishMobile, sendPhoneCode, toSpanishMobile } from '../lib/phone';

const RESEND_SECONDS = 60;

/** S-03 step 2 / FR-07 — +34 mobile → 6-digit SMS code (autocompleted on mobiles). */
export function PhoneStep() {
  const { t } = useTranslation();
  const me = useMe();
  const { state, refreshMe } = useAuth();
  const navigate = useNavigate();
  const [number, setNumber] = useState('');
  const [code, setCode] = useState('');
  const [e164, setE164] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = window.setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  useEffect(() => {
    if (confirmation) codeRef.current?.focus();
  }, [confirmation]);

  if (me.verification.phoneVerified) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-h1">{t('onboarding.phone.title')}</h1>
        <p role="status" className="flex items-center gap-2 text-success">
          <CheckCircle2 aria-hidden="true" className="size-5" />
          {t('onboarding.phone.done')}
        </p>
        <Button size="lg" className="self-start" onClick={() => void navigate('/app/onboarding/3')}>
          {t('onboarding.phone.continue')}
        </Button>
      </div>
    );
  }

  const user = state.status === 'signedIn' ? state.user : null;

  const send = async () => {
    setError(null);
    const phone = toSpanishMobile(number);
    if (!phone) {
      setError(t('onboarding.phone.invalidNumber'));
      return;
    }
    if (!user) return;
    setBusy(true);
    try {
      setConfirmation(await sendPhoneCode(user, phone, 'phone-recaptcha'));
      setE164(phone);
      setCooldown(RESEND_SECONDS);
    } catch (err) {
      setError(t(`authErrors.${authErrorKey(err)}`));
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    setError(null);
    if (!/^\d{6}$/.test(code)) {
      setError(t('onboarding.phone.invalidCode'));
      return;
    }
    if (!confirmation) return;
    setBusy(true);
    try {
      await confirmation.confirm(code);
      await confirmPhoneLinked({});
      await refreshMe();
      void navigate('/app/onboarding/3');
    } catch (err) {
      setError(
        authErrorCode(err)
          ? t(`authErrors.${authErrorKey(err)}`)
          : toUserMessage(t, toAppError(err)),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-h1">{t('onboarding.phone.title')}</h1>
      <p className="flex items-start gap-3 text-muted">
        <ShieldCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-brand-text" />
        {t('onboarding.phone.why')}
      </p>

      {confirmation && e164 ? (
        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            void confirm();
          }}
        >
          <TextField
            ref={codeRef}
            label={t('onboarding.phone.codeLabel')}
            hint={t('onboarding.phone.codeHint', { phone: formatSpanishMobile(e164) })}
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            error={error ?? undefined}
            className="max-w-60"
            style={{ letterSpacing: '0.5em', fontVariantNumeric: 'tabular-nums' }}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="lg" disabled={busy}>
              {busy ? t('onboarding.phone.confirming') : t('onboarding.phone.confirm')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={busy || cooldown > 0}
              onClick={() => void send()}
            >
              {cooldown > 0
                ? t('onboarding.phone.resendIn', { seconds: cooldown })
                : t('onboarding.phone.resend')}
            </Button>
            <Button
              type="button"
              variant="link"
              onClick={() => {
                setConfirmation(null);
                setCode('');
                setError(null);
              }}
            >
              {t('onboarding.phone.changeNumber')}
            </Button>
          </div>
        </form>
      ) : (
        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            void send();
          }}
        >
          <TextField
            label={t('onboarding.phone.label')}
            hint={t('onboarding.phone.hint')}
            value={number}
            onChange={(event) => setNumber(event.target.value)}
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            error={error ?? undefined}
            leading={
              <span className="pl-3 font-semibold text-muted">{t('onboarding.phone.prefix')}</span>
            }
          />
          <Button type="submit" size="lg" className="self-start" disabled={busy}>
            {busy ? t('onboarding.phone.sending') : t('onboarding.phone.send')}
          </Button>
        </form>
      )}
      <div id="phone-recaptcha" />
    </div>
  );
}
