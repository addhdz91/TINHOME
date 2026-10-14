import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, Download, ShieldCheck, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { GDPR_REQUEST_TYPES, type GdprRequestType } from '@tinhome/shared/constants';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { Seo } from '@/components/Seo';
import { Skeleton } from '@/components/Skeleton';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { ReauthForm } from '@/features/auth';
import { usePublicConfig } from '@/hooks/use-public-config';
import { toUserMessage } from '@/lib/app-error';
import { exportMyData, listMyGdprRequests, submitGdprRequest } from '@/lib/callables';
import { formatInstant } from '@/lib/format';

const DETAILS_MIN = 10;
const DETAILS_MAX = 2000;
const QUERY_KEY = ['gdpr', 'mine'];

/** FR-59 — JSON download after re-authenticating; the link lasts 15 minutes. */
function DownloadData() {
  const { t } = useTranslation();
  const [file, setFile] = useState<string | null>(null);
  return (
    <section aria-labelledby="privacy-download" className="flex flex-col gap-2">
      <h2 id="privacy-download" className="text-h3">
        {t('privacy.download.title')}
      </h2>
      <p className="text-muted">{t('privacy.download.body')}</p>
      {file ? (
        <div role="status" className="flex flex-col gap-2 rounded-md bg-brand-soft p-3">
          <p className="text-brand-text">{t('privacy.download.ready')}</p>
          <Button asChild className="self-start">
            <a href={file} download={t('privacy.download.fileName')}>
              <Download aria-hidden="true" />
              {t('privacy.download.again')}
            </a>
          </Button>
        </div>
      ) : (
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="secondary" className="self-start">
              <Download aria-hidden="true" />
              {t('privacy.download.button')}
            </Button>
          </DialogTrigger>
          <DialogContent
            title={t('privacy.download.title')}
            description={t('privacy.download.body')}
            closeLabel={t('common.close')}
          >
            <ReauthForm
              confirmLabel={t('privacy.download.confirm')}
              action={async () => {
                const result = await exportMyData({});
                setFile(result.url);
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </section>
  );
}

function NewRequest({ onSent }: { onSent: () => void }) {
  const { t } = useTranslation();
  const [type, setType] = useState<GdprRequestType>('ACCESS');
  const [details, setDetails] = useState('');
  const send = useMutation({
    mutationFn: () => submitGdprRequest({ type, details }),
    onSuccess: (result) => {
      toast.success(t('privacy.requests.sent', { date: formatInstant(new Date(result.dueAt)) }));
      setDetails('');
      onSent();
    },
    onError: (error) => toast.error(toUserMessage(t, error)),
  });
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        send.mutate();
      }}
    >
      <label className="flex flex-col gap-1">
        <span className="font-semibold">{t('privacy.requests.type')}</span>
        <select
          className="min-h-11 rounded-md border border-border bg-surface px-3"
          value={type}
          onChange={(e) => setType(e.target.value as GdprRequestType)}
        >
          {GDPR_REQUEST_TYPES.map((option) => (
            <option key={option} value={option}>
              {t(`privacy.types.${option}`)}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="font-semibold">{t('privacy.requests.details')}</span>
        <textarea
          className="min-h-28 rounded-md border border-border bg-surface p-3"
          value={details}
          maxLength={DETAILS_MAX}
          aria-describedby="gdpr-details-hint"
          onChange={(e) => setDetails(e.target.value)}
        />
        <span id="gdpr-details-hint" className="text-sm text-muted">
          {t('privacy.requests.detailsHint')}
        </span>
      </label>
      <Button
        type="submit"
        className="self-start"
        disabled={send.isPending || details.trim().length < DETAILS_MIN}
      >
        {t('privacy.requests.send')}
      </Button>
    </form>
  );
}

function Requests() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const list = useQuery({ queryKey: QUERY_KEY, queryFn: () => listMyGdprRequests({}) });
  let content;
  if (list.isPending) content = <Skeleton className="h-24" />;
  else if (list.isError) content = <ErrorState onRetry={() => void list.refetch()} />;
  else if (list.data.items.length === 0)
    content = <EmptyState headingLevel={3} title={t('privacy.requests.empty')} />;
  else
    content = (
      <ul className="flex flex-col gap-2">
        {list.data.items.map((request) => (
          <li key={request.id} className="flex flex-col gap-1 rounded-md border border-border p-3">
            <span className="font-semibold">
              {t(`privacy.types.${request.type}`)} · {t(`privacy.status.${request.status}`)}
            </span>
            <span className="text-sm text-muted">
              {formatInstant(new Date(request.createdAt))}
              {request.status === 'OPEN'
                ? ` · ${t('privacy.requests.due', { date: formatInstant(new Date(request.dueAt)) })}`
                : ''}
            </span>
            {request.note ? (
              <p className="text-sm break-words">
                {t('privacy.requests.answer', { note: request.note })}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    );
  return (
    <section aria-labelledby="privacy-requests" className="flex flex-col gap-3">
      <h2 id="privacy-requests" className="text-h3">
        {t('privacy.requests.title')}
      </h2>
      {content}
      <details className="rounded-md border border-border p-3">
        <summary className="min-h-11 cursor-pointer content-center font-semibold">
          {t('privacy.requests.new')}
        </summary>
        <div className="pt-3">
          <NewRequest onSent={() => void queryClient.invalidateQueries({ queryKey: QUERY_KEY })} />
        </div>
      </details>
      <p className="text-sm text-muted">{t('privacy.aepd')}</p>
    </section>
  );
}

/** UX §5 Ajustes › Privacidad — download my data, GDPR requests, accepted texts, deletion. */
export function PrivacyPage() {
  const { t } = useTranslation();
  const config = usePublicConfig();
  const linkClass =
    'flex min-h-11 items-center justify-between rounded-md border border-border bg-surface px-4 font-semibold hover:bg-surface-muted';
  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-6 py-4">
      <Seo title={`${t('privacy.title')} — TinHome`} />
      <header className="flex flex-col gap-2">
        <h1 className="text-h1">{t('privacy.title')}</h1>
        <p className="text-muted">
          {t('privacy.intro', { days: config.data?.gdprResponseDays ?? 30 })}
        </p>
      </header>
      <DownloadData />
      <Requests />
      <section aria-labelledby="privacy-accepted" className="flex flex-col gap-2">
        <h2 id="privacy-accepted" className="text-h3">
          {t('privacy.accepted.title')}
        </h2>
        <p className="text-muted">{t('privacy.accepted.body')}</p>
        <Link to="/legal/terminos" className={linkClass}>
          <span className="flex items-center gap-3">
            <ShieldCheck aria-hidden="true" className="size-5" />
            {t('privacy.accepted.terms')}
          </span>
          <ChevronRight aria-hidden="true" className="size-5 text-muted" />
        </Link>
        <Link to="/legal/privacidad" className={linkClass}>
          <span className="flex items-center gap-3">
            <ShieldCheck aria-hidden="true" className="size-5" />
            {t('privacy.accepted.policy')}
          </span>
          <ChevronRight aria-hidden="true" className="size-5 text-muted" />
        </Link>
      </section>
      <section aria-labelledby="privacy-deletion" className="flex flex-col gap-2">
        <h2 id="privacy-deletion" className="text-h3">
          {t('privacy.deletion.title')}
        </h2>
        <p className="text-muted">{t('privacy.deletion.body')}</p>
        <Link to="/app/baja" className={linkClass}>
          <span className="flex items-center gap-3 text-danger">
            <Trash2 aria-hidden="true" className="size-5" />
            {t('privacy.deletion.link')}
          </span>
          <ChevronRight aria-hidden="true" className="size-5 text-muted" />
        </Link>
      </section>
    </section>
  );
}
