import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Trans, useTranslation } from 'react-i18next';
import { TextField } from '@/components/TextField';
import { Button } from '@/components/ui/button';
import { LegalLink } from '@/features/legal';
import { registerSchema, type RegisterValues } from '../lib/register-schema';
import { PasswordField } from './PasswordField';

interface RegisterFormProps {
  /** false when completing a Google sign-up (no e-mail/password). */
  withCredentials: boolean;
  defaults: Partial<RegisterValues>;
  submitLabel: string;
  submittingLabel: string;
  onSubmit: (values: RegisterValues) => Promise<void>;
  /** Server-side problem shown above the button (already translated). */
  formError: React.ReactNode;
}

/** Consents of FR-01 with the legal text each one opens. */
const CONSENTS = [
  { field: 'acceptTerms', slug: 'terminos', i18nKey: 'auth.register.terms' },
  { field: 'acceptPrivacy', slug: 'privacidad', i18nKey: 'auth.register.privacy' },
] as const;

const EMPTY: RegisterValues = {
  firstName: '',
  lastName: '',
  birthDate: '',
  email: '',
  password: '',
  referralCode: '',
  acceptTerms: false,
  acceptPrivacy: false,
};

/** S-02 — single column, inline validation on blur, Terms/Privacy open in a sheet. */
export function RegisterForm({
  withCredentials,
  defaults,
  submitLabel,
  submittingLabel,
  onSubmit,
  formError,
}: RegisterFormProps) {
  const { t } = useTranslation();
  const schema = useMemo(() => registerSchema(new Date(), withCredentials), [withCredentials]);
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: { ...EMPTY, ...defaults },
  });
  const [password, acceptTerms, acceptPrivacy] = useWatch({
    control,
    name: ['password', 'acceptTerms', 'acceptPrivacy'],
  });

  const message = (field: keyof RegisterValues): string | undefined => {
    const key = errors[field]?.message;
    return key ? t(`auth.validation.${key as 'email'}`) : undefined;
  };
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form
      noValidate
      onSubmit={(event) => void handleSubmit(onSubmit)(event)}
      className="flex flex-col gap-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label={t('auth.fields.firstName')}
          autoComplete="given-name"
          error={message('firstName')}
          {...register('firstName')}
        />
        <TextField
          label={t('auth.fields.lastName')}
          autoComplete="family-name"
          error={message('lastName')}
          {...register('lastName')}
        />
      </div>
      <TextField
        label={t('auth.fields.birthDate')}
        type="date"
        max={today}
        autoComplete="bday"
        hint={t('auth.fields.birthDateHint')}
        error={message('birthDate')}
        {...register('birthDate')}
      />
      {withCredentials ? (
        <>
          <TextField
            label={t('auth.fields.email')}
            type="email"
            inputMode="email"
            autoComplete="email"
            error={message('email')}
            {...register('email')}
          />
          <PasswordField
            label={t('auth.fields.password')}
            autoComplete="new-password"
            hint={t('auth.fields.passwordHint')}
            error={message('password')}
            strengthOf={password}
            {...register('password')}
          />
        </>
      ) : null}
      <TextField
        label={t('auth.fields.referralCode')}
        autoComplete="off"
        autoCapitalize="characters"
        hint={t('auth.fields.referralHint')}
        error={message('referralCode')}
        {...register('referralCode')}
      />

      <fieldset className="flex flex-col gap-3">
        {CONSENTS.map(({ field, slug, i18nKey }) => {
          return (
            <div key={field} className="flex flex-col gap-1">
              <div className="flex items-start gap-3">
                <input
                  id={`register-${field}`}
                  type="checkbox"
                  className="mt-1 size-5 shrink-0 accent-primary"
                  aria-describedby={`register-${field}-error`}
                  {...register(field)}
                />
                <label htmlFor={`register-${field}`}>
                  <Trans i18nKey={i18nKey} components={{ 1: <LegalLink slug={slug} /> }} />
                </label>
              </div>
              <p id={`register-${field}-error`} className="text-sm font-semibold text-danger">
                {message(field) ?? ''}
              </p>
            </div>
          );
        })}
      </fieldset>

      {formError ? (
        <div role="alert" className="rounded-md border border-danger p-3">
          {formError}
        </div>
      ) : null}

      {/* AC-01.4 — disabled until Terms and Privacy are accepted. */}
      <Button type="submit" size="lg" disabled={!acceptTerms || !acceptPrivacy || isSubmitting}>
        {isSubmitting ? submittingLabel : submitLabel}
      </Button>
    </form>
  );
}
