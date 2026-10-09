import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useRef } from 'react';
import { Controller, useForm, useWatch, type FieldErrors } from 'react-hook-form';
import { Trans, useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import type { City, ExchangeWindow } from '@/features/cities';
import { toAppError, toUserMessage } from '@/lib/app-error';
import { useJoinWaitlist } from '../api/use-waitlist';
import { waitlistFormSchema, type WaitlistFormValues } from '../lib/form-schema';
import { CheckboxGroup } from './CheckboxGroup';
import { FieldError } from './FieldError';

const FIELD_ORDER = ['email', 'cityId', 'destinations', 'windowIds', 'acceptPrivacy'] as const;
type FieldName = (typeof FIELD_ORDER)[number];

interface WaitlistFormProps {
  cities: City[];
  windows: ExchangeWindow[];
  privacyVersion: string;
  maxDestinations: number;
  onJoined: () => void;
  onPrivacyOutdated: () => void;
}

/** S-16 — e-mail, own city, destinations and windows; double opt-in (FR-19). */
export function WaitlistForm({
  cities,
  windows,
  privacyVersion,
  maxDestinations,
  onJoined,
  onPrivacyOutdated,
}: WaitlistFormProps) {
  const { t } = useTranslation();
  const schema = useMemo(() => waitlistFormSchema(maxDestinations), [maxDestinations]);
  const join = useJoinWaitlist();
  const summaryRef = useRef<HTMLDivElement>(null);
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitted },
  } = useForm<WaitlistFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', cityId: '', destinations: [], windowIds: [], acceptPrivacy: false },
  });
  const cityId = useWatch({ control, name: 'cityId' });

  const messageFor = (field: FieldName): string | undefined => {
    const error = errors[field];
    if (!error) return undefined;
    if (field === 'destinations' && error.message === 'destinationsMax') {
      return t('waitlist.form.errors.destinationsMax', { max: maxDestinations });
    }
    return t(`waitlist.form.errors.${field}`);
  };

  const onInvalid = (_: FieldErrors<WaitlistFormValues>) => {
    // Error summary first (WCAG 3.3.1), then each field links to its control.
    requestAnimationFrame(() => summaryRef.current?.focus());
  };

  const submitValues = async (values: WaitlistFormValues) => {
    try {
      await join.mutateAsync({
        email: values.email,
        cityId: values.cityId,
        destinations: values.destinations,
        windowIds: values.windowIds,
        acceptPrivacy: privacyVersion,
      });
      onJoined();
    } catch (error) {
      const appError = toAppError(error);
      if (appError.code === 'E_LEGAL_VERSION') onPrivacyOutdated();
      if (appError.code === 'E_VALIDATION') {
        for (const field of Object.keys(appError.fields)) {
          if ((FIELD_ORDER as readonly string[]).includes(field))
            setError(field as FieldName, { message: field });
        }
        onInvalid({});
      }
      if (appError.code === 'E_CITY_UNKNOWN') setError('cityId', { message: 'cityId' });
    }
  };

  const invalidFields = FIELD_ORDER.filter((field) => errors[field]);
  const destinationOptions = cities
    .filter((city) => city.id !== cityId)
    .map((city) => ({ value: city.id, label: city.name }));
  const windowOptions = windows.map((w) => ({ value: w.id, label: w.name }));
  const serverError = join.error ? toAppError(join.error) : null;
  const showServerError = serverError !== null && serverError.code !== 'E_VALIDATION';

  return (
    <form
      noValidate
      onSubmit={(event) => void handleSubmit(submitValues, onInvalid)(event)}
      className="flex flex-col gap-6"
    >
      {isSubmitted && invalidFields.length > 0 ? (
        <div
          ref={summaryRef}
          tabIndex={-1}
          role="alert"
          className="rounded-md border border-danger p-4 outline-none"
        >
          <p className="font-semibold">{t('waitlist.form.errorSummary')}</p>
          <ul className="mt-2 list-disc pl-5">
            {invalidFields.map((field) => (
              <li key={field}>
                <a href={`#waitlist-${field}`} className="text-link underline">
                  {messageFor(field)}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <label htmlFor="waitlist-email" className="font-semibold">
          {t('waitlist.form.email')}
        </label>
        <input
          id="waitlist-email"
          type="email"
          autoComplete="email"
          inputMode="email"
          aria-invalid={errors.email ? true : undefined}
          aria-describedby="waitlist-email-hint waitlist-email-error"
          className="min-h-11 rounded-md border border-border bg-surface px-3 text-text"
          {...register('email')}
        />
        <p id="waitlist-email-hint" className="text-sm text-muted">
          {t('waitlist.form.emailHint')}
        </p>
        <FieldError id="waitlist-email-error" message={messageFor('email')} />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="waitlist-cityId" className="font-semibold">
          {t('waitlist.form.city')}
        </label>
        <select
          id="waitlist-cityId"
          aria-invalid={errors.cityId ? true : undefined}
          aria-describedby="waitlist-cityId-error"
          className="min-h-11 rounded-md border border-border bg-surface px-3 text-text"
          {...register('cityId')}
        >
          <option value="">{t('waitlist.form.cityPlaceholder')}</option>
          {cities.map((city) => (
            <option key={city.id} value={city.id}>
              {city.name}
            </option>
          ))}
        </select>
        <FieldError id="waitlist-cityId-error" message={messageFor('cityId')} />
      </div>

      <Controller
        control={control}
        name="destinations"
        render={({ field }) => (
          <CheckboxGroup
            id="waitlist-destinations"
            legend={t('waitlist.form.destinations')}
            hint={t('waitlist.form.destinationsHint', { max: maxDestinations })}
            options={destinationOptions}
            value={field.value}
            onChange={field.onChange}
            error={messageFor('destinations')}
          />
        )}
      />

      {windowOptions.length > 0 ? (
        <Controller
          control={control}
          name="windowIds"
          render={({ field }) => (
            <CheckboxGroup
              id="waitlist-windowIds"
              legend={t('waitlist.form.windows')}
              hint={t('waitlist.form.windowsHint')}
              options={windowOptions}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
      ) : null}

      <div className="flex flex-col gap-2">
        <div className="flex items-start gap-3">
          <input
            id="waitlist-acceptPrivacy"
            type="checkbox"
            aria-invalid={errors.acceptPrivacy ? true : undefined}
            aria-describedby="waitlist-acceptPrivacy-error"
            className="mt-1 size-5 accent-primary"
            {...register('acceptPrivacy')}
          />
          <label htmlFor="waitlist-acceptPrivacy">
            <Trans
              i18nKey="waitlist.form.privacy"
              components={{
                1: <Link to="/legal/privacidad" target="_blank" className="text-link underline" />,
              }}
            />
          </label>
        </div>
        <FieldError id="waitlist-acceptPrivacy-error" message={messageFor('acceptPrivacy')} />
      </div>

      {showServerError ? (
        <p role="alert" className="rounded-md border border-danger p-3">
          {toUserMessage(t, serverError)}
        </p>
      ) : null}

      <Button type="submit" size="lg" disabled={join.isPending} className="self-start">
        {join.isPending ? t('waitlist.form.submitting') : t('waitlist.form.submit')}
      </Button>
    </form>
  );
}
