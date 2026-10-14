import { useTranslation } from 'react-i18next';
import {
  STATEMENT_GROUNDS,
  STATEMENT_TEMPLATES,
  type StatementTemplate,
} from '@tinhome/shared/constants';
import type { StatementDraft } from '../lib/statement';

/**
 * BR-27 — statement of reasons: a template (PROVISIONAL texts) prefills facts and ground, the
 * admin adapts them. The server adds scope, duration and how to appeal; the preview shows it.
 */
export function StatementFields({
  value,
  onChange,
  idPrefix,
}: {
  value: StatementDraft;
  onChange: (value: StatementDraft) => void;
  idPrefix: string;
}) {
  const { t } = useTranslation();
  return (
    <fieldset className="flex flex-col gap-3 rounded-md border border-border p-3">
      <legend className="px-1 font-semibold">{t('admin.moderation.statement')}</legend>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold">{t('admin.moderation.template')}</span>
        <select
          className="min-h-11 rounded-md border border-border bg-surface px-3"
          value={value.templateId}
          onChange={(event) => {
            const templateId = event.target.value as StatementTemplate;
            onChange({
              ...value,
              templateId,
              facts: t(`admin.moderation.templates.${templateId}.facts`),
              groundDetail: t(`admin.moderation.templates.${templateId}.ground`),
            });
          }}
        >
          {STATEMENT_TEMPLATES.map((template) => (
            <option key={template} value={template}>
              {t(`admin.moderation.templates.${template}.name`)}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold">{t('admin.moderation.facts')}</span>
        <textarea
          id={`${idPrefix}-facts`}
          className="min-h-24 rounded-md border border-border bg-surface p-3"
          value={value.facts}
          maxLength={2000}
          onChange={(event) => onChange({ ...value, facts: event.target.value })}
        />
      </label>
      <div
        role="radiogroup"
        aria-label={t('admin.moderation.ground')}
        className="flex flex-wrap gap-4"
      >
        {STATEMENT_GROUNDS.map((ground) => (
          <label key={ground} className="flex min-h-11 items-center gap-2">
            <input
              type="radio"
              name={`${idPrefix}-ground`}
              className="size-5 accent-primary"
              checked={value.ground === ground}
              onChange={() => onChange({ ...value, ground })}
            />
            {t(`admin.moderation.grounds.${ground}`)}
          </label>
        ))}
      </div>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold">{t('admin.moderation.groundDetail')}</span>
        <input
          className="min-h-11 rounded-md border border-border bg-surface px-3"
          value={value.groundDetail}
          maxLength={500}
          onChange={(event) => onChange({ ...value, groundDetail: event.target.value })}
        />
      </label>
      <div className="rounded-md bg-surface-muted p-3 text-sm" aria-live="polite">
        <p className="font-semibold">{t('admin.moderation.preview')}</p>
        <p>
          {t('admin.moderation.previewFacts')} {value.facts || '—'}
        </p>
        <p>
          {t('admin.moderation.previewGround')} {t(`admin.moderation.grounds.${value.ground}`)}:{' '}
          {value.groundDetail || '—'}
        </p>
        <p className="text-muted">{t('admin.moderation.previewServer')}</p>
      </div>
    </fieldset>
  );
}
