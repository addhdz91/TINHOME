import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { FAQ_CATEGORIES, type FaqCategory } from '@tinhome/shared/constants';
import type { FaqAdminView } from '@tinhome/shared/schemas';
import { ErrorState } from '@/components/ErrorState';
import { Seo } from '@/components/Seo';
import { Skeleton } from '@/components/Skeleton';
import { TextField } from '@/components/TextField';
import { Button } from '@/components/ui/button';
import { SafeMarkdown } from '@/features/legal';
import { toUserMessage } from '@/lib/app-error';
import { adminListFaqs, adminUpsertFaq } from '@/lib/callables';

type Draft = Omit<FaqAdminView, 'helpfulYes' | 'helpfulNo'>;
const EMPTY: Draft = {
  slug: '',
  category: 'START',
  question: '',
  answerMarkdown: '',
  order: 0,
  published: false,
  tags: [],
};

function FaqEditor({ initial, onSaved }: { initial: Draft; onSaved: () => void }) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<Draft>(initial);
  const save = useMutation({
    mutationFn: () => adminUpsertFaq(draft),
    onSuccess: () => {
      toast.success(t('admin.faqs.saved'));
      onSaved();
    },
    onError: (error) => toast.error(toUserMessage(t, error)),
  });
  return (
    <form
      className="grid gap-4 lg:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate();
      }}
    >
      <div className="flex flex-col gap-3">
        <TextField
          label={t('admin.faqs.slug')}
          hint={t('admin.faqs.slugHint')}
          value={draft.slug}
          disabled={initial.slug !== ''}
          onChange={(event) => setDraft({ ...draft, slug: event.target.value })}
        />
        <label className="flex flex-col gap-1">
          <span className="font-semibold">{t('admin.faqs.category')}</span>
          <select
            className="min-h-11 rounded-md border border-border bg-surface px-3"
            value={draft.category}
            onChange={(event) =>
              setDraft({ ...draft, category: event.target.value as FaqCategory })
            }
          >
            {FAQ_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {t(`help.categories.${category}`)}
              </option>
            ))}
          </select>
        </label>
        <TextField
          label={t('admin.faqs.question')}
          value={draft.question}
          onChange={(event) => setDraft({ ...draft, question: event.target.value })}
        />
        <label className="flex flex-col gap-1">
          <span className="font-semibold">{t('admin.faqs.answer')}</span>
          <textarea
            className="min-h-48 rounded-md border border-border bg-surface p-3 font-mono text-sm"
            value={draft.answerMarkdown}
            onChange={(event) => setDraft({ ...draft, answerMarkdown: event.target.value })}
          />
        </label>
        <TextField
          label={t('admin.faqs.order')}
          type="number"
          value={String(draft.order)}
          onChange={(event) => setDraft({ ...draft, order: Number(event.target.value) || 0 })}
        />
        <TextField
          label={t('admin.faqs.tags')}
          value={draft.tags.join(', ')}
          onChange={(event) =>
            setDraft({
              ...draft,
              tags: event.target.value
                .split(',')
                .map((tag) => tag.trim())
                .filter(Boolean),
            })
          }
        />
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            className="size-5 accent-primary"
            checked={draft.published}
            onChange={(event) => setDraft({ ...draft, published: event.target.checked })}
          />
          {t('admin.faqs.published')}
        </label>
        <Button type="submit" className="self-start" disabled={save.isPending}>
          {t('admin.faqs.save')}
        </Button>
      </div>
      <section aria-labelledby="faq-preview" className="rounded-lg border border-border p-4">
        <h2 id="faq-preview" className="text-h3">
          {t('admin.faqs.preview')}
        </h2>
        <p className="font-semibold">{draft.question || '—'}</p>
        <SafeMarkdown markdown={draft.answerMarkdown} />
      </section>
    </form>
  );
}

/** UX §9 — FAQ editor (Markdown, category, order, publish) with «¿Te ha servido?» stats (FR-66). */
export function FaqsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const faqs = useQuery({ queryKey: ['admin', 'faqs'], queryFn: () => adminListFaqs({}) });
  const [editing, setEditing] = useState<Draft | null>(null);
  const saved = () => {
    setEditing(null);
    void queryClient.invalidateQueries({ queryKey: ['admin', 'faqs'] });
    void queryClient.invalidateQueries({ queryKey: ['faqs'] });
  };
  return (
    <section className="flex flex-col gap-6">
      <Seo title={`${t('admin.faqs.title')} — ${t('admin.title')}`} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-h1">{t('admin.faqs.title')}</h1>
        <Button onClick={() => setEditing(EMPTY)}>{t('admin.faqs.new')}</Button>
      </div>
      {editing ? (
        <FaqEditor key={editing.slug || 'new'} initial={editing} onSaved={saved} />
      ) : faqs.isPending ? (
        <Skeleton className="h-64" />
      ) : faqs.isError ? (
        <ErrorState onRetry={() => void faqs.refetch()} />
      ) : (
        <table className="w-full text-left">
          <thead className="text-sm text-muted">
            <tr>
              <th className="p-2">{t('admin.faqs.question')}</th>
              <th className="p-2">{t('admin.faqs.category')}</th>
              <th className="p-2">{t('admin.faqs.stats')}</th>
              <th className="p-2">
                <span className="sr-only">{t('admin.faqs.edit')}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {faqs.data.items.map((faq) => (
              <tr key={faq.slug} className="border-t border-border">
                <td className="p-2">
                  {faq.question}
                  {faq.published ? null : (
                    <span className="ml-2 text-sm text-muted">({t('admin.faqs.draft')})</span>
                  )}
                </td>
                <td className="p-2">{t(`help.categories.${faq.category}`)}</td>
                <td className="p-2 text-sm">
                  {t('admin.faqs.votes', { yes: faq.helpfulYes, no: faq.helpfulNo })}
                </td>
                <td className="p-2">
                  <Button size="sm" variant="secondary" onClick={() => setEditing(faq)}>
                    {t('admin.faqs.edit')}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
