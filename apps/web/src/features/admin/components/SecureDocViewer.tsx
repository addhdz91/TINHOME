import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { VerificationFile } from '@tinhome/shared/constants';
import { ErrorState } from '@/components/ErrorState';
import { Skeleton } from '@/components/Skeleton';
import { adminGetVerificationFileUrl } from '@/lib/callables';
import { cn } from '@/lib/utils';

function dataUrlToBlob(url: string): Blob {
  const [header = '', base64 = ''] = url.split(',');
  const type = /^data:([^;]+)/.exec(header)?.[1] ?? 'application/octet-stream';
  const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  return new Blob([bytes], { type });
}

/** `data:` URLs (emulator) become blob URLs so PDFs render inside the page in every browser. */
function useViewableUrl(url: string | undefined): string | null {
  const viewable = useMemo(
    () => (url?.startsWith('data:') ? URL.createObjectURL(dataUrlToBlob(url)) : (url ?? null)),
    [url],
  );
  useEffect(
    () => () => {
      if (viewable?.startsWith('blob:')) URL.revokeObjectURL(viewable);
    },
    [viewable],
  );
  return viewable;
}

/**
 * BR-24 / FR-09 — secure viewer: each opening asks the server for a 5-minute URL (audited),
 * the image carries a visible watermark with the reviewer and date, and there is no
 * download button, context menu or dragging. Visual comparison only (no facial recognition).
 */
export function SecureDocViewer({
  verificationId,
  files,
  reviewer,
}: {
  verificationId: string;
  files: VerificationFile[];
  reviewer: string;
}) {
  const { t } = useTranslation();
  const [active, setActive] = useState<VerificationFile | undefined>(files[0]);
  const file = useQuery({
    queryKey: ['admin', 'verification-file', verificationId, active],
    enabled: active !== undefined,
    staleTime: 4 * 60_000,
    gcTime: 4 * 60_000,
    queryFn: () => adminGetVerificationFileUrl({ id: verificationId, file: active ?? 'idFront' }),
  });
  const url = useViewableUrl(file.data?.url);
  const watermark = t('admin.detail.watermark', {
    admin: reviewer,
    date: new Date().toLocaleString('es-ES'),
  });

  return (
    <div className="flex flex-col gap-3">
      <div role="tablist" aria-label={t('admin.detail.files')} className="flex flex-wrap gap-2">
        {files.map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={key === active}
            onClick={() => setActive(key)}
            className={cn(
              'min-h-11 rounded-md border px-3 text-sm font-semibold',
              key === active ? 'border-primary bg-brand-soft text-brand-text' : 'border-border',
            )}
          >
            {t(`verification.files.${key}`)}
          </button>
        ))}
      </div>
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- only blocks the context menu (no download) */}
      <div
        role="tabpanel"
        className="relative flex min-h-96 items-center justify-center overflow-hidden rounded-lg border border-border bg-surface-muted select-none"
        onContextMenu={(event) => event.preventDefault()}
      >
        {file.isPending || (file.isSuccess && !url) ? (
          <Skeleton className="h-96 w-full" />
        ) : file.isError ? (
          <ErrorState onRetry={() => void file.refetch()} />
        ) : file.data.contentType === 'application/pdf' ? (
          <div className="flex w-full flex-col gap-2">
            <p className="px-3 pt-3 text-sm text-muted">{t('admin.detail.pdfNote')}</p>
            <object
              data={`${url ?? ''}#toolbar=0&navpanes=0`}
              type="application/pdf"
              aria-label={t(`verification.files.${active ?? 'idFront'}`)}
              className="h-[70vh] w-full"
            />
          </div>
        ) : (
          <img
            src={url ?? ''}
            alt={t(`verification.files.${active ?? 'idFront'}`)}
            draggable={false}
            className="max-h-[70vh] w-auto object-contain"
          />
        )}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex flex-wrap content-around justify-around gap-8 overflow-hidden p-4 text-sm font-semibold text-text opacity-25"
        >
          {Array.from({ length: 12 }, (_, i) => (
            <span key={i} className="-rotate-12 whitespace-nowrap">
              {watermark}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
