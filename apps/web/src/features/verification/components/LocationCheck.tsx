import { useMutation } from '@tanstack/react-query';
import { CheckCircle2, Clock, MapPin, Smartphone } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { LocationResult } from '@tinhome/shared/constants';
import type { HomeOwnerView } from '@tinhome/shared/schemas';
import { QrCode } from '@/components/QrCode';
import { Button } from '@/components/ui/button';
import { useSetMyHome } from '@/features/home';
import { toAppError, toUserMessage } from '@/lib/app-error';
import { getMyHome, requestLocationReview, verifyHomeLocation } from '@/lib/callables';
import { isGeoProblem, isMobileDevice, readPosition, type GeoProblem } from '../lib/geolocation';

type Outcome = { result: LocationResult; distanceKm: number; attemptsLeft: number } | null;

/** C-xx `LocationCheck` (S-18, FR-63) — one reading at home; QR to continue on the phone. */
export function LocationCheck({ home, cityName }: { home: HomeOwnerView; cityName: string }) {
  const { t } = useTranslation();
  const setHome = useSetMyHome();
  const [desktopAnyway, setDesktopAnyway] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [problem, setProblem] = useState<GeoProblem | null>(null);
  const [note, setNote] = useState('');
  const mobile = isMobileDevice();

  const refresh = async () => setHome((await getMyHome({})).home);
  const verify = useMutation({
    mutationFn: async () => {
      setProblem(null);
      const reading = await readPosition();
      return verifyHomeLocation({ ...reading, isMobile: mobile });
    },
    onSuccess: async (result) => {
      setOutcome(result);
      await refresh();
    },
    onError: (error) => {
      if (isGeoProblem(error)) setProblem(error);
    },
  });
  const review = useMutation({
    mutationFn: () => requestLocationReview({ note }),
    onSuccess: refresh,
  });

  if (home.locationCheck === 'PASS' || home.locationCheck === 'MANUAL_APPROVED') {
    return (
      <p
        role="status"
        className="flex items-center gap-2 rounded-md bg-surface-muted p-4 font-semibold"
      >
        <CheckCircle2 aria-hidden="true" className="size-6 text-success" />
        {t('location.verified', { city: cityName })}
      </p>
    );
  }
  if (home.locationCheck === 'MANUAL_PENDING') {
    return (
      <p role="status" className="flex items-center gap-2 rounded-md bg-surface-muted p-4">
        <Clock aria-hidden="true" className="size-6 text-brand-text" />
        {t('location.reviewPending')}
      </p>
    );
  }

  const canRequestReview =
    home.locationCheck === 'FAIL' || home.locationCheck === 'MANUAL_REJECTED';
  const verifyError = verify.error && !isGeoProblem(verify.error) ? toAppError(verify.error) : null;

  return (
    <div className="flex flex-col gap-5">
      <p>{t('location.intro', { city: cityName })}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <section aria-labelledby="loc-kept" className="rounded-md border border-border p-3">
          <h2 id="loc-kept" className="text-h3">
            {t('location.keptTitle')}
          </h2>
          <p className="text-sm text-muted">{t('location.kept')}</p>
        </section>
        <section aria-labelledby="loc-not-kept" className="rounded-md border border-border p-3">
          <h2 id="loc-not-kept" className="text-h3">
            {t('location.notKeptTitle')}
          </h2>
          <p className="text-sm text-muted">{t('location.notKept')}</p>
        </section>
      </div>

      {!mobile && !desktopAnyway ? (
        <div className="flex flex-col items-start gap-3 rounded-md border border-border p-4">
          <p className="flex items-center gap-2 font-semibold">
            <Smartphone aria-hidden="true" className="size-5" />
            {t('location.desktopTitle')}
          </p>
          <p className="text-sm text-muted">{t('location.desktopBody')}</p>
          <div className="rounded-md bg-surface p-2">
            <QrCode
              value={`${window.location.origin}/app/verificacion/ubicacion`}
              label={t('location.qrLabel')}
            />
          </div>
          <Button variant="link" className="px-0" onClick={() => setDesktopAnyway(true)}>
            {t('location.desktopAnyway')}
          </Button>
        </div>
      ) : (
        <Button
          size="lg"
          className="self-start"
          disabled={verify.isPending}
          onClick={() => verify.mutate()}
        >
          <MapPin aria-hidden="true" />
          {verify.isPending ? t('location.checking') : t('location.verify')}
        </Button>
      )}

      <div aria-live="polite" className="flex flex-col gap-3">
        {problem ? (
          <p role="alert" className="rounded-md border border-warning p-3">
            {t(`location.problems.${problem}`)}
          </p>
        ) : null}
        {verifyError ? (
          <p role="alert" className="rounded-md border border-danger p-3">
            {toUserMessage(t, verifyError)}
          </p>
        ) : null}
        {outcome?.result === 'INACCURATE' ? (
          <div className="rounded-md border border-warning p-3">
            <p className="font-semibold">{t('location.inaccurateTitle')}</p>
            <p className="text-sm">{t('location.inaccurateTips')}</p>
          </div>
        ) : null}
        {outcome?.result === 'FAIL' ? (
          <p className="rounded-md border border-danger p-3">
            {t('location.failBody', { city: cityName, km: outcome.distanceKm })}
          </p>
        ) : null}
        {outcome && outcome.result !== 'PASS' ? (
          <p className="text-sm text-muted">
            {t('location.attemptsLeft', { count: outcome.attemptsLeft })}
          </p>
        ) : null}
      </div>

      {canRequestReview ? (
        <form
          className="flex flex-col gap-2 rounded-md border border-border p-4"
          onSubmit={(event) => {
            event.preventDefault();
            review.mutate();
          }}
        >
          <label htmlFor="loc-note" className="font-semibold">
            {t('location.reviewLabel')}
          </label>
          <p id="loc-note-hint" className="text-sm text-muted">
            {t('location.reviewHint')}
          </p>
          <textarea
            id="loc-note"
            aria-describedby="loc-note-hint"
            minLength={10}
            maxLength={500}
            rows={3}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="rounded-md border border-border bg-surface p-3 text-text"
          />
          {review.isError ? (
            <p role="alert" className="text-sm font-semibold text-danger">
              {toUserMessage(t, review.error)}
            </p>
          ) : null}
          <Button
            type="submit"
            variant="secondary"
            className="self-start"
            disabled={review.isPending || note.trim().length < 10}
          >
            {t('location.reviewSend')}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
