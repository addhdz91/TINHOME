import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import { toast } from 'sonner';
import { ADMIN_ROLES, type AdminRole } from '@tinhome/shared/constants';
import { ErrorState } from '@/components/ErrorState';
import { Seo } from '@/components/Seo';
import { Skeleton } from '@/components/Skeleton';
import { TextField } from '@/components/TextField';
import { Button } from '@/components/ui/button';
import { toUserMessage } from '@/lib/app-error';
import { adminGetUser, adminGrantPremium, adminSetRole } from '@/lib/callables';
import { formatInstant } from '@/lib/format';
import { ModerationForm } from '../components/ModerationForm';
import { useIsSuperadmin } from '../lib/role';

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section
      aria-labelledby={id}
      className="flex flex-col gap-2 rounded-lg border border-border p-4"
    >
      <h2 id={id} className="text-h3">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** UX §9 / FR-50 — full record and actions: Premium, status (with statement), role. */
export function UserDetailPage() {
  const { t } = useTranslation();
  const { uid = '' } = useParams();
  const superadmin = useIsSuperadmin();
  const queryClient = useQueryClient();
  const record = useQuery({
    queryKey: ['admin', 'user', uid],
    queryFn: () => adminGetUser({ uid }),
  });
  const [days, setDays] = useState('30');
  const [reason, setReason] = useState('');
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['admin', 'user', uid] });
  const grant = useMutation({
    mutationFn: () => adminGrantPremium({ uid, days: Number(days), reason: reason.trim() }),
    onSuccess: () => {
      toast.success(t('admin.users.granted'));
      setReason('');
      refresh();
    },
    onError: (error) => toast.error(toUserMessage(t, error)),
  });
  const role = useMutation({
    mutationFn: (value: AdminRole | null) => adminSetRole({ uid, role: value }),
    onSuccess: () => {
      toast.success(t('admin.users.roleSaved'));
      refresh();
    },
    onError: (error) => toast.error(toUserMessage(t, error)),
  });
  if (record.isPending) return <Skeleton className="h-96" />;
  if (record.isError) return <ErrorState onRetry={() => void record.refetch()} />;
  const { user, home } = record.data;
  return (
    <section className="flex flex-col gap-4">
      <Seo title={`${user.displayName} — ${t('admin.title')}`} />
      <Link to="/admin/usuarios" className="text-sm font-semibold text-link underline">
        {t('admin.users.title')}
      </Link>
      <h1 className="text-h1">{user.displayName}</h1>
      <p className="text-sm text-muted break-all">
        {user.email ?? '—'} · {user.phoneE164 ?? '—'} · {t(`admin.users.statuses.${user.status}`)} ·{' '}
        {t(`admin.users.identities.${user.identity}`)} ·{' '}
        {t('admin.users.strikes', { count: user.strikesActive })}
      </p>
      {superadmin ? (
        <Link
          to={`/admin/consentimientos?uid=${encodeURIComponent(user.uid)}`}
          className="self-start text-sm font-semibold text-link underline"
        >
          {t('admin.users.consents')}
        </Link>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <Section id="user-home" title={t('admin.users.home')}>
            {home ? (
              <p>
                {home.title} · {home.status} ·{' '}
                {home.visible ? t('admin.users.visible') : t('admin.users.hidden')}
                {home.hold ? ` · ${t('admin.reports.onHold', { reason: home.hold })}` : ''}
              </p>
            ) : (
              <p className="text-muted">{t('admin.users.noHome')}</p>
            )}
            <p className="text-sm">
              {t('admin.users.matches', { count: record.data.matchesCount })}
            </p>
          </Section>
          <Section id="user-premium" title={t('admin.users.premium')}>
            <p>
              {user.premiumUntil
                ? t('admin.users.premiumUntil', {
                    date: formatInstant(new Date(user.premiumUntil)),
                  })
                : t('admin.users.noPremium')}
            </p>
            <ul className="text-sm">
              {record.data.entitlements.map((entitlement) => (
                <li key={entitlement.id}>
                  {t(`admin.home.sources.${entitlement.source}`)} ·{' '}
                  {formatInstant(new Date(entitlement.startsAt))} →{' '}
                  {formatInstant(new Date(entitlement.endsAt))}
                  {entitlement.revoked ? ` · ${t('admin.users.revoked')}` : ''}
                  {entitlement.reason ? ` · ${entitlement.reason}` : ''}
                </li>
              ))}
            </ul>
            <form
              className="flex flex-col gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                grant.mutate();
              }}
            >
              <TextField
                label={t('admin.users.days')}
                type="number"
                min={1}
                max={365}
                value={days}
                onChange={(event) => setDays(event.target.value)}
              />
              <TextField
                label={t('admin.users.reason')}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
              <Button
                type="submit"
                className="self-start"
                disabled={grant.isPending || reason.trim().length < 5 || !(Number(days) >= 1)}
              >
                {t('admin.users.grant')}
              </Button>
            </form>
          </Section>
          <Section id="user-reports" title={t('admin.users.reports')}>
            {record.data.reports.length === 0 ? (
              <p className="text-muted">{t('admin.users.none')}</p>
            ) : (
              <ul className="text-sm">
                {record.data.reports.map((report) => (
                  <li key={report.id}>
                    <Link to={`/admin/denuncias/${report.id}`} className="text-link underline">
                      {formatInstant(new Date(report.createdAt))} · {report.reason} ·{' '}
                      {report.status}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Section>
          <Section id="user-audit" title={t('admin.users.audit')}>
            <ul className="text-sm">
              {record.data.audit.map((entry) => (
                <li key={entry.id}>
                  {entry.createdAt ? formatInstant(new Date(entry.createdAt)) : '—'} ·{' '}
                  {entry.action} · {entry.actorRole}
                </li>
              ))}
            </ul>
          </Section>
          {superadmin ? (
            <Section id="user-role" title={t('admin.users.role')}>
              <label className="flex flex-col gap-1">
                <span className="font-semibold">{t('admin.users.role')}</span>
                <select
                  className="min-h-11 rounded-md border border-border bg-surface px-3"
                  value={user.role ?? ''}
                  disabled={role.isPending}
                  onChange={(event) => {
                    const value = ADMIN_ROLES.find((r) => r === event.target.value) ?? null;
                    role.mutate(value);
                  }}
                >
                  <option value="">{t('admin.users.roles.none')}</option>
                  {ADMIN_ROLES.map((value) => (
                    <option key={value} value={value}>
                      {t(`admin.users.roles.${value}`)}
                    </option>
                  ))}
                </select>
              </label>
            </Section>
          ) : null}
        </div>
        <ModerationForm
          targetType="USER"
          targetId={uid}
          targetUid={uid}
          defaultAction="WARN"
          onDone={refresh}
        />
      </div>
    </section>
  );
}
