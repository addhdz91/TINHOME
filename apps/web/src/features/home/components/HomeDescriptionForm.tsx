import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import type { HomeOwnerView } from '@tinhome/shared/schemas';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DescriptionSchema, type DescriptionValues } from '../lib/forms';

interface Props {
  home: HomeOwnerView | null;
  submitLabel: string;
  onSubmit: (values: DescriptionValues) => Promise<void>;
  onChange?: (values: Partial<DescriptionValues>) => void;
}

const LIMITS = { title: 70, description: 1500, houseRules: 500 } as const;

/** S-03 step 3c — title, description and rules with counters and BR-22 hints while typing. */
export function HomeDescriptionForm({ home, submitLabel, onSubmit, onChange }: Props) {
  const { t } = useTranslation();
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DescriptionValues>({
    resolver: zodResolver(DescriptionSchema),
    mode: 'onChange',
    defaultValues: {
      title: home?.title ?? '',
      description: home?.description ?? '',
      houseRules: home?.houseRules ?? '',
    },
  });
  const values = useWatch({ control });

  const field = (name: keyof DescriptionValues, multiline: boolean) => {
    const id = `home-${name}`;
    const key = errors[name]?.message;
    const error = key ? t(`home.validation.${key as 'title'}`) : undefined;
    const length = values[name]?.length ?? 0;
    const registration = register(name, { onChange: () => onChange?.(values) });
    const className = cn(
      'w-full rounded-md border bg-surface px-3 py-2 text-text',
      error ? 'border-danger' : 'border-border',
    );
    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={id} className="font-semibold">
          {t(`home.fields.${name}`)}
        </label>
        {multiline ? (
          <textarea
            id={id}
            rows={name === 'description' ? 7 : 3}
            aria-invalid={error ? true : undefined}
            aria-describedby={`${id}-hint ${id}-error`}
            className={className}
            {...registration}
          />
        ) : (
          <input
            id={id}
            aria-invalid={error ? true : undefined}
            aria-describedby={`${id}-hint ${id}-error`}
            className={cn(className, 'min-h-11')}
            {...registration}
          />
        )}
        <div className="flex justify-between gap-2 text-sm text-muted">
          <span id={`${id}-hint`}>{t(`home.fields.${name}Hint`)}</span>
          <span aria-hidden="true">
            {t('home.fields.counter', { count: length, max: LIMITS[name] })}
          </span>
        </div>
        <p
          id={`${id}-error`}
          role={error ? 'alert' : undefined}
          className="text-sm font-semibold text-danger"
        >
          {error ?? ''}
        </p>
      </div>
    );
  };

  return (
    <form
      noValidate
      onSubmit={(event) => void handleSubmit(onSubmit)(event)}
      className="flex flex-col gap-4"
    >
      {field('title', false)}
      {field('description', true)}
      {field('houseRules', true)}
      <Button type="submit" size="lg" disabled={isSubmitting} className="self-start">
        {isSubmitting ? t('home.saving') : submitLabel}
      </Button>
    </form>
  );
}
