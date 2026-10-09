import { zodResolver } from '@hookform/resolvers/zod';
import { MailCheck } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { z } from 'zod';
import { Seo } from '@/components/Seo';
import { TextField } from '@/components/TextField';
import { Button } from '@/components/ui/button';
import { authErrorKey } from '@/lib/auth-errors';
import { requestPasswordReset } from '../lib/auth-actions';

const RecoverSchema = z.object({ email: z.string().trim().pipe(z.email('email')) });
type RecoverValues = z.infer<typeof RecoverSchema>;

/** FR-03 — password recovery with the same answer whether the account exists or not. */
export function RecoverPage() {
  const { t } = useTranslation();
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RecoverValues>({
    resolver: zodResolver(RecoverSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async ({ email }: RecoverValues) => {
    setFormError(null);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (error) {
      setFormError(t(`authErrors.${authErrorKey(error)}`));
    }
  };

  return (
    <section className="flex flex-col gap-6">
      <Seo title={t('seo.recover.title')} />
      <h1 className="text-h1">{t('auth.recover.title')}</h1>
      {sent ? (
        <div
          role="status"
          className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-5"
        >
          <MailCheck aria-hidden="true" className="size-8 text-success" />
          <p>{t('auth.recover.sent')}</p>
        </div>
      ) : (
        <form
          noValidate
          onSubmit={(event) => void handleSubmit(onSubmit)(event)}
          className="flex flex-col gap-4"
        >
          <p className="text-muted">{t('auth.recover.intro')}</p>
          <TextField
            label={t('auth.fields.email')}
            type="email"
            inputMode="email"
            autoComplete="email"
            error={errors.email ? t('auth.validation.email') : undefined}
            {...register('email')}
          />
          {formError ? (
            <p role="alert" className="rounded-md border border-danger p-3">
              {formError}
            </p>
          ) : null}
          <Button type="submit" size="lg" disabled={isSubmitting}>
            {t('auth.recover.submit')}
          </Button>
        </form>
      )}
      <Link to="/entrar" className="text-center font-semibold text-link underline">
        {t('auth.recover.back')}
      </Link>
    </section>
  );
}
