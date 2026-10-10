import type { Amenity, HomeType } from '@tinhome/shared/constants';
import type { DemoHome } from './homes.js';

/**
 * 60 sample homes (30 Madrid, 30 Valencia) for Discover and Explore (M5). Owners exist only in
 * Firestore (no sign-in). Deterministic: the same seed always produces the same catalogue.
 */
export interface CatalogHome extends DemoHome {
  firstName: string;
  lastInitial: string;
  rating: { avg: number; count: number };
  isTop: boolean;
  ownerPremium: boolean;
  foundingMember: boolean;
  daysSincePublished: number;
  ranges: { start: string; end: string }[];
}

const ZONES = {
  madrid: [
    'Chamberí',
    'Malasaña',
    'Lavapiés',
    'Retiro',
    'Salamanca',
    'Arganzuela',
    'Chamartín',
    'Tetuán',
    'Moncloa',
    'La Latina',
  ],
  valencia: [
    'Ruzafa',
    'El Carmen',
    'Benimaclet',
    'Cabanyal',
    'Patraix',
    'Campanar',
    'Ciutat Vella',
    'Algirós',
    'Extramurs',
    'La Saïdia',
  ],
} as const;

const NAMES = [
  'Lucía',
  'Hugo',
  'Carmen',
  'Mateo',
  'Elena',
  'Daniel',
  'Sara',
  'Álvaro',
  'Paula',
  'Diego',
  'Irene',
  'Pablo',
  'Nuria',
  'Adrián',
  'Claudia',
];
const INITIALS = 'ABCDEFGHIJLMNOPRSTV';
const TYPES: HomeType[] = ['FLAT', 'FLAT', 'FLAT', 'PENTHOUSE', 'STUDIO', 'DUPLEX', 'HOUSE'];
const TITLE: Record<HomeType, string> = {
  FLAT: 'Piso luminoso',
  PENTHOUSE: 'Ático con terraza',
  STUDIO: 'Estudio acogedor',
  DUPLEX: 'Dúplex amplio',
  HOUSE: 'Casa con patio',
  VILLA: 'Chalet tranquilo',
  OTHER: 'Vivienda con encanto',
};
const AMENITY_SETS: Amenity[][] = [
  ['WIFI', 'KITCHEN', 'WASHER', 'HEATING'],
  ['WIFI', 'KITCHEN', 'AIR_CONDITIONING', 'ELEVATOR', 'WORKSPACE'],
  ['WIFI', 'KITCHEN', 'TERRACE', 'KIDS_FRIENDLY'],
  ['WIFI', 'KITCHEN', 'WASHER', 'POOL', 'PARKING'],
  ['WIFI', 'KITCHEN', 'ACCESSIBLE', 'ELEVATOR'],
];
const WINDOW_SETS = [
  ['semana-santa-2027'],
  ['puente-mayo-2027'],
  ['semana-santa-2027', 'puente-mayo-2027'],
  [],
];

function pick<T>(list: readonly T[], i: number): T {
  const value = list[i % list.length];
  if (value === undefined) throw new Error('empty list');
  return value;
}

export function buildCatalog(): CatalogHome[] {
  return Array.from({ length: 60 }, (_, i) => {
    const madrid = i < 30;
    const cityId = madrid ? 'madrid' : 'valencia';
    const other = madrid ? 'valencia' : 'madrid';
    const zone = pick(ZONES[cityId], i * 7);
    const type = pick(TYPES, i * 3);
    const bedrooms = type === 'STUDIO' ? 0 : 1 + (i % 3);
    const count = i % 4 === 0 ? 0 : 1 + (i % 6);
    const avg = count === 0 ? 0 : Math.round((4 + ((i * 37) % 10) / 10) * 10) / 10;
    const windowIds = pick(WINDOW_SETS, i);
    // Most owners want the other city of the corridor (perfect fits); some want any open city
    // and a few only Málaga (still on the waitlist), so they are never a perfect fit.
    const anyOpen = i % 9 === 0;
    const destinations = anyOpen ? [] : i % 10 === 3 ? ['malaga'] : [other];
    return {
      ownerUid: `seed-owner-${String(i + 1).padStart(2, '0')}`,
      firstName: pick(NAMES, i),
      lastInitial: pick(INITIALS.split(''), i * 5),
      title: `${TITLE[type]} en ${zone}`,
      description: `${TITLE[type]} en ${zone}, a pocos minutos a pie del transporte público. Tiene mucha luz natural, una cocina completa y un barrio con mercados, parques y terrazas para disfrutar sin prisas.`,
      cityId,
      zone,
      type,
      sizeM2: type === 'STUDIO' ? 35 + (i % 10) : 55 + ((i * 13) % 90),
      bedrooms,
      beds: Math.max(1, bedrooms + (i % 2)),
      bathrooms: 1 + Number(bedrooms > 2),
      maxGuests: Math.max(1, Math.min(8, bedrooms * 2 + (i % 2))),
      petsAllowed: i % 3 === 0,
      amenities: pick(AMENITY_SETS, i),
      houseRules:
        i % 2 === 0 ? 'No se puede fumar dentro de casa. Silencio a partir de las 23:00.' : '',
      photoCount: 5 + (i % 4),
      destinations,
      anyOpen,
      windowIds,
      travelers: { count: 1 + (i % 4), withPet: i % 6 === 0 },
      locationCheck: 'PASS',
      rating: { avg, count },
      isTop: count >= 3 && avg >= 4.5,
      ownerPremium: i % 7 === 0,
      foundingMember: i % 11 === 0,
      daysSincePublished: 1 + ((i * 11) % 80),
      ranges: i % 8 === 0 ? [{ start: '2027-07-01', end: '2027-07-15' }] : [],
    };
  });
}
