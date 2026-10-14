import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { Params } from '@tinhome/shared/types';
import { ErrorState } from '@/components/ErrorState';
import { Seo } from '@/components/Seo';
import { Skeleton } from '@/components/Skeleton';
import { Button } from '@/components/ui/button';
import { toUserMessage } from '@/lib/app-error';
import { adminGetParams, adminUpdateParams } from '@/lib/callables';

type Draft = Record<string, string>;

// Raw parameter values (the panel shows P-xx names and values as stored).
const BOOLEAN_OPTIONS = ['true', 'false'] as const;
const REFUND_OPTIONS = ['FULL', 'PRORATED'] as const;

function toDraft(params: Params): Draft {
  return Object.fromEntries(
    Object.entries(params).map(([key, value]) => [
      key,
      Array.isArray(value) ? value.join(', ') : String(value),
    ]),
  );
}

/** Converts the edited strings back to the type of the current value. */
function fromDraft(draft: Draft, current: Params): Partial<Params> {
  const changes: Record<string, unknown> = {};
  for (const [key, text] of Object.entries(draft)) {
    const before = current[key as keyof Params];
    let value: unknown = text;
    if (typeof before === 'number') value = Number(text.replace(',', '.'));
    else if (typeof before === 'boolean') value = text === 'true';
    else if (Array.isArray(before)) value = text.split(',').map((part) => Number(part.trim()));
    if (JSON.stringify(value) !== JSON.stringify(before)) changes[key] = value;
  }
  return changes;
}

/** UX §9 / FR-52 — P-xx parameters (superadmin; validated and audited by the server). */
export function ParamsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const params = useQuery({ queryKey: ['admin', 'params'], queryFn: () => adminGetParams({}) });
  const [draft, setDraft] = useState<Draft | null>(null);
  const save = useMutation({
    mutationFn: (changes: Partial<Params>) => adminUpdateParams(changes),
    onSuccess: async () => {
      toast.success(t('admin.params.saved'));
      setDraft(null);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'params'] });
    },
    onError: (error) => toast.error(toUserMessage(t, error)),
  });
  if (params.isPending) return <Skeleton className="h-96" />;
  if (params.isError) return <ErrorState onRetry={() => void params.refetch()} />;
  const current = params.data.params;
  const values = draft ?? toDraft(current);
  const changes = fromDraft(values, current);
  return (
    <section className="flex flex-col gap-4">
      <Seo title={`${t('admin.params.title')} — ${t('admin.title')}`} />
      <h1 className="text-h1">{t('admin.params.title')}</h1>
      <p className="text-sm text-muted">{t('admin.params.intro')}</p>
      <form
        className="grid gap-3 md:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          save.mutate(changes);
        }}
      >
        {Object.keys(current).map((key) => {
          const before = current[key as keyof Params];
          const id = `param-${key}`;
          return (
            <div key={key} className="flex flex-col gap-1">
              <label htmlFor={id} className="font-mono text-sm font-semibold">
                {key}
              </label>
              {typeof before === 'boolean' || key === 'withdrawalRefundMode' ? (
                <select
                  id={id}
                  className="min-h-11 rounded-md border border-border bg-surface px-3"
                  value={values[key]}
                  onChange={(event) => setDraft({ ...values, [key]: event.target.value })}
                >
                  {(typeof before === 'boolean' ? BOOLEAN_OPTIONS : REFUND_OPTIONS).map(
                    (option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ),
                  )}
                </select>
              ) : (
                <input
                  id={id}
                  className="min-h-11 rounded-md border border-border bg-surface px-3"
                  value={values[key]}
                  onChange={(event) => setDraft({ ...values, [key]: event.target.value })}
                />
              )}
            </div>
          );
        })}
        <div className="flex gap-2 md:col-span-2">
          <Button type="submit" disabled={save.isPending || Object.keys(changes).length === 0}>
            {t('admin.params.save', { count: Object.keys(changes).length })}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setDraft(null)}>
            {t('common.cancel')}
          </Button>
        </div>
      </form>
    </section>
  );
}
