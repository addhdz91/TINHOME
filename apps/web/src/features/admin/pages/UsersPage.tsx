import { useQuery } from '@tanstack/react-query';
import { Search, Users } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { Seo } from '@/components/Seo';
import { Skeleton } from '@/components/Skeleton';
import { Button } from '@/components/ui/button';
import { adminSearchUsers } from '@/lib/callables';

/** UX §9 / FR-50 — search users by name, e-mail or phone. */
export function UsersPage() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const [draft, setDraft] = useState(q);
  const results = useQuery({
    queryKey: ['admin', 'users', q],
    enabled: q.trim().length >= 2,
    queryFn: () => adminSearchUsers({ q, limit: 50 }),
  });
  let content;
  if (q.trim().length < 2) content = <p className="text-muted">{t('admin.users.hint')}</p>;
  else if (results.isPending) content = <Skeleton className="h-48" />;
  else if (results.isError) content = <ErrorState onRetry={() => void results.refetch()} />;
  else if (results.data.items.length === 0)
    content = <EmptyState icon={<Users />} title={t('admin.users.empty')} />;
  else
    content = (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left">
          <thead className="text-sm text-muted">
            <tr>
              <th className="p-2">{t('admin.users.name')}</th>
              <th className="p-2">{t('admin.users.email')}</th>
              <th className="p-2">{t('admin.users.status')}</th>
              <th className="p-2">{t('admin.users.identity')}</th>
              <th className="p-2">
                <span className="sr-only">{t('admin.reports.open')}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {results.data.items.map((user) => (
              <tr key={user.uid} className="border-t border-border">
                <td className="p-2 font-semibold">{user.displayName}</td>
                <td className="p-2 text-sm break-all">{user.email ?? '—'}</td>
                <td className="p-2">{t(`admin.users.statuses.${user.status}`)}</td>
                <td className="p-2">{t(`admin.users.identities.${user.identity}`)}</td>
                <td className="p-2">
                  <Button asChild size="sm" variant="secondary">
                    <Link to={`/admin/usuarios/${user.uid}`}>{t('admin.reports.open')}</Link>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  return (
    <section className="flex flex-col gap-6">
      <Seo title={`${t('admin.users.title')} — ${t('admin.title')}`} />
      <h1 className="text-h1">{t('admin.users.title')}</h1>
      <form
        role="search"
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          setParams(draft.trim() ? { q: draft.trim() } : {});
        }}
      >
        <label htmlFor="admin-user-search" className="sr-only">
          {t('admin.users.search')}
        </label>
        <input
          id="admin-user-search"
          type="search"
          className="min-h-11 flex-1 rounded-md border border-border bg-surface px-3"
          placeholder={t('admin.users.search')}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        <Button type="submit" aria-label={t('admin.users.search')}>
          <Search aria-hidden="true" />
        </Button>
      </form>
      {content}
    </section>
  );
}
