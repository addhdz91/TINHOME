import { zodResolver } from '@hookform/resolvers/zod';
import type { MultiFactorResolver } from 'firebase/auth';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useSearchParams } from 'react-router';
import { z } from 'zod';
import { useAuth } from '@/app/auth/auth-context';
import { safeNext } from '@/app/auth/safe-next';
import { RouteFallback } from '@/app/RouteFallback';
import { Seo } from '@/components/Seo';
import { TextField } from '@/components/TextField';
import { Button } from '@/components/ui/button';
import { authErrorKey } from '@/lib/auth-errors';
import { GoogleButton } from '../components/GoogleButton';
import { PasswordField } from '../components/PasswordField';
import { SecondFactorStep } from '../components/SecondFactorStep';
import { signInWithEmail, signInWithGoogle } from '../lib/auth-actions';
import { mfaResolver } from '../lib/mfa';

const SignInSchema = z.object({
  email: z.string().trim().pipe(z.email('email')),
  password: z.string().min(1, 'password'),
});
type SignInValues = z.infer<typeof SignInSchema>;

/** S-02 / FR-03 — e-mail + password or Google; persistent session. */
export function SignInPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const { state } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const [resolver, setResolver] = useState<MultiFactorResolver | null>(null);
  const next = safeNext(params.get('next'));
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInValues>({
    resolver: zodResolver(SignInSchema),
    defaultValues: { email: '', password: '' },
  });

  if (state.status === 'loading') return <RouteFallback />;
  if (state.status === 'signedIn') return <Navigate to={next} replace />;
  if (state.status === 'needsProfile') return <Navigate to="/registro" replace />;

  const onSubmit = async (values: SignInValues) => {
    setFormError(null);
    try {
      await signInWithEmail(values.email, values.password);
    } catch (error) {
      const mfa = mfaResolver(error);
      // Same message whether the e-mail exists or not.
      if (mfa) setResolver(mfa);
      else setFormError(t(`authErrors.${authErrorKey(error)}`));
    }
  };

  if (resolver) return <SecondFactorStep resolver={resolver} onCancel={() => setResolver(null)} />;

  return (
    <section className="flex flex-col gap-6">
      <Seo title={t('seo.signIn.title')} />
      <h1 className="text-h1">{t('auth.signIn.title')}</h1>
      <GoogleButton
        onClick={() => {
          setFormError(null);
          signInWithGoogle().catch((error: unknown) =>
            setFormError(t(`authErrors.${authErrorKey(error)}`)),
          );
        }}
      />
      <p className="flex items-center gap-3 text-sm text-muted before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
        {t('auth.orEmail')}
      </p>
      <form
        noValidate
        onSubmit={(event) => void handleSubmit(onSubmit)(event)}
        className="flex flex-col gap-4"
      >
        <TextField
          label={t('auth.fields.email')}
          type="email"
          inputMode="email"
          autoComplete="email"
          error={errors.email ? t('auth.validation.email') : undefined}
          {...register('email')}
        />
        <PasswordField
          label={t('auth.fields.password')}
          autoComplete="current-password"
          error={errors.password ? t('authErrors.invalidCredential') : undefined}
          {...register('password')}
        />
        <Link to="/recuperar" className="self-start text-sm font-semibold text-link underline">
          {t('auth.signIn.forgot')}
        </Link>
        {formError ? (
          <p role="alert" className="rounded-md border border-danger p-3">
            {formError}
          </p>
        ) : null}
        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting ? t('auth.signIn.submitting') : t('auth.signIn.submit')}
        </Button>
      </form>
      <p className="text-center text-muted">
        {t('auth.signIn.noAccount')}{' '}
        <Link to="/registro" className="font-semibold text-link underline">
          {t('auth.signIn.signUpLink')}
        </Link>
      </p>
    </section>
  );
}
