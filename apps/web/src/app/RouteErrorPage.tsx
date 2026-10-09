import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { isRouteErrorResponse, Link, useRouteError } from 'react-router';
import { Button } from '@/components/ui/button';
import { NotFoundPage } from './NotFoundPage';

/** 06_CODING_STANDARDS.md §8 — friendly per-route error boundary with «Reintentar». */
export function RouteErrorPage() {
  const { t } = useTranslation();
  const error = useRouteError();

  useEffect(() => {
    if (isRouteErrorResponse(error)) return;
    void import('@sentry/react').then((Sentry) => Sentry.captureException(error));
  }, [error]);

  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundPage />;

  return (
    <section
      role="alert"
      className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-16 text-center"
    >
      <h1 className="text-h1">{t('routeError.title')}</h1>
      <p className="text-muted">{t('routeError.body')}</p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button onClick={() => window.location.reload()}>{t('routeError.retry')}</Button>
        <Button variant="secondary" asChild>
          <Link to="/">{t('routeError.home')}</Link>
        </Button>
      </div>
    </section>
  );
}
