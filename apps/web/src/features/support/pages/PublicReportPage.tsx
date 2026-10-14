import { useMutation } from '@tanstack/react-query';
import { CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { REPORT_REASONS, type ReportReason } from '@tinhome/shared/constants';
import { Seo } from '@/components/Seo';
import { TextField } from '@/components/TextField';
import { Button } from '@/components/ui/button';
import { toUserMessage } from '@/lib/app-error';
import { submitPublicReport } from '@/lib/callables';

/** S-16 / FR-43 — `/denunciar`: report content without an account (DSA notice and action). */
export function PublicReportPage() {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [reason, setReason] = useState<ReportReason>('OTHER');
  const [description, setDescription] = useState('');
  const [goodFaith, setGoodFaith] = useState(false);
  const [touched, setTouched] = useState(false);
  const send = useMutation({
    mutationFn: () =>
      submitPublicReport({
        name: name.trim(),
        email: email.trim(),
        targetUrl: targetUrl.trim(),
        reason,
        description: description.trim(),
        goodFaith: true,
      }),
    onError: (error) => toast.error(toUserMessage(t, error)),
  });
  const errors = {
    name: name.trim().length < 2 ? t('publicReport.nameError') : undefined,
    email: /^\S+@\S+\.\S+$/.test(email.trim()) ? undefined : t('support.form.emailError'),
    targetUrl: targetUrl.trim().length < 5 ? t('publicReport.urlError') : undefined,
    description:
      description.trim().length < 20 ? t('support.form.descriptionError', { min: 20 }) : undefined,
    goodFaith: goodFaith ? undefined : t('publicReport.goodFaithError'),
  };
  const valid = Object.values(errors).every((error) => error === undefined);

  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-5 px-4 py-12">
      <Seo title={`${t('publicReport.title')} — TinHome`} description={t('publicReport.intro')} />
      <h1 className="text-h1">{t('publicReport.title')}</h1>
      <p>{t('publicReport.intro')}</p>
      {send.data ? (
        <div role="status" className="flex flex-col gap-2 rounded-lg border border-success p-5">
          <CheckCircle2 aria-hidden="true" className="size-8 text-success" />
          <p className="text-h3">{t('report.sent')}</p>
        </div>
      ) : (
        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            setTouched(true);
            if (valid) send.mutate();
          }}
        >
          <TextField
            label={t('support.form.name')}
            value={name}
            autoComplete="name"
            error={touched ? errors.name : undefined}
            onChange={(event) => setName(event.target.value)}
          />
          <TextField
            label={t('support.form.email')}
            type="email"
            autoComplete="email"
            value={email}
            error={touched ? errors.email : undefined}
            onChange={(event) => setEmail(event.target.value)}
          />
          <TextField
            label={t('publicReport.url')}
            hint={t('publicReport.urlHint')}
            value={targetUrl}
            error={touched ? errors.targetUrl : undefined}
            onChange={(event) => setTargetUrl(event.target.value)}
          />
          <label className="flex flex-col gap-1.5">
            <span className="font-semibold">{t('report.reason')}</span>
            <select
              className="min-h-11 rounded-md border border-border bg-surface px-3"
              value={reason}
              onChange={(event) => setReason(event.target.value as ReportReason)}
            >
              {REPORT_REASONS.map((value) => (
                <option key={value} value={value}>
                  {t(`report.reasons.${value}`)}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="public-report-description" className="font-semibold">
              {t('publicReport.description')}
            </label>
            <textarea
              id="public-report-description"
              className="min-h-36 rounded-md border border-border bg-surface p-3"
              maxLength={4000}
              value={description}
              aria-invalid={touched && errors.description ? true : undefined}
              aria-describedby="public-report-description-hint"
              onChange={(event) => setDescription(event.target.value)}
            />
            <p
              id="public-report-description-hint"
              className={
                touched && errors.description ? 'text-sm text-danger' : 'text-sm text-muted'
              }
            >
              {touched && errors.description
                ? errors.description
                : t('publicReport.descriptionHint')}
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                className="mt-1 size-5 accent-primary"
                checked={goodFaith}
                onChange={(event) => setGoodFaith(event.target.checked)}
              />
              <span>{t('publicReport.goodFaith')}</span>
            </label>
            {touched && errors.goodFaith ? (
              <p role="alert" className="text-sm text-danger">
                {errors.goodFaith}
              </p>
            ) : null}
          </div>
          <Button type="submit" size="lg" variant="danger" disabled={send.isPending}>
            {t('report.submit')}
          </Button>
        </form>
      )}
    </section>
  );
}
