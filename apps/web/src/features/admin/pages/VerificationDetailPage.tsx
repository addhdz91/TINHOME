import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import { toast } from 'sonner';
import type { VerificationDecision } from '@tinhome/shared/constants';
import { useAuth } from '@/app/auth/auth-context';
import { ErrorState } from '@/components/ErrorState';
import { Seo } from '@/components/Seo';
import { Skeleton } from '@/components/Skeleton';
import { Button } from '@/components/ui/button';
import { toUserMessage } from '@/lib/app-error';
import { adminDecideVerification, adminGetVerification } from '@/lib/callables';
import { SecureDocViewer } from '../components/SecureDocViewer';

function isTyping(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

/** UX §9 — verification detail: secure viewer on the left, declared data and actions on the right. */
export function VerificationDetailPage() {
  const { t } = useTranslation();
  const { id = '' } = useParams();
  const { state } = useAuth();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<VerificationDecision | null>(null);
  const [text, setText] = useState('');
  const [fraud, setFraud] = useState(false);
  const detail = useQuery({
    queryKey: ['admin', 'verification', id],
    queryFn: () => adminGetVerification({ id }),
  });
  const pending = detail.data?.verification.status === 'PENDING';

  const decide = useMutation({
    mutationFn: (decision: VerificationDecision) =>
      adminDecideVerification({
        id,
        decision,
        fraudSuspicion: fraud,
        ...(decision === 'REJECT' ? { reason: text } : {}),
        ...(decision === 'REQUEST_INFO' ? { infoRequest: text } : {}),
      }),
    onSuccess: async () => {
      toast.success(t('admin.detail.decided'));
      setMode(null);
      setText('');
      await queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
  });

  useEffect(() => {
    if (!pending) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (isTyping(event.target) || event.metaKey || event.ctrlKey || event.altKey) return;
      const key = event.key.toLowerCase();
      if (key === 'a') setMode('APPROVE');
      else if (key === 'r') setMode('REJECT');
      else if (key === 'i') setMode('REQUEST_INFO');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pending]);

  if (detail.isPending) return <Skeleton className="h-[70vh]" />;
  if (detail.isError) return <ErrorState onRetry={() => void detail.refetch()} />;
  const { verification, user, home, duplicateUser } = detail.data;
  const reviewer =
    state.status === 'signedIn' || state.status === 'needsProfile'
      ? (state.user.email ?? state.user.uid)
      : '';
  const needsText = mode === 'REJECT' || mode === 'REQUEST_INFO';

  return (
    <section className="flex flex-col gap-6">
      <Seo title={`${t('admin.verifications.title')} — ${t('admin.title')}`} />
      <Link
        to="/admin/verificaciones"
        className="inline-flex min-h-11 items-center gap-2 font-semibold text-link"
      >
        <ArrowLeft aria-hidden="true" className="size-5" />
        {t('admin.detail.back')}
      </Link>
      <h1 className="text-h1">{t('admin.detail.title', { name: verification.displayName })}</h1>
      {duplicateUser ? (
        <p
          role="alert"
          className="flex items-center gap-2 rounded-md border border-danger p-3 font-semibold"
        >
          <AlertTriangle aria-hidden="true" className="size-5 text-danger" />
          {t('admin.detail.duplicateAlert', { name: duplicateUser.displayName })}
        </p>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div>
          {verification.filesPurged ? (
            <p className="rounded-md bg-surface-muted p-4">{t('admin.detail.purged')}</p>
          ) : (
            <SecureDocViewer
              verificationId={verification.id}
              files={verification.files}
              reviewer={reviewer}
            />
          )}
        </div>
        <div className="flex flex-col gap-6">
          <section aria-labelledby="declared" className="flex flex-col gap-2">
            <h2 id="declared" className="text-h2">
              {t('admin.detail.declared')}
            </h2>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
              <dt className="text-muted">{t('admin.detail.fullName')}</dt>
              <dd>{`${user.firstName} ${user.lastName}`}</dd>
              <dt className="text-muted">{t('admin.detail.birthDate')}</dt>
              <dd>{user.birthDate}</dd>
              <dt className="text-muted">{t('admin.detail.email')}</dt>
              <dd className="break-all">{user.email}</dd>
              <dt className="text-muted">{t('admin.detail.city')}</dt>
              <dd>{user.cityId ?? '—'}</dd>
              <dt className="text-muted">{t('admin.detail.tenure')}</dt>
              <dd>{t(`home.tenures.${verification.tenure}`)}</dd>
              <dt className="text-muted">{t('admin.detail.propertyDoc')}</dt>
              <dd>{t(`verification.propertyDocs.${verification.propertyDocType}`)}</dd>
              <dt className="text-muted">{t('admin.detail.home')}</dt>
              <dd>
                {home ? `${home.title ?? '—'} · ${home.zone ?? ''}` : t('admin.detail.noHome')}
              </dd>
            </dl>
          </section>
          {pending ? (
            <section aria-labelledby="actions" className="flex flex-col gap-3">
              <h2 id="actions" className="sr-only">
                {t('admin.detail.confirm')}
              </h2>
              <p className="text-sm text-muted">{t('admin.detail.shortcuts')}</p>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => setMode('APPROVE')} aria-keyshortcuts="A">
                  {t('admin.detail.approve')}
                </Button>
                <Button variant="danger" onClick={() => setMode('REJECT')} aria-keyshortcuts="R">
                  {t('admin.detail.reject')}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setMode('REQUEST_INFO')}
                  aria-keyshortcuts="I"
                >
                  {t('admin.detail.requestInfo')}
                </Button>
              </div>
              {mode ? (
                <form
                  className="flex flex-col gap-3 rounded-md border border-border p-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    decide.mutate(mode);
                  }}
                >
                  {needsText ? (
                    <>
                      <label htmlFor="decision-text" className="font-semibold">
                        {mode === 'REJECT'
                          ? t('admin.detail.reason')
                          : t('admin.detail.infoRequest')}
                      </label>
                      <textarea
                        id="decision-text"
                        rows={3}
                        maxLength={1000}
                        value={text}
                        // eslint-disable-next-line jsx-a11y/no-autofocus -- opened on purpose by the reviewer
                        autoFocus
                        onChange={(event) => setText(event.target.value)}
                        className="rounded-md border border-border bg-surface p-3 text-text"
                      />
                    </>
                  ) : (
                    <p className="font-semibold">{t('admin.detail.approve')}</p>
                  )}
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="size-5 accent-primary"
                      checked={fraud}
                      onChange={(event) => setFraud(event.target.checked)}
                    />
                    {t('admin.detail.fraud')}
                  </label>
                  {decide.isError ? (
                    <p role="alert" className="text-sm font-semibold text-danger">
                      {toUserMessage(t, decide.error)}
                    </p>
                  ) : null}
                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      disabled={decide.isPending || (needsText && text.trim().length === 0)}
                    >
                      {t('admin.detail.confirm')}
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => setMode(null)}>
                      {t('admin.detail.cancel')}
                    </Button>
                  </div>
                </form>
              ) : null}
            </section>
          ) : (
            <p className="rounded-md bg-surface-muted p-3 font-semibold">
              {t('admin.detail.status', {
                status: t(`admin.verifications.statuses.${verification.status}`),
              })}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
