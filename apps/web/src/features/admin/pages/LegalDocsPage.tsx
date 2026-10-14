import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { LEGAL_DOC_SLUGS, type LegalDocSlug } from '@tinhome/shared/constants';
import { ErrorState } from '@/components/ErrorState';
import { Seo } from '@/components/Seo';
import { Skeleton } from '@/components/Skeleton';
import { TextField } from '@/components/TextField';
import { Button } from '@/components/ui/button';
import { SafeMarkdown } from '@/features/legal';
import { toUserMessage } from '@/lib/app-error';
import { adminGetLegalDoc, adminPublishLegalDoc } from '@/lib/callables';
import { formatInstant } from '@/lib/format';

function Editor({
  slug,
  markdown,
  onPublished,
}: {
  slug: LegalDocSlug;
  markdown: string;
  onPublished: () => void;
}) {
  const { t } = useTranslation();
  const [text, setText] = useState(markdown);
  const [summary, setSummary] = useState('');
  const [reaccept, setReaccept] = useState(false);
  const publish = useMutation({
    mutationFn: () =>
      adminPublishLegalDoc({
        slug,
        markdown: text,
        requiresReacceptance: reaccept,
        changeSummary: summary.trim(),
      }),
    onSuccess: ({ version }) => {
      toast.success(t('admin.legal.published', { version }));
      onPublished();
    },
    onError: (error) => toast.error(toUserMessage(t, error)),
  });
  return (
    <form
      className="grid gap-4 lg:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        publish.mutate();
      }}
    >
      <div className="flex flex-col gap-3">
        <label htmlFor="legal-markdown" className="font-semibold">
          {t('admin.legal.markdown')}
        </label>
        <textarea
          id="legal-markdown"
          className="min-h-96 rounded-md border border-border bg-surface p-3 font-mono text-sm"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <TextField
          label={t('admin.legal.summary')}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
        />
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            className="size-5 accent-primary"
            checked={reaccept}
            onChange={(e) => setReaccept(e.target.checked)}
          />
          {t('admin.legal.reaccept')}
        </label>
        <p className="text-sm text-muted">{t('admin.legal.warning')}</p>
        <Button
          type="submit"
          className="self-start"
          disabled={publish.isPending || summary.trim().length < 5 || text.trim().length < 50}
        >
          {t('admin.legal.publish')}
        </Button>
      </div>
      <section aria-labelledby="legal-preview" className="rounded-lg border border-border p-4">
        <h2 id="legal-preview" className="text-h3">
          {t('admin.faqs.preview')}
        </h2>
        <SafeMarkdown markdown={text} />
      </section>
    </form>
  );
}

/** UX §9 / FR-56 — publish a new version of a legal text (superadmin). Versions are immutable. */
export function LegalDocsPage() {
  const { t } = useTranslation();
  const [slug, setSlug] = useState<LegalDocSlug>('terminos');
  const doc = useQuery({
    queryKey: ['admin', 'legal', slug],
    queryFn: () => adminGetLegalDoc({ slug }),
  });
  return (
    <section className="flex flex-col gap-4">
      <Seo title={`${t('admin.legal.title')} — ${t('admin.title')}`} />
      <h1 className="text-h1">{t('admin.legal.title')}</h1>
      <label className="flex max-w-sm flex-col gap-1">
        <span className="font-semibold">{t('admin.legal.doc')}</span>
        <select
          className="min-h-11 rounded-md border border-border bg-surface px-3"
          value={slug}
          onChange={(e) => setSlug(e.target.value as LegalDocSlug)}
        >
          {LEGAL_DOC_SLUGS.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>
      {doc.isPending ? (
        <Skeleton className="h-96" />
      ) : doc.isError ? (
        <ErrorState onRetry={() => void doc.refetch()} />
      ) : (
        <>
          <p className="text-sm text-muted">
            {t('admin.legal.current', { version: doc.data.currentVersion ?? '—' })}
          </p>
          <Editor
            key={`${slug}-${doc.data.currentVersion ?? ''}`}
            slug={slug}
            markdown={doc.data.markdown}
            onPublished={() => void doc.refetch()}
          />
          <section aria-labelledby="legal-versions">
            <h2 id="legal-versions" className="text-h3">
              {t('admin.legal.versions')}
            </h2>
            <ul className="text-sm">
              {doc.data.versions.map((version) => (
                <li key={version.version}>
                  {version.version} ·{' '}
                  {version.publishedAt ? formatInstant(new Date(version.publishedAt)) : '—'} ·{' '}
                  {version.changeSummary}
                  {version.requiresReacceptance ? ` · ${t('admin.legal.reacceptShort')}` : ''}
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </section>
  );
}
