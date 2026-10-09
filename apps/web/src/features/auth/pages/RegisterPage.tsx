import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import { normalizeReferralCode } from '@tinhome/shared/domain';
import { useAuth } from '@/app/auth/auth-context';
import { RouteFallback } from '@/app/RouteFallback';
import { useTheme } from '@/app/theme-context';
import { ErrorState } from '@/components/ErrorState';
import { Seo } from '@/components/Seo';
import { useLegalVersion } from '@/features/legal';
import { toAppError, toUserMessage } from '@/lib/app-error';
import { authErrorCode, authErrorKey } from '@/lib/auth-errors';
import { completeSignup, updateSettings } from '@/lib/callables';
import { GoogleButton } from '../components/GoogleButton';
import { RegisterForm } from '../components/RegisterForm';
import {
  forgetReferral,
  rememberedReferral,
  sendVerificationEmail,
  signInWithGoogle,
  signUpWithEmail,
} from '../lib/auth-actions';
import type { RegisterValues } from '../lib/register-schema';

/** S-02 / FR-01 — sign-up with e-mail or Google; also completes a Google sign-up. */
export function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { state, refreshMe } = useAuth();
  const { preference } = useTheme();
  const terms = useLegalVersion('terminos');
  const privacy = useLegalVersion('privacidad');
  const [formError, setFormError] = useState<React.ReactNode>(null);
  // While our own flow runs, auth state changes must not swap the form or redirect.
  const [flowActive, setFlowActive] = useState(false);

  const referral = normalizeReferralCode(params.get('ref') ?? rememberedReferral() ?? '');

  if (!flowActive) {
    if (state.status === 'loading' || terms.isPending || privacy.isPending)
      return <RouteFallback />;
    if (state.status === 'signedIn') return <Navigate to="/app" replace />;
  }
  if (terms.isError || privacy.isError || !terms.data || !privacy.data) {
    return <ErrorState onRetry={() => void Promise.all([terms.refetch(), privacy.refetch()])} />;
  }
  if (state.status === 'error') return <ErrorState onRetry={state.retry} />;

  const versions = {
    acceptedTerms: terms.data.currentVersion,
    acceptedPrivacy: privacy.data.currentVersion,
  };
  const completing = !flowActive && state.status === 'needsProfile';
  const googleName = completing ? (state.user.displayName ?? '').trim().split(/\s+/) : [];

  const finishProfile = async (values: RegisterValues) => {
    const code = values.referralCode.trim();
    await completeSignup({
      firstName: values.firstName,
      lastName: values.lastName,
      birthDate: values.birthDate,
      ...(code ? { referralCode: code } : {}),
      ...versions,
    });
    forgetReferral();
    // The account starts with the theme this device already uses.
    if (preference !== 'system') await updateSettings({ theme: preference }).catch(() => undefined);
  };

  const onSubmit = async (values: RegisterValues) => {
    setFormError(null);
    setFlowActive(true);
    try {
      if (completing) {
        await finishProfile(values);
        await refreshMe();
        void navigate('/app', { replace: true });
        return;
      }
      const user = await signUpWithEmail(values.email, values.password);
      try {
        await finishProfile(values);
      } catch (error) {
        // AC-01.2 — no account is kept for a minor (or any refused profile).
        if (toAppError(error).code === 'E_UNDERAGE') await user.delete();
        throw error;
      }
      await sendVerificationEmail(user);
      await refreshMe();
      void navigate('/verifica-email', { replace: true });
    } catch (error) {
      setFlowActive(false);
      if (authErrorCode(error) === 'auth/email-already-in-use') {
        // AC-01.3 — explain and offer to sign in instead.
        setFormError(
          <p>
            {t('authErrors.emailInUse')}{' '}
            <Link to="/entrar" className="font-semibold text-link underline">
              {t('auth.register.emailInUseLink')}
            </Link>
          </p>,
        );
        return;
      }
      setFormError(
        authErrorCode(error) ? t(`authErrors.${authErrorKey(error)}`) : toUserMessage(t, error),
      );
    }
  };

  const onGoogle = async () => {
    setFormError(null);
    try {
      await signInWithGoogle();
    } catch (error) {
      setFormError(t(`authErrors.${authErrorKey(error)}`));
    }
  };

  return (
    <section className="flex flex-col gap-6">
      <Seo title={t('seo.register.title')} />
      <header className="flex flex-col gap-2">
        <h1 className="text-h1">
          {completing ? t('auth.register.completeTitle') : t('auth.register.title')}
        </h1>
        <p className="text-muted">
          {completing ? t('auth.register.completeSubtitle') : t('auth.register.subtitle')}
        </p>
        {referral ? (
          <p className="rounded-md bg-brand-soft p-3 text-sm text-brand-text">
            {t('auth.register.invited')}
          </p>
        ) : null}
      </header>
      {completing ? null : (
        <>
          <GoogleButton onClick={() => void onGoogle()} />
          <p className="flex items-center gap-3 text-sm text-muted before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
            {t('auth.orEmail')}
          </p>
        </>
      )}
      <RegisterForm
        key={completing ? 'complete' : 'full'}
        withCredentials={!completing}
        defaults={{
          referralCode: referral ?? '',
          firstName: googleName[0] ?? '',
          lastName: googleName.slice(1).join(' '),
        }}
        submitLabel={completing ? t('auth.register.completeSubmit') : t('auth.register.submit')}
        submittingLabel={t('auth.register.submitting')}
        onSubmit={onSubmit}
        formError={formError}
      />
      {completing ? null : (
        <p className="text-center text-muted">
          {t('auth.register.haveAccount')}{' '}
          <Link to="/entrar" className="font-semibold text-link underline">
            {t('auth.register.signInLink')}
          </Link>
        </p>
      )}
    </section>
  );
}
