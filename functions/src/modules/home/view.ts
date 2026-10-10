import type { DocumentData } from 'firebase-admin/firestore';
import { HomeOwnerView } from '@tinhome/shared/schemas';
import type { HomeState } from './visibility.js';

/** `HomeOwnerView` (05 §2.2) from the stored document and its computed state. */
export function toOwnerView(uid: string, home: DocumentData, state: HomeState): HomeOwnerView {
  const hold = home.moderationHold as { active?: boolean; reason?: string } | null | undefined;
  const photos = ((home.photos as DocumentData[] | undefined) ?? []).map((photo) => ({
    id: String(photo.id),
    order: Number(photo.order),
    thumbUrl: String(photo.thumbUrl),
    cardUrl: String(photo.cardUrl),
    fullUrl: String(photo.fullUrl),
    width: Number(photo.width),
    height: Number(photo.height),
  }));
  const data = home as Record<string, unknown>;
  return HomeOwnerView.parse({
    ...Object.fromEntries(
      [
        'title',
        'description',
        'cityId',
        'zone',
        'type',
        'tenure',
        'residenceUse',
        'sizeM2',
        'bedrooms',
        'beds',
        'bathrooms',
        'maxGuests',
        'petsAllowed',
        'amenities',
        'houseRules',
      ]
        .filter((key) => data[key] !== undefined && data[key] !== null)
        .map((key) => [key, data[key]]),
    ),
    id: uid,
    status: data.status ?? 'DRAFT',
    visible: state.visible,
    complete: state.complete,
    photos: photos.toSorted((a, b) => a.order - b.order),
    destinations: data.destinations ?? null,
    availability: data.availability ?? null,
    travelers: data.travelers ?? null,
    declarationVersion: (home.declaration as { version?: string } | undefined)?.version ?? null,
    locationCheck: (home.locationCheck as { status?: string } | undefined)?.status ?? 'NONE',
    moderationHold: hold?.active ? { reason: hold.reason } : null,
    visibilityProblems: state.problems,
  });
}
