import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  PARTNER_CATEGORIES,
  SPONSORED_PLACEMENTS,
  type PartnerCategory,
  type SponsoredPlacement,
} from '@tinhome/shared/constants';
import type { PartnerView } from '@tinhome/shared/schemas';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { Seo } from '@/components/Seo';
import { Skeleton } from '@/components/Skeleton';
import { TextField } from '@/components/TextField';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { toUserMessage } from '@/lib/app-error';
import { adminGetParams, adminListPartners, adminUpsertPartner } from '@/lib/callables';

interface PartnerDraft {
  id: string | null;
  name: string;
  category: PartnerCategory;
  title: string;
  text: string;
  logoUrl: string;
  targetUrl: string;
  cities: string;
  placements: SponsoredPlacement[];
  active: boolean;
  startsAt: string;
  endsAt: string;
}

const NEW_PARTNER: PartnerDraft = {
  id: null,
  name: '',
  category: 'OTHER',
  title: '',
  text: '',
  logoUrl: '',
  targetUrl: '',
  cities: '',
  placements: ['MATCH'],
  active: false,
  startsAt: '',
  endsAt: '',
};
const TEXT_MAX = 140;

function toDraft(partner: PartnerView): PartnerDraft {
  return {
    id: partner.id,
    name: partner.name,
    category: partner.category,
    title: partner.title,
    text: partner.text,
    logoUrl: partner.logoUrl,
    targetUrl: partner.targetUrl,
    cities: (partner.cityIds ?? []).join(', '),
    placements: partner.placements,
    active: partner.active,
    startsAt: partner.startsAt?.slice(0, 10) ?? '',
    endsAt: partner.endsAt?.slice(0, 10) ?? '',
  };
}

/** Calendar day in Madrid → instant (start of the day; end dates are exclusive). */
function dayToInstant(day: string): string | null {
  return day ? new Date(`${day}T00:00:00+01:00`).toISOString() : null;
}

