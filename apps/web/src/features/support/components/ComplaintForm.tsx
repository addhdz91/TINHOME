import { useMutation } from '@tanstack/react-query';
import { CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { COMPLAINT_CATEGORIES, type ComplaintCategory } from '@tinhome/shared/constants';
import { TextField } from '@/components/TextField';
import { Button } from '@/components/ui/button';
import { toUserMessage } from '@/lib/app-error';
import { submitComplaint } from '@/lib/callables';
import { formatInstant } from '@/lib/format';

const MIN_DESCRIPTION = 20;

/**
 * C-? / FR-67 — complaint form for signed-in users (`visitor = false`) or visitors (e-mail).
 * After sending: tracking number, deadline and where to follow it (BR-43).
 */
export function ComplaintForm({ visitor }: { visitor: boolean }) {
  const { t } = useTranslation();
  const [category, setCategory] = useState<ComplaintCategory>('ACCOUNT');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [touched, setTouched] = useState(false);
  const send = useMutation({
    mutationFn: () =>
      submitComplaint({
        category,
        subject: subject.trim(),
        description: description.trim(),
        ...(visitor ? { email: email.trim(), ...(name.trim() ? { name: name.trim() } : {}) } : {}),
      }),
    onError: (error) => toast.error(toUserMessage(t, error)),
  });
  const errors = {
    subject: subject.trim().length < 5 ? t('support.form.subjectError') : undefined,
    description:
      description.trim().length < MIN_DESCRIPTION
        ? t('support.form.descriptionError', { min: MIN_DESCRIPTION })
        : undefined,
    email:
      visitor && !/^\S+@\S+\.\S+$/.test(email.trim()) ? t('support.form.emailError') : undefined,
  };
  const valid = !errors.subject && !errors.description && !errors.email;

  if (send.data) {
    return (
      <div
        role="status"
        className="flex flex-col gap-3 rounded-lg border border-success bg-surface p-5"
      >
        <CheckCircle2 aria-hidden="true" className="size-8 text-success" />
        <h2 className="text-h2">{t('support.sent.title')}</h2>
        <p className="text-h3">{t('support.sent.number', { number: send.data.number })}</p>
        <p>{t('support.sent.due', { date: formatInstant(new Date(send.data.dueAt)) })}</p>
        <p className="text-sm text-muted">{t('support.official')}</p>
        {visitor ? (
          <p className="text-sm">{t('support.sent.visitor')}</p>
        ) : (
          <Button asChild variant="secondary" className="self-start">
            <Link to={`/app/soporte/${send.data.ticketId}`}>{t('support.sent.open')}</Link>
          </Button>
        )}
      </div>
    );
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        setTouched(true);
        if (valid) send.mutate();
      }}
    >
      <label className="flex flex-col gap-1.5">
        <span className="font-semibold">{t('support.form.category')}</span>
        <select
          className="min-h-11 rounded-md border border-border bg-surface px-3"
          value={category}
          onChange={(event) => setCategory(event.target.value as ComplaintCategory)}
        >
          {COMPLAINT_CATEGORIES.map((value) => (
            <option key={value} value={value}>
              {t(`support.categories.${value}`)}
            </option>
          ))}
        </select>
      </label>
      {visitor ? (
        <>
          <TextField
            label={t('support.form.name')}
            value={name}
            autoComplete="name"
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
        </>
      ) : null}
      <TextField
        label={t('support.form.subject')}
        value={subject}
        maxLength={120}
        error={touched ? errors.subject : undefined}
        onChange={(event) => setSubject(event.target.value)}
      />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="complaint-description" className="font-semibold">
          {t('support.form.description')}
        </label>
        <textarea
          id="complaint-description"
          className="min-h-36 rounded-md border border-border bg-surface p-3"
          maxLength={4000}
          value={description}
          aria-invalid={touched && errors.description ? true : undefined}
          aria-describedby="complaint-description-hint"
          onChange={(event) => setDescription(event.target.value)}
        />
        <p
          id="complaint-description-hint"
          className={touched && errors.description ? 'text-sm text-danger' : 'text-sm text-muted'}
        >
          {touched && errors.description ? errors.description : t('support.form.descriptionHint')}
        </p>
      </div>
      <p className="text-sm text-muted">{t('support.official')}</p>
      <Button type="submit" size="lg" disabled={send.isPending}>
        {t('support.form.submit')}
      </Button>
    </form>
  );
}
