import { useMutation } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { toast } from 'sonner';
import type { ConsentRecordView } from '@tinhome/shared/schemas';
import { EmptyState } from '@/components/EmptyState';
import { ScrollRegion } from '@/components/ScrollRegion';
import { Seo } from '@/components/Seo';
import { TextField } from '@/components/TextField';
import { Button } from '@/components/ui/button';
import { toUserMessage } from '@/lib/app-error';
import { adminListConsents } from '@/lib/callables';

type By = 'email' | 'uid';

const COLUMNS = [
  'when',
  'doc',
  'version',
  'source',
  'text',
  'provider',
  'ip',
  'agent',
  'hash',
] as const;

function download(items: ConsentRecordView[], fileName: string) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

/** BR-35 — evidence of legal acceptances by e-mail or account (superadmin, audited). */
export function ConsentsPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const [by, setBy] = useState<By>(params.get('uid') ? 'uid' : 'email');
  const [query, setQuery] = useState(params.get('uid') ?? '');
  const search = useMutation({
    mutationFn: () =>
      adminListConsents(by === 'uid' ? { uid: query.trim() } : { email: query.trim() }),
    onError: (error) => toast.error(toUserMessage(t, error)),
  });
  const items = search.data?.items;
  return (
    <section className="flex flex-col gap-4">
      <Seo title={`${t('admin.consents.title')} — ${t('admin.title')}`} />
      <h1 className="text-h1">{t('admin.consents.title')}</h1>
      <p className="text-muted">{t('admin.consents.intro')}</p>
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (query.trim()) search.mutate();
        }}
      >
        <label className="flex flex-col gap-1">
          <span className="font-semibold">{t('admin.consents.by')}</span>
          <select
            className="min-h-11 rounded-md border border-border bg-surface px-3"
            value={by}
            onChange={(event) => setBy(event.target.value === 'uid' ? 'uid' : 'email')}
          >
            <option value="email">{t('admin.consents.byEmail')}</option>
            <option value="uid">{t('admin.consents.byUid')}</option>
          </select>
        </label>
        <div className="min-w-64 flex-1">
          <TextField
            label={t('admin.consents.query')}
            type={by === 'email' ? 'email' : 'text'}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <Button type="submit" disabled={search.isPending || !query.trim()}>
          {t('admin.consents.search')}
        </Button>
      </form>
      {items?.length === 0 ? (
        <EmptyState headingLevel={2} title={t('admin.consents.empty')} />
      ) : null}
      {items && items.length > 0 ? (
        <>
          <Button
            variant="secondary"
            className="self-start"
            onClick={() => download(items, t('admin.consents.fileName'))}
          >
            <Download aria-hidden="true" />
            {t('admin.consents.download')}
          </Button>
          <ScrollRegion label={t('common.tableRegion')}>
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="text-muted">
                <tr>
                  {COLUMNS.map((col) => (
                    <th key={col} scope="col" className="p-2">
                      {t(`admin.consents.cols.${col}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-t border-border align-top">
                    <td className="p-2 whitespace-nowrap">{item.acceptedAt ?? '—'}</td>
                    <td className="p-2">
                      {item.slug
                        ? t(`legal.docs.${item.slug}`, { defaultValue: item.slug })
                        : item.type}
                    </td>
                    <td className="p-2">{item.version}</td>
                    <td className="p-2">
                      {item.source
                        ? t(`admin.consents.sources.${item.source}`)
                        : t('admin.consents.legacy')}
                    </td>
                    <td className="p-2">{item.consentText ?? '—'}</td>
                    <td className="p-2">{item.authProvider ?? '—'}</td>
                    <td className="p-2">{item.ipTruncated ?? '—'}</td>
                    <td className="max-w-48 p-2 break-words">{item.userAgent ?? '—'}</td>
                    <td className="max-w-40 p-2 font-mono text-xs break-all">
                      {item.contentHash ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollRegion>
        </>
      ) : null}
    </section>
  );
}