function PartnerForm({
  initial,
  insuranceEnabled,
  onSaved,
}: {
  initial: PartnerDraft;
  insuranceEnabled: boolean;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(initial);
  const cityIds = draft.cities
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
  const save = useMutation({
    mutationFn: () =>
      adminUpsertPartner({
        ...(draft.id ? { id: draft.id } : {}),
        name: draft.name,
        category: draft.category,
        title: draft.title,
        text: draft.text,
        logoUrl: draft.logoUrl,
        targetUrl: draft.targetUrl,
        cityIds: cityIds.length ? cityIds : null,
        placements: draft.placements,
        active: draft.active,
        startsAt: dayToInstant(draft.startsAt),
        endsAt: dayToInstant(draft.endsAt),
      }),
    onSuccess: () => {
      toast.success(t('admin.partners.saved'));
      onSaved();
    },
    onError: (error) => toast.error(toUserMessage(t, error)),
  });
  const togglePlacement = (placement: SponsoredPlacement, on: boolean) =>
    setDraft({
      ...draft,
      placements: on
        ? [...draft.placements, placement]
        : draft.placements.filter((p) => p !== placement),
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
        label={t('admin.partners.name')}
        value={draft.name}
        onChange={(e) => setDraft({ ...draft, name: e.target.value })}
      />
      <label className="flex flex-col gap-1">
        <span className="font-semibold">{t('admin.partners.category')}</span>
        <select
          className="min-h-11 rounded-md border border-border bg-surface px-3"
          value={draft.category}
          onChange={(e) => setDraft({ ...draft, category: e.target.value as PartnerCategory })}
        >
          {PARTNER_CATEGORIES.map((category) => (
            <option
              key={category}
              value={category}
              disabled={category === 'TRAVEL_INSURANCE' && !insuranceEnabled}
            >
              {t(`admin.partners.categories.${category}`)}
            </option>
          ))}
        </select>
      </label>
      {!insuranceEnabled ? (
        <p className="text-sm text-muted">{t('admin.partners.insuranceBlocked')}</p>
      ) : null}
      <TextField
        label={t('admin.partners.cardTitle')}
        value={draft.title}
        maxLength={60}
        onChange={(e) => setDraft({ ...draft, title: e.target.value })}
      />
      <TextField
        label={t('admin.partners.text')}
        value={draft.text}
        maxLength={TEXT_MAX}
        onChange={(e) => setDraft({ ...draft, text: e.target.value })}
      />
      <TextField
        label={t('admin.partners.logoUrl')}
        value={draft.logoUrl}
        onChange={(e) => setDraft({ ...draft, logoUrl: e.target.value })}
      />
      <TextField
        label={t('admin.partners.targetUrl')}
        type="url"
        value={draft.targetUrl}
        onChange={(e) => setDraft({ ...draft, targetUrl: e.target.value })}
      />
      <TextField
        label={t('admin.partners.cities')}
        value={draft.cities}
        onChange={(e) => setDraft({ ...draft, cities: e.target.value })}
      />
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 font-semibold">{t('admin.partners.placements')}</legend>
        {SPONSORED_PLACEMENTS.map((placement) => (
          <label key={placement} className="flex items-center gap-3">
            <input
              type="checkbox"
              className="size-5 accent-primary"
              checked={draft.placements.includes(placement)}
              onChange={(e) => togglePlacement(placement, e.target.checked)}
            />
            {t(`admin.partners.placementNames.${placement}`)}
          </label>
        ))}
      </fieldset>
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3">
        <TextField
          label={t('admin.partners.startsAt')}
          type="date"
          value={draft.startsAt}
          onChange={(e) => setDraft({ ...draft, startsAt: e.target.value })}
        />
        <TextField
          label={t('admin.partners.endsAt')}
          type="date"
          value={draft.endsAt}
          onChange={(e) => setDraft({ ...draft, endsAt: e.target.value })}
        />
      </div>
      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          className="size-5 accent-primary"
          checked={draft.active}
          onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
        />
        {t('admin.partners.active')}
      </label>
      <Button type="submit" disabled={save.isPending || draft.placements.length === 0}>
        {t('admin.partners.save')}
      </Button>
    </form>
  );
}

/** UX §9 / FR-47 — sponsored partners with their clicks (superadmin). */
export function PartnersPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const params = useQuery({ queryKey: ['admin', 'params'], queryFn: () => adminGetParams({}) });
  const partners = useQuery({
    queryKey: ['admin', 'partners'],
    queryFn: () => adminListPartners({}),
  });
  const [draft, setDraft] = useState<PartnerDraft | null>(null);
  const saved = () => {
    setDraft(null);
    void queryClient.invalidateQueries({ queryKey: ['admin', 'partners'] });
  };
  let content;
  if (partners.isPending) content = <Skeleton className="h-64" />;
  else if (partners.isError) content = <ErrorState onRetry={() => void partners.refetch()} />;
  else if (partners.data.items.length === 0)
    content = <EmptyState headingLevel={2} title={t('admin.partners.empty')} />;
  else
    content = (
      <ul className="flex flex-col gap-2">
        {partners.data.items.map((partner) => (
          <li
            key={partner.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3"
          >
            <span className="min-w-0 break-words">
              <span className="font-semibold">{partner.name}</span> ·{' '}
              {t(`admin.partners.categories.${partner.category}`)} ·{' '}
              {partner.active ? t('admin.partners.active') : t('admin.partners.inactive')} ·{' '}
              {t('admin.partners.clicks', { count: partner.clicks30d })}
            </span>
            <Button size="sm" variant="secondary" onClick={() => setDraft(toDraft(partner))}>
              {t('admin.partners.edit')}
            </Button>
          </li>
        ))}
      </ul>
    );
  return (
    <section className="flex flex-col gap-4">
      <Seo title={`${t('admin.partners.title')} — ${t('admin.title')}`} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-h1">{t('admin.partners.title')}</h1>
        <Button onClick={() => setDraft(NEW_PARTNER)}>{t('admin.partners.new')}</Button>
      </div>
      <p className="text-muted">{t('admin.partners.intro')}</p>
      {content}
      <Dialog open={draft !== null} onOpenChange={(open) => !open && setDraft(null)}>
        <DialogContent title={t('admin.partners.form')} closeLabel={t('common.close')}>
          {draft ? (
            <PartnerForm
              initial={draft}
              insuranceEnabled={params.data?.params.sponsoredInsuranceEnabled ?? false}
              onSaved={saved}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}
