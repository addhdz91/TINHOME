import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router';
import { ErrorState } from '@/components/ErrorState';
import { Seo } from '@/components/Seo';
import { Skeleton } from '@/components/Skeleton';
import { adminGetReport } from '@/lib/callables';
import { formatInstant, formatTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { ModerationForm } from '../components/ModerationForm';
import { relativeAge } from '../lib/format';

/** UX §9 — report detail: snapshot, implicated messages, history and active strikes, decision. */
export function ReportDetailPage() {
  const { t } = useTranslation();
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const detail = useQuery({
    queryKey: ['admin', 'report', id],
    queryFn: () => adminGetReport({ id }),
  });
  if (detail.isPending) return <Skeleton className="h-96" />;
  if (detail.isError) return <ErrorState onRetry={() => void detail.refetch()} />;
  const { report, targetUserHistory: history } = detail.data;
  return (
    <section className="flex flex-col gap-6">
      <Seo title={`${t('admin.reports.detail')} — ${t('admin.title')}`} />
      <Link to="/admin/denuncias" className="text-sm font-semibold text-link underline">
        {t('admin.reports.back')}
      </Link>
      <header className="flex flex-col gap-1">
        <h1 className="text-h1">
          {t(`report.reasons.${report.reason}`)} · {t(`admin.reports.targets.${report.targetType}`)}
        </h1>
        <p className="text-sm text-muted">
          {t(`admin.reports.priorities.${report.priority}`)} · {t('admin.reports.due')}{' '}
          {relativeAge(report.dueAt)} · {t(`admin.reports.statuses.${report.status}`)}
        </p>
      </header>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <section
            aria-labelledby="report-description"
            className="rounded-lg border border-border p-4"
          >
            <h2 id="report-description" className="text-h3">
              {t('admin.reports.description')}
            </h2>
            <p className="break-words whitespace-pre-wrap">{report.description}</p>
            {report.targetUrl ? <p className="text-sm break-all">{report.targetUrl}</p> : null}
            <p className="text-sm text-muted">
              {t('admin.reports.attachments', { count: report.attachmentCount })}
            </p>
          </section>
          <section
            aria-labelledby="report-snapshot"
            className="flex flex-col gap-2 rounded-lg border border-border p-4"
          >
            <h2 id="report-snapshot" className="text-h3">
              {t('admin.reports.snapshot')}
            </h2>
            {report.snapshot.title ? (
              <p className="font-semibold">{report.snapshot.title}</p>
            ) : null}
            {report.snapshot.text ? <p className="break-words">{report.snapshot.text}</p> : null}
            {report.snapshot.photoUrls.length ? (
              <ul className="grid grid-cols-4 gap-2">
                {report.snapshot.photoUrls.map((url) => (
                  <li key={url}>
                    <img src={url} alt="" className="aspect-square w-full rounded object-cover" />
                  </li>
                ))}
              </ul>
            ) : null}
            {report.snapshot.messages.length ? (
              <ol aria-label={t('admin.reports.messages')} className="flex flex-col gap-1">
                {report.snapshot.messages.map((message) => (
                  <li
                    key={message.id}
                    className={cn(
                      'rounded-md p-2 text-sm',
                      message.reported ? 'border-2 border-danger' : 'bg-surface-muted',
                    )}
                  >
                    <span className="font-semibold">
                      {message.senderUid === report.targetUid
                        ? t('admin.reports.reportedPerson')
                        : t('admin.reports.otherPerson')}
                    </span>
                    {message.createdAt ? ` · ${formatTime(new Date(message.createdAt))}` : ''}
                    {message.reported ? ` · ${t('admin.reports.reportedMessage')}` : ''}
                    <p className="break-words">{message.text}</p>
                  </li>
                ))}
              </ol>
            ) : null}
          </section>
          <section
            aria-labelledby="report-history"
            className="flex flex-col gap-2 rounded-lg border border-border p-4"
          >
            <h2 id="report-history" className="text-h3">
              {t('admin.reports.history', { name: history.displayName })}
            </h2>
            <p>
              {t('admin.reports.historyLine', {
                status: history.status,
                strikes: history.strikesActive,
                open: history.openReports,
              })}
            </p>
            {history.hold ? (
              <p className="text-warning">
                {t('admin.reports.onHold', { reason: history.hold.reason })}
              </p>
            ) : null}
            <ul className="flex flex-col gap-1 text-sm">
              {history.actions.map((action) => (
                <li key={action.id}>
                  {formatInstant(new Date(action.createdAt))} ·{' '}
                  {t(`admin.moderation.actions.${action.action}`)}
                  {action.appeal ? ` · ${t(`standing.appealStatus.${action.appeal.status}`)}` : ''}
                </li>
              ))}
            </ul>
          </section>
        </div>
        {report.status === 'OPEN' ? (
          <ModerationForm
            reportId={report.id}
            targetType={report.targetType}
            targetId={report.targetId}
            targetUid={report.targetUid}
            onDone={() => void navigate('/admin/denuncias')}
          />
        ) : (
          <p className="rounded-lg border border-border p-4">{t('admin.reports.closed')}</p>
        )}
      </div>
    </section>
  );
}
