import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { CITY_STATUS, type CityStatus } from '@tinhome/shared/constants';
import type { AdminUpsertCityInput, AdminUpsertWindowInput } from '@tinhome/shared/schemas';
import { ErrorState } from '@/components/ErrorState';
import { Seo } from '@/components/Seo';
import { Skeleton } from '@/components/Skeleton';
import { TextField } from '@/components/TextField';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { toUserMessage } from '@/lib/app-error';
import { adminGetCatalog, adminUpsertCity, adminUpsertWindow } from '@/lib/callables';
import { useIsSuperadmin } from '../lib/role';

const NEW_CITY: AdminUpsertCityInput = {
  id: '',
  name: '',
  province: '',
  region: '',
  timezone: 'Europe/Madrid',
  center: { lat: 40.4168, lng: -3.7038 },
  radiusKm: 25,
  status: 'WAITLIST',
  openThreshold: 150,
  order: 99,
};
/** Form state: dates are plain strings until the server validates them. */
type WindowDraft = Omit<AdminUpsertWindowInput, 'startDate' | 'endDate'> & {
  startDate: string;
  endDate: string;
};

const NEW_WINDOW: WindowDraft = {
  id: '',
  name: '',
  startDate: '',
  endDate: '',
  active: true,
  cityIds: null,
  order: 99,
};

function CityForm({ initial, onSaved }: { initial: AdminUpsertCityInput; onSaved: () => void }) {
  const { t } = useTranslation();
  const [city, setCity] = useState(initial);
  const save = useMutation({
    mutationFn: () => adminUpsertCity(city),
    onSuccess: () => {
      toast.success(t('admin.catalog.saved'));
      onSaved();
    },
    onError: (error) => toast.error(toUserMessage(t, error)),
  });
  const num = (value: string) => Number(value.replace(',', '.'));
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate();
      }}
    >
      <TextField
        label={t('admin.catalog.id')}
        value={city.id}
        disabled={initial.id !== ''}
        onChange={(e) => setCity({ ...city, id: e.target.value })}
      />
      <TextField
        label={t('admin.catalog.name')}
        value={city.name}
        onChange={(e) => setCity({ ...city, name: e.target.value })}
      />
      <TextField
        label={t('admin.catalog.province')}
        value={city.province}
        onChange={(e) => setCity({ ...city, province: e.target.value })}
      />
      <TextField
        label={t('admin.catalog.region')}
        value={city.region}
        onChange={(e) => setCity({ ...city, region: e.target.value })}
      />
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3">
        <TextField
          label={t('admin.catalog.lat')}
          inputMode="decimal"
          value={String(city.center.lat)}
          onChange={(e) =>
            setCity({ ...city, center: { ...city.center, lat: num(e.target.value) } })
          }
        />
        <TextField
          label={t('admin.catalog.lng')}
          inputMode="decimal"
          value={String(city.center.lng)}
          onChange={(e) =>
            setCity({ ...city, center: { ...city.center, lng: num(e.target.value) } })
          }
        />
        <TextField
          label={t('admin.catalog.radius')}
          type="number"
          value={String(city.radiusKm)}
          onChange={(e) => setCity({ ...city, radiusKm: num(e.target.value) })}
        />
        <TextField
          label={t('admin.catalog.threshold')}
          type="number"
          value={String(city.openThreshold)}
          onChange={(e) => setCity({ ...city, openThreshold: num(e.target.value) })}
        />
        <TextField
          label={t('admin.catalog.order')}
          type="number"
          value={String(city.order)}
          onChange={(e) => setCity({ ...city, order: num(e.target.value) })}
        />
      </div>
      <label className="flex flex-col gap-1">
        <span className="font-semibold">{t('admin.catalog.status')}</span>
        <select
          className="min-h-11 rounded-md border border-border bg-surface px-3"
          value={city.status}
          onChange={(e) => setCity({ ...city, status: e.target.value as CityStatus })}
        >
          {CITY_STATUS.map((status) => (
            <option key={status} value={status}>
              {t(`admin.catalog.statuses.${status}`)}
            </option>
          ))}
        </select>
      </label>
      {initial.status !== 'OPEN' && city.status === 'OPEN' ? (
        <p className="text-sm text-warning">{t('admin.catalog.openWarning')}</p>
      ) : null}
      <Button type="submit" disabled={save.isPending}>
        {t('admin.catalog.save')}
      </Button>
    </form>
  );
}

