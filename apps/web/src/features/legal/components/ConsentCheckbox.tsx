import type { InputHTMLAttributes, Ref } from 'react';
import { useTranslation } from 'react-i18next';
import { CONSENT_TEXTS, type ConsentDoc } from '@tinhome/shared/constants';
import { LegalDocDialog } from './LegalDocDialog';

type ConsentCheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'id'> & {
  id: string;
  slug: ConsentDoc;
  /** Already translated validation message. */
  error?: string | undefined;
  ref?: Ref<HTMLInputElement>;
};

/**
 * One legal consent: its own checkbox, the exact wording the server stores as evidence
 * (`CONSENT_TEXTS`) and a «Leer» link next to it that opens the text without leaving the form.
 * The link sits outside the <label>, so reading never ticks the box.
 */
export function ConsentCheckbox({ id, slug, error, ...inputProps }: ConsentCheckboxProps) {
  const { t } = useTranslation();
  const title = t(`legal.consentDocs.${slug}`);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-start gap-3">
        <input
          id={id}
          type="checkbox"
          className="mt-1 size-5 shrink-0 accent-primary"
          aria-invalid={error ? true : undefined}
          aria-describedby={`${id}-error`}
          {...inputProps}
        />
        <label htmlFor={id} className="flex-1">
          {CONSENT_TEXTS[slug]}
        </label>
        <LegalDocDialog
          slug={slug}
          trigger={
            <button
              type="button"
              aria-label={t('legal.readDoc', { title })}
              className="-my-2 inline-flex min-h-11 shrink-0 items-center px-1 font-semibold text-link underline"
            >
              {t('legal.read')}
            </button>
          }
        />
      </div>
      <p id={`${id}-error`} className="text-sm font-semibold text-danger">
        {error ?? ''}
      </p>
    </div>
  );
}
