import { MailOpen } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Navigate, useNavigate } from 'react-router';
import { useAuth } from '@/app/auth/auth-context';
import { RouteFallback } from '@/app/RouteFallback';
import { Seo } from '@/components/Seo';
import { Button } from '@/components/ui/button';
import { authErrorKey } from '@/lib/auth-errors';
import { resendCooldownSeconds, sendVerificationEmail } from '../lib/auth-actions';
import { maskEmail } from '../lib/mask-email';

const POLL_MS = 4000;

/** S-02 / FR-02 — waits for the verification link; resend once every 60 s. */
export function VerifyEmailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { state, refreshMe, signOut } = useAuth();
  const [cooldown, setCooldown] = useState(resendCooldownSeconds);
  const [notice, setNotice] = useState<string | null>(null);

  const user = state.status === 'signedIn' || state.status === 'needsProfile' ? state.user : null;
  const verified = state.status === 'signedIn' && state.me.verification.emailVerified;

  const check = useCallback(async () => {
    if (!user) return;
    await user.reload();
    // The ID token must be refreshed so the server sees email_verified = true.
    if (user.emailVerified) await refreshMe();
  }, [user, refreshMe]);

  useEffect(() => {
    if (!user || verified) return undefined;
    const interval = window.setInterval(() => void check(), POLL_MS);
    const onFocus = () => void check();
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [user, verified, check]);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = window.setTimeout(() => setCooldown(resendCooldownSeconds()), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  if (state.status === 'loading') return <RouteFallback />;
  if (state.status === 'signedOut') return <Navigate to="/entrar" replace />;
  if (state.status === 'needsProfile') return <Navigate to="/registro" replace />;
  if (verified) return <Navigate to="/app" replace />;
  if (!user) return <RouteFallback />;

  const resend = async () => {
    setNotice(null);
    try {
      await sendVerificationEmail(user);
      setCooldown(resendCooldownSeconds());
      setNotice(t('auth.verify.resent'));
    } catch (error) {
      setNotice(t(`authErrors.${authErrorKey(error)}`));
    }
  };

  return (
    <section className="flex flex-col items-start gap-5">
      <Seo title={t('seo.verify.title')} />
      <MailOpen aria-hidden="true" className="size-12 text-brand-text" />
      <h1 className="text-h1">{t('auth.verify.title')}</h1>
      <p>
        <Trans
          i18nKey="auth.verify.body"
          values={{ email: maskEmail(user.email ?? '') }}
          components={{ 1: <strong /> }}
        />
      </p>
      <p role="status" aria-live="polite" className="text-sm text-muted">
        {notice ?? ''}
      </p>
      <Button onClick={() => void resend()} disabled={cooldown > 0} variant="secondary">
        {cooldown > 0 ? t('auth.verify.resendIn', { seconds: cooldown }) : t('auth.verify.resend')}
      </Button>
      <div className="flex flex-col gap-2 rounded-lg border border-border p-4">
        <p className="font-semibold">{t('auth.verify.changeEmail')}</p>
        <p className="text-sm text-muted">{t('auth.verify.changeEmailBody')}</p>
        <Button
          variant="ghost"
          className="self-start"
          onClick={() => {
            void signOut().then(() => navigate('/registro'));
          }}
        >
          {t('auth.verify.signOut')}
        </Button>
      </div>
    </section>
  );
}
