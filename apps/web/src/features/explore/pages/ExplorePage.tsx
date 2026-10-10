import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Lock, SearchX, SlidersHorizontal, Star } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SEARCH_SORTS, type SearchFilters } from '@tinhome/shared/schemas';
import { useMe } from '@/app/auth/auth-context';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { PaywallSheet } from '@/components/PaywallSheet';
import { Seo } from '@/components/Seo';
import { Skeleton } from '@/components/Skeleton';
import { Button } from '@/components/ui/button';
import { useActiveWindows, useCities } from '@/features/cities';
import { searchHomes } from '@/lib/callables';
import { cn } from '@/lib/utils';
import { FiltersSheet } from '../components/FiltersSheet';
import { HomeGridItem } from '../components/HomeGridItem';

type Sort = (typeof SEARCH_SORTS)[number];

const chipClass = (active: boolean) =>
  cn(
    'min-h-11 shrink-0 rounded-full border px-3 text-sm font-semibold',
    active ? 'border-primary bg-brand-soft text-brand-text' : 'border-border bg-surface',
  );

/** S-05 — `/app/explorar`: filter chips, complete sheet, infinite grid, «Casas Top» for Premium. */
export function ExplorePage() {
  const { t } = useTranslation();
  const me = useMe();
  const cities = useCities();
  const windows = useActiveWindows();
  const [filters, setFilters] = useState<SearchFilters>({});
  const [sort, setSort] = useState<Sort>('RELEVANCE');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const isPremium = me.premium.active;
  const list = useInfiniteQuery({
    queryKey: ['explore', filters, sort],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      searchHomes({ filters, sort, limit: 12, ...(pageParam ? { cursor: pageParam } : {}) }),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
  const top = useQuery({
    queryKey: ['explore', 'top'],
    enabled: isPremium,
    queryFn: () => searchHomes({ filters: { topOnly: true }, sort: 'RATING', limit: 8 }),
  });
  const items = list.data?.pages.flatMap((page) => page.items) ?? [];
  const windowNames = useMemo(
    () => new Map((windows.data ?? []).map((w) => [w.id, w.name])),
    [windows.data],
  );
  const sentinel = useRef<HTMLDivElement>(null);

  // Infinite scroll with a «Cargar más» button as the keyboard / fallback path.
  useEffect(() => {
    const node = sentinel.current;
    if (!node || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting) && list.hasNextPage && !list.isFetchingNextPage) {
        void list.fetchNextPage();
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [list]);

  const destinations = (cities.data ?? []).filter(
    (c) => c.status === 'OPEN' && c.id !== me.city?.id,
  );
  const activeCount = Object.values(filters).filter((v) => v !== undefined).length;
  const viewerCityName = me.city?.name ?? '';

  return (
    <section className="flex flex-col gap-4 py-2">
      <Seo title={`${t('nav.explore')} — TinHome`} />
      <h1 className="text-h1">{t('nav.explore')}</h1>
      <div
        className="sticky top-14 z-10 -mx-4 flex gap-2 overflow-x-auto bg-bg px-4 py-2 lg:top-0"
        role="group"
        aria-label={t('explore.filtersLabel')}
      >
        <select
          aria-label={t('explore.filters.destination')}
          className={chipClass(Boolean(filters.cityIds))}
          value={filters.cityIds?.[0] ?? ''}
          onChange={(event) =>
            setFilters((f) => ({
              ...f,
              cityIds: event.target.value ? [event.target.value] : undefined,
            }))
          }
        >
          <option value="">{t('explore.filters.anyDestination')}</option>
          {destinations.map((city) => (
            <option key={city.id} value={city.id}>
              {city.name}
            </option>
          ))}
        </select>
        <select
          aria-label={t('explore.filters.dates')}
          className={chipClass(Boolean(filters.windowId))}
          value={filters.windowId ?? ''}
          onChange={(event) =>
            setFilters((f) => ({ ...f, windowId: event.target.value || undefined }))
          }
        >
          <option value="">{t('explore.filters.anyDates')}</option>
          {(windows.data ?? []).map((window) => (
            <option key={window.id} value={window.id}>
              {window.name}
            </option>
          ))}
        </select>
        <select
          aria-label={t('explore.filters.guests')}
          className={chipClass(Boolean(filters.minGuests))}
          value={filters.minGuests ?? ''}
          onChange={(event) =>
            setFilters((f) => ({
              ...f,
              minGuests: event.target.value ? Number(event.target.value) : undefined,
            }))
          }
        >
          <option value="">{t('explore.filters.anyGuests')}</option>
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <option key={n} value={n}>
              {t('explore.filters.guestsValue', { count: n })}
            </option>
          ))}
        </select>
        <button
          type="button"
          aria-pressed={filters.pets === true}
          className={chipClass(filters.pets === true)}
          onClick={() => setFilters((f) => ({ ...f, pets: f.pets ? undefined : true }))}
        >
          {t('explore.filters.pets')}
        </button>
        <button
          type="button"
          className={cn(chipClass(activeCount > 0), 'inline-flex items-center gap-1')}
          onClick={() => setSheetOpen(true)}
        >
          <SlidersHorizontal aria-hidden="true" className="size-4" />
          {t('explore.moreFilters')}
        </button>
        <select
          aria-label={t('explore.sort')}
          className={chipClass(sort !== 'RELEVANCE')}
          value={sort}
          onChange={(event) => setSort(event.target.value as Sort)}
        >
          {SEARCH_SORTS.map((value) => (
            <option key={value} value={value}>
              {t(`explore.sorts.${value}`)}
            </option>
          ))}
        </select>
      </div>

      <section aria-labelledby="top-title" className="flex flex-col gap-2">
        <h2 id="top-title" className="flex items-center gap-2 text-h3">
          <Star aria-hidden="true" className="size-5 fill-current text-premium" />
          {t('explore.topTitle')}
        </h2>
        {isPremium ? (
          top.data && top.data.items.length > 0 ? (
            <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2">
              {top.data.items.map((card) => (
                <li key={card.homeId} className="w-56 shrink-0 snap-start">
                  <HomeGridItem
                    card={card}
                    viewerCityName={viewerCityName}
                    windowNames={windowNames}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">{t('explore.topEmpty')}</p>
          )
        ) : (
          <button
            type="button"
            onClick={() => setPaywallOpen(true)}
            className="flex items-center gap-3 rounded-lg border border-dashed border-border p-4 text-left"
          >
            <Lock aria-hidden="true" className="size-5 text-premium" />
            <span>{t('explore.topLocked')}</span>
          </button>
        )}
      </section>

      {list.isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="aspect-[3/4] rounded-xl" />
          ))}
        </div>
      ) : list.isError ? (
        <ErrorState onRetry={() => void list.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<SearchX />}
          title={t('explore.empty')}
          action={
            <Button variant="secondary" onClick={() => setFilters({})}>
              {t('explore.clear')}
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((card, index) => (
            <li key={card.homeId}>
              <HomeGridItem
                card={card}
                viewerCityName={viewerCityName}
                windowNames={windowNames}
                eager={index < 2}
              />
            </li>
          ))}
        </ul>
      )}
      <div ref={sentinel} />
      {list.hasNextPage ? (
        <Button
          variant="secondary"
          className="self-center"
          disabled={list.isFetchingNextPage}
          onClick={() => void list.fetchNextPage()}
        >
          {t('explore.loadMore')}
        </Button>
      ) : null}

      <FiltersSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        filters={filters}
        isPremium={isPremium}
        onApply={setFilters}
        onLocked={() => {
          setSheetOpen(false);
          setPaywallOpen(true);
        }}
      />
      <PaywallSheet
        open={paywallOpen}
        onOpenChange={setPaywallOpen}
        title={t('paywall.filtersTitle')}
      />
    </section>
  );
}