function WindowForm({ initial, onSaved }: { initial: WindowDraft; onSaved: () => void }) {
  const { t } = useTranslation();
  const [window, setWindow] = useState(initial);
  const save = useMutation({
    mutationFn: () => adminUpsertWindow(window),
    onSuccess: () => {
      toast.success(t('admin.catalog.saved'));
      onSaved();
    },
    onError: (error) => toast.error(toUserMessage(t, error)),
  });
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate();
      }}
    >
      <TextField
        label={t('admin.catalog.id')}
        value={window.id}
        disabled={initial.id !== ''}
        onChange={(e) => setWindow({ ...window, id: e.target.value })}
      />
      <TextField
        label={t('admin.catalog.name')}
        value={window.name}
        onChange={(e) => setWindow({ ...window, name: e.target.value })}
      />
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3">
        <TextField
          label={t('admin.catalog.start')}
          type="date"
          value={window.startDate}
          onChange={(e) => setWindow({ ...window, startDate: e.target.value })}
        />
        <TextField
          label={t('admin.catalog.end')}
          type="date"
          value={window.endDate}
          onChange={(e) => setWindow({ ...window, endDate: e.target.value })}
        />
      </div>
      <TextField
        label={t('admin.catalog.cities')}
        hint={t('admin.catalog.citiesHint')}
        value={(window.cityIds ?? []).join(', ')}
        onChange={(e) => {
          const ids = e.target.value
            .split(',')
            .map((id) => id.trim())
            .filter(Boolean);
          setWindow({ ...window, cityIds: ids.length ? ids : null });
        }}
      />
      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          className="size-5 accent-primary"
          checked={window.active}
          onChange={(e) => setWindow({ ...window, active: e.target.checked })}
        />
        {t('admin.catalog.active')}
      </label>
      <Button type="submit" disabled={save.isPending}>
        {t('admin.catalog.save')}
      </Button>
    </form>
  );
}

/** UX §9 / FR-51 — cities and exchange windows (edition: superadmin). */
export function CatalogPage() {
  const { t } = useTranslation();
  const superadmin = useIsSuperadmin();
  const queryClient = useQueryClient();
  const catalog = useQuery({ queryKey: ['admin', 'catalog'], queryFn: () => adminGetCatalog({}) });
  const [city, setCity] = useState<AdminUpsertCityInput | null>(null);
  const [window, setWindow] = useState<WindowDraft | null>(null);
  const saved = () => {
    setCity(null);
    setWindow(null);
    void queryClient.invalidateQueries({ queryKey: ['admin', 'catalog'] });
  };
  if (catalog.isPending) return <Skeleton className="h-96" />;
  if (catalog.isError) return <ErrorState onRetry={() => void catalog.refetch()} />;
  return (
    <section className="flex flex-col gap-6">
      <Seo title={`${t('admin.catalog.title')} — ${t('admin.title')}`} />
      <h1 className="text-h1">{t('admin.catalog.title')}</h1>
      <section aria-labelledby="catalog-cities" className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 id="catalog-cities" className="text-h2">
            {t('admin.catalog.citiesTitle')}
          </h2>
          {superadmin ? (
            <Button onClick={() => setCity(NEW_CITY)}>{t('admin.catalog.newCity')}</Button>
          ) : null}
        </div>
        <ul className="flex flex-col gap-2">
          {catalog.data.cities.map(({ counters, ...item }) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3"
            >
              <span>
                <span className="font-semibold">{item.name}</span> ·{' '}
                {t(`admin.catalog.statuses.${item.status}`)} ·{' '}
                {t('admin.catalog.counters', {
                  visible: counters.visibleCandidates,
                  threshold: item.openThreshold,
                  waitlist: counters.waitlist,
                })}
              </span>
              {superadmin ? (
                <Button size="sm" variant="secondary" onClick={() => setCity(item)}>
                  {t('admin.faqs.edit')}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="catalog-windows" className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 id="catalog-windows" className="text-h2">
            {t('admin.catalog.windowsTitle')}
          </h2>
          {superadmin ? (
            <Button onClick={() => setWindow(NEW_WINDOW)}>{t('admin.catalog.newWindow')}</Button>
          ) : null}
        </div>
        <ul className="flex flex-col gap-2">
          {catalog.data.windows.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3"
            >
              <span>
                <span className="font-semibold">{item.name}</span> · {item.startDate} →{' '}
                {item.endDate} ·{' '}
                {item.active ? t('admin.catalog.active') : t('admin.catalog.inactive')}
              </span>
              {superadmin ? (
                <Button size="sm" variant="secondary" onClick={() => setWindow(item)}>
                  {t('admin.faqs.edit')}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
      <Dialog open={city !== null} onOpenChange={(open) => !open && setCity(null)}>
        <DialogContent title={t('admin.catalog.cityForm')} closeLabel={t('common.close')}>
          {city ? <CityForm initial={city} onSaved={saved} /> : null}
        </DialogContent>
      </Dialog>
      <Dialog open={window !== null} onOpenChange={(open) => !open && setWindow(null)}>
        <DialogContent title={t('admin.catalog.windowForm')} closeLabel={t('common.close')}>
          {window ? <WindowForm initial={window} onSaved={saved} /> : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}
