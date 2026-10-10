import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import type { HomeCard as HomeCardModel } from '@tinhome/shared/schemas';
import { CompatibilityChips } from '@/components/CompatibilityChips';
import { HomeCard } from '@/components/HomeCard';
import { TrustBadges } from '@/components/TrustBadges';

/** Explore grid item: the card links to the detail (S-06). */
export function HomeGridItem({
  card,
  viewerCityName,
  windowNames,
  eager = false,
}: {
  card: HomeCardModel;
  viewerCityName: string;
  windowNames: ReadonlyMap<string, string>;
  eager?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <Link
      to={`/app/casa/${card.homeId}`}
      aria-label={t('explore.cardLabel', {
        title: card.title,
        city: card.cityName,
        zone: card.zone,
      })}
      className="block rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
    >
      <HomeCard
        home={card}
        eager={eager}
        chips={
          <div className="flex flex-col gap-1">
            <TrustBadges
              verified={card.host.identityVerified}
              top={card.isTop}
              founder={card.host.foundingMember}
              rating={card.rating}
              onMedia
            />
            <CompatibilityChips
              compatibility={card.compatibility}
              likedYou={card.likedYou}
              viewerCityName={viewerCityName}
              windowNames={windowNames}
              onMedia
            />
          </div>
        }
      />
    </Link>
  );
}
