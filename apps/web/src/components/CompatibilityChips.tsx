import { CalendarHeart, Heart, PawPrint, Plane, Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { HomeCard } from '@tinhome/shared/schemas';
import { cn } from '@/lib/utils';

interface ChipsProps {
  compatibility: HomeCard['compatibility'];
  /** `true` only for Premium viewers (FR-20). */
  likedYou?: boolean | null;
  viewerCityName?: string;
  windowNames?: ReadonlyMap<string, string>;
  petsAllowed?: boolean;
  /** Cards show at most 3 chips (C-06); the detail shows all. */
  max?: number;
  /** Over a photo (white text on the scrim) or on a surface. */
  onMedia?: boolean;
}

/** C-06 — «Encaje perfecto», «Quiere venir a Madrid», «Semana Santa en común»… */
export function CompatibilityChips({
  compatibility,
  likedYou,
  viewerCityName,
  windowNames,
  petsAllowed,
  max = 3,
  onMedia = false,
}: ChipsProps) {
  const { t } = useTranslation();
  const chips: { key: string; icon: ReactNode; label: string; strong?: boolean }[] = [];
  if (compatibility.perfectFit) {
    chips.push({ key: 'fit', icon: <Sparkles />, label: t('compat.perfectFit'), strong: true });
  }
  if (likedYou) chips.push({ key: 'liked', icon: <Heart />, label: t('compat.likedYou') });
  if (compatibility.wantsYourCity && viewerCityName) {
    chips.push({
      key: 'wants',
      icon: <Plane />,
      label: t('compat.wantsYourCity', { city: viewerCityName }),
    });
  }
  const sharedWindow = compatibility.sharedWindowIds[0];
  if (sharedWindow) {
    chips.push({
      key: 'window',
      icon: <CalendarHeart />,
      label: t('compat.sharedWindow', { window: windowNames?.get(sharedWindow) ?? '' }),
    });
  } else if (compatibility.overlapDays > 0) {
    chips.push({
      key: 'dates',
      icon: <CalendarHeart />,
      label: t('compat.overlap', { count: compatibility.overlapDays }),
    });
  }
  if (petsAllowed) chips.push({ key: 'pets', icon: <PawPrint />, label: t('compat.pets') });
  if (chips.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-1" aria-label={t('compat.label')}>
      {chips.slice(0, max).map((chip) => (
        <li
          key={chip.key}
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold [&_svg]:size-3.5',
            chip.strong
              ? 'bg-accent text-primary-foreground'
              : onMedia
                ? 'bg-overlay text-on-media'
                : 'bg-brand-soft text-brand-text',
          )}
        >
          <span aria-hidden="true">{chip.icon}</span>
          {chip.label}
        </li>
      ))}
    </ul>
  );
}
