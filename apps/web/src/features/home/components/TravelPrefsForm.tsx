import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { isValidRange, toIsoDate } from '@tinhome/shared/domain';
import type { HomeOwnerView, TravelPrefsInput } from '@tinhome/shared/schemas';
import type { IsoDate } from '@tinhome/shared/types';
import { CheckboxGroup } from '@/components/CheckboxGroup';
import { TextField } from '@/components/TextField';
import { Button } from '@/components/ui/button';
import type { City, ExchangeWindow } from '@/features/cities';
import { formatIsoDate } from '@/lib/format';

interface Props {
  home: HomeOwnerView;
  cities: City[];
  windows: ExchangeWindow[];
  maxDestinations: number;
  maxRanges: number;
  prefill?: { destinations: string[]; windowIds: string[] } | undefined;
  submitLabel: string;
  onSubmit: (input: TravelPrefsInput) => Promise<void>;
}

/** S-03 step 4 / S-? «Mi viaje» — destinations, exchange windows, own dates and travellers. */
export function TravelPrefsForm({
  home,
  cities,
  windows,
  maxDestinations,
  maxRanges,
  prefill,
  submitLabel,
  onSubmit,
}: Props) {
  const { t } = useTranslation();
  const [anyOpen, setAnyOpen] = useState(home.destinations?.mode === 'ANY_OPEN');
  const [destinations, setDestinations] = useState<string[]>(
    home.destinations?.cityIds ?? prefill?.destinations.filter((id) => id !== home.cityId) ?? [],
  );
  const [windowIds, setWindowIds] = useState<string[]>(
    home.availability?.windowIds ?? prefill?.windowIds ?? [],
  );
  const [ranges, setRanges] = useState<{ start: string; end: string }[]>(
    home.availability?.ranges ?? [],
  );
  const [count, setCount] = useState(String(home.travelers?.count ?? 2));
  const [withPet, setWithPet] = useState(home.travelers?.withPet ?? false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const today = toIsoDate(new Date());

  const rangeOk = (r: { start: string; end: string }) =>
    isValidRange({ start: r.start as IsoDate, end: r.end as IsoDate }, today);

  const submit = async () => {
    setError(null);
    if (!anyOpen && destinations.length === 0) {
      setError(t('trip.needOne'));
      return;
    }
    if (destinations.length > maxDestinations) {
      setError(t('trip.destinationsHint', { max: maxDestinations }));
      return;
    }
    if (!ranges.every(rangeOk)) {
      setError(t('trip.rangeInvalid'));
      return;
    }
    setBusy(true);
    try {
      await onSubmit({
        destinations: { mode: anyOpen ? 'ANY_OPEN' : 'LIST', cityIds: anyOpen ? [] : destinations },
        availability: {
          windowIds,
          ranges: ranges.map((r) => ({ start: r.start as IsoDate, end: r.end as IsoDate })),
        },
        travelers: { count: Math.min(12, Math.max(1, Number(count) || 1)), withPet },
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      noValidate
      className="flex flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <p className="text-muted">{t('trip.why')}</p>
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 font-semibold">{t('trip.destinations')}</legend>
        <label className="flex min-h-11 items-center gap-3">
          <input
            type="checkbox"
            className="size-5 accent-primary"
            checked={anyOpen}
            onChange={(e) => setAnyOpen(e.target.checked)}
          />
          {t('trip.anyOpen')}
        </label>
        {anyOpen ? null : (
          <CheckboxGroup
            id="trip-destinations"
            legend={t('trip.destinations')}
            hint={t('trip.destinationsHint', { max: maxDestinations })}
            options={cities
              .filter((c) => c.id !== home.cityId)
              .map((c) => ({ value: c.id, label: c.name }))}
            value={destinations}
            onChange={setDestinations}
          />
        )}
      </fieldset>

      {windows.length > 0 ? (
        <CheckboxGroup
          id="trip-windows"
          legend={t('trip.windows')}
          hint={t('trip.windowsHint')}
          options={windows.map((w) => ({
            value: w.id,
            label: `${w.name} · ${formatIsoDate(w.startDate)} – ${formatIsoDate(w.endDate)}`,
          }))}
          value={windowIds}
          onChange={setWindowIds}
        />
      ) : null}

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 font-semibold">{t('trip.ranges')}</legend>
        <p className="text-sm text-muted">{t('trip.rangesHint', { max: maxRanges })}</p>
        {ranges.map((range, index) => (
          <div
            key={index}
            className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-end gap-2"
          >
            <TextField
              label={t('trip.start')}
              type="date"
              min={today}
              value={range.start}
              onChange={(e) =>
                setRanges(ranges.map((r, i) => (i === index ? { ...r, start: e.target.value } : r)))
              }
              error={
                range.start && range.end && !rangeOk(range) ? t('trip.rangeInvalid') : undefined
              }
            />
            <TextField
              label={t('trip.end')}
              type="date"
              min={range.start || today}
              value={range.end}
              onChange={(e) =>
                setRanges(ranges.map((r, i) => (i === index ? { ...r, end: e.target.value } : r)))
              }
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="mb-7"
              aria-label={t('trip.removeRange', { n: index + 1 })}
              onClick={() => setRanges(ranges.filter((_, i) => i !== index))}
            >
              <Trash2 aria-hidden="true" />
            </Button>
          </div>
        ))}
        {ranges.length < maxRanges ? (
          <Button
            type="button"
            variant="secondary"
            className="self-start"
            onClick={() => setRanges([...ranges, { start: '', end: '' }])}
          >
            <Plus aria-hidden="true" />
            {t('trip.addRange')}
          </Button>
        ) : null}
      </fieldset>

      <fieldset className="grid grid-cols-2 items-end gap-3">
        <legend className="sr-only">{t('trip.travelers')}</legend>
        <TextField
          label={t('trip.travelers')}
          type="number"
          inputMode="numeric"
          min={1}
          max={12}
          value={count}
          onChange={(e) => setCount(e.target.value)}
        />
        <label className="mb-7 flex min-h-11 items-center gap-3">
          <input
            type="checkbox"
            className="size-5 accent-primary"
            checked={withPet}
            onChange={(e) => setWithPet(e.target.checked)}
          />
          {t('trip.withPet')}
        </label>
      </fieldset>

      {windowIds.length === 0 && ranges.length === 0 ? (
        <p className="text-sm text-warning">{t('trip.needDates')}</p>
      ) : null}
      {error ? (
        <p role="alert" className="font-semibold text-danger">
          {error}
        </p>
      ) : null}
      <Button type="submit" size="lg" disabled={busy} className="self-start">
        {busy ? t('home.saving') : submitLabel}
      </Button>
    </form>
  );
}
