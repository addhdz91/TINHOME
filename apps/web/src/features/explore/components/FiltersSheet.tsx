import { Lock } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AMENITIES, HOME_TYPES } from '@tinhome/shared/constants';
import type { SearchFilters } from '@tinhome/shared/schemas';
import { CheckboxGroup } from '@/components/CheckboxGroup';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';

/** S-05 — complete filter sheet; Premium filters show a lock and open the PaywallSheet. */
export function FiltersSheet({
  open,
  onOpenChange,
  filters,
  isPremium,
  onApply,
  onLocked,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: SearchFilters;
  isPremium: boolean;
  onApply: (filters: SearchFilters) => void;
  onLocked: () => void;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<SearchFilters>(filters);
  const toggle = (key: 'perfectFitOnly' | 'topOnly' | 'likedMeOnly', premium: boolean) => (
    <label className="flex min-h-11 items-center justify-between gap-3">
      <span className="flex items-center gap-2">
        {premium && !isPremium ? <Lock aria-hidden="true" className="size-4 text-premium" /> : null}
        {t(`explore.filters.${key}`)}
        {premium && !isPremium ? <span className="sr-only">{t('explore.premiumOnly')}</span> : null}
      </span>
      <input
        type="checkbox"
        className="size-5 accent-primary"
        checked={draft[key] === true}
        onChange={(event) => {
          if (premium && !isPremium) {
            onLocked();
            return;
          }
          setDraft((d) => ({ ...d, [key]: event.target.checked || undefined }));
        }}
      />
    </label>
  );
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setDraft(filters);
        onOpenChange(next);
      }}
    >
      <DialogContent title={t('explore.moreFilters')} closeLabel={t('common.close')}>
        <CheckboxGroup
          id="explore-types"
          legend={t('explore.filters.types')}
          options={HOME_TYPES.map((value) => ({ value, label: t(`home.types.${value}`) }))}
          value={draft.types ?? []}
          onChange={(types) =>
            setDraft((d) => ({
              ...d,
              types: types.length ? (types as SearchFilters['types']) : undefined,
            }))
          }
        />
        <CheckboxGroup
          id="explore-amenities"
          legend={t('explore.filters.amenities')}
          options={AMENITIES.map((value) => ({ value, label: t(`home.amenities.${value}`) }))}
          value={draft.amenities ?? []}
          onChange={(amenities) =>
            setDraft((d) => ({
              ...d,
              amenities: amenities.length ? (amenities as SearchFilters['amenities']) : undefined,
            }))
          }
        />
        <fieldset className="flex flex-col">
          <legend className="mb-1 font-semibold">{t('explore.filters.more')}</legend>
          {toggle('perfectFitOnly', false)}
          {toggle('topOnly', true)}
          {toggle('likedMeOnly', true)}
          <label className="flex min-h-11 items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              {!isPremium ? <Lock aria-hidden="true" className="size-4 text-premium" /> : null}
              {t('explore.filters.minReviews')}
            </span>
            <select
              className="min-h-11 rounded-md border border-border bg-surface px-3 text-text"
              value={draft.minReviews ?? ''}
              onChange={(event) => {
                if (!isPremium) {
                  onLocked();
                  return;
                }
                setDraft((d) => ({
                  ...d,
                  minReviews: event.target.value ? Number(event.target.value) : undefined,
                }));
              }}
            >
              <option value="">{t('explore.any')}</option>
              {[1, 3, 5, 10].map((n) => (
                <option key={n} value={n}>
                  {t('explore.atLeast', { count: n })}
                </option>
              ))}
            </select>
          </label>
        </fieldset>
        <Button
          size="lg"
          onClick={() => {
            onApply(draft);
            onOpenChange(false);
          }}
        >
          {t('explore.apply')}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
