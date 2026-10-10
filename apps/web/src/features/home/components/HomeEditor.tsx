import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { HomeOwnerView } from '@tinhome/shared/schemas';
import { useMe } from '@/app/auth/auth-context';
import { HomeCard } from '@/components/HomeCard';
import { Button } from '@/components/ui/button';
import { useCities } from '@/features/cities';
import { usePublicConfig } from '@/hooks/use-public-config';
import { AppError, toAppError, toUserMessage } from '@/lib/app-error';
import { upsertHome } from '@/lib/callables';
import { cn } from '@/lib/utils';
import { useSetMyHome } from '../api/use-my-home';
import type { DescriptionValues } from '../lib/forms';
import { HomeBasicsForm } from './HomeBasicsForm';
import { HomeDescriptionForm } from './HomeDescriptionForm';
import { PhotoUploader } from './PhotoUploader';

export type Sub = 'basics' | 'photos' | 'description';
const SUBS: Sub[] = ['basics', 'photos', 'description'];

interface HomeEditorProps {
  home: HomeOwnerView | null;
  /** Start on a given sub-step (e.g. photos when some are missing). */
  initialSub?: Sub | undefined;
  /** Called after the last sub-step is saved. */
  onDone: (home: HomeOwnerView) => void;
}

/**
 * S-03 step 3 — three sub-screens (basic data → photos → description and rules) with a live
 * preview of the card. Every sub-step is saved as a draft (AC-06.1).
 */
export function HomeEditor({ home, initialSub, onDone }: HomeEditorProps) {
  const { t } = useTranslation();
  const me = useMe();
  const cities = useCities();
  const config = usePublicConfig();
  const setHome = useSetMyHome();
  const [sub, setSub] = useState<Sub>(initialSub ?? 'basics');
  const [draftTexts, setDraftTexts] = useState<Partial<DescriptionValues>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const save = useMutation({ mutationFn: upsertHome });

  const persist = async (values: Parameters<typeof upsertHome>[0]) => {
    setServerError(null);
    try {
      const { home: saved } = await save.mutateAsync(values);
      setHome(saved);
      return saved;
    } catch (error) {
      const appError = toAppError(error);
      setServerError(
        appError.code === 'E_TEXT_VIOLATION'
          ? t('home.validation.text')
          : toUserMessage(t, appError),
      );
      throw appError;
    }
  };

  const city = cities.data?.find((c) => c.id === home?.cityId);
  const preview = {
    title: draftTexts.title ?? home?.title ?? '',
    cityName: city?.name ?? '',
    zone: home?.zone ?? '',
    maxGuests: home?.maxGuests ?? 1,
    bedrooms: home?.bedrooms ?? 0,
    photos: home?.photos ?? [],
  };
  const min = config.data?.photosMin ?? 5;
  const max = config.data?.photosMax ?? 20;
  const index = SUBS.indexOf(sub);

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex flex-col gap-5">
        <nav aria-label={t('home.steps.of', { current: index + 1 })} className="flex gap-2">
          {SUBS.map((name, i) => (
            <button
              key={name}
              type="button"
              disabled={!home && i > 0}
              aria-current={name === sub ? 'step' : undefined}
              onClick={() => setSub(name)}
              className={cn(
                'min-h-11 flex-1 rounded-md border px-2 text-sm font-semibold disabled:opacity-50',
                name === sub
                  ? 'border-primary bg-brand-soft text-brand-text'
                  : 'border-border text-muted',
              )}
            >
              {t(`home.steps.${name}`)}
            </button>
          ))}
        </nav>
        {serverError ? (
          <p role="alert" className="rounded-md border border-danger p-3">
            {serverError}
          </p>
        ) : null}
        {sub === 'basics' ? (
          <HomeBasicsForm
            home={home}
            cities={cities.data ?? []}
            defaultCityId={me.city?.id ?? undefined}
            submitLabel={t('home.save')}
            onSubmit={async (values) => {
              await persist(values)
                .then(() => setSub('photos'))
                .catch((e: unknown) => {
                  if (!(e instanceof AppError)) throw e;
                });
            }}
          />
        ) : null}
        {sub === 'photos' && home ? (
          <div className="flex flex-col gap-4">
            <PhotoUploader
              photos={home.photos}
              title={preview.title || t('home.preview.untitled')}
              min={min}
              max={max}
              onPhotosChange={(photos) => setHome({ ...home, photos })}
            />
            <Button size="lg" className="self-start" onClick={() => setSub('description')}>
              {t('home.photos.continue')}
            </Button>
          </div>
        ) : null}
        {sub === 'description' && home ? (
          <HomeDescriptionForm
            home={home}
            submitLabel={t('home.save')}
            onChange={setDraftTexts}
            onSubmit={async (values) => {
              await persist({ cityId: home.cityId ?? '', ...values })
                .then(onDone)
                .catch((e: unknown) => {
                  if (!(e instanceof AppError)) throw e;
                });
            }}
          />
        ) : null}
      </div>
      <aside aria-label={t('home.preview.title')} className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-muted">{t('home.preview.title')}</p>
        <div className="mx-auto w-full max-w-[320px]">
          <HomeCard home={preview} eager />
        </div>
      </aside>
    </div>
  );
}
