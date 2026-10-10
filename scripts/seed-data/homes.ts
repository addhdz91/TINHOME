import type { Amenity, HomeType } from '@tinhome/shared/constants';

/** A demo home (emulator only). Texts follow BR-22: no prices, contacts or renting vocabulary. */
export interface DemoHome {
  ownerUid: string;
  title: string;
  description: string;
  cityId: string;
  zone: string;
  type: HomeType;
  sizeM2: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  maxGuests: number;
  petsAllowed: boolean;
  amenities: Amenity[];
  houseRules: string;
  photoCount: number;
  destinations: string[];
  windowIds: string[];
  travelers: { count: number; withPet: boolean };
  /** FR-63 — `PASS` once the owner checked it at home. */
  locationCheck: 'PASS' | 'NONE';
}

/** Homes of the CLAUDE.md demo users. Laura and Pablo start without one to try step 3. */
export const DEMO_HOMES: DemoHome[] = [
  {
    ownerUid: 'demo-javier',
    title: 'Ático con terraza junto al Turia',
    description:
      'Ático luminoso a cinco minutos del jardín del Turia, con terraza para desayunar al sol, cocina equipada y un barrio tranquilo lleno de cafeterías y mercados.',
    cityId: 'valencia',
    zone: 'Ruzafa',
    type: 'PENTHOUSE',
    sizeM2: 85,
    bedrooms: 2,
    beds: 3,
    bathrooms: 1,
    maxGuests: 4,
    petsAllowed: true,
    amenities: ['WIFI', 'KITCHEN', 'WASHER', 'AIR_CONDITIONING', 'TERRACE', 'WORKSPACE'],
    houseRules: 'Silencio a partir de las 23:00. Riega las plantas de la terraza, por favor.',
    photoCount: 6,
    destinations: ['madrid'],
    windowIds: ['semana-santa-2027', 'puente-mayo-2027'],
    travelers: { count: 2, withPet: true },
    locationCheck: 'PASS',
  },
  {
    // Identity pending in the admin queue: approving it makes this home visible (M4 DoD).
    ownerUid: 'demo-marta',
    title: 'Piso con balcón en el Cabanyal',
    description:
      'Piso tranquilo a dos calles de la playa de la Malvarrosa, con balcón, mucha luz por la mañana y bicicletas para moverse por el barrio marinero.',
    cityId: 'valencia',
    zone: 'Cabanyal',
    type: 'FLAT',
    sizeM2: 70,
    bedrooms: 2,
    beds: 2,
    bathrooms: 1,
    maxGuests: 3,
    petsAllowed: false,
    amenities: ['WIFI', 'KITCHEN', 'WASHER', 'HEATING'],
    houseRules: 'No se puede fumar dentro de casa.',
    photoCount: 5,
    destinations: ['madrid'],
    windowIds: ['semana-santa-2027'],
    travelers: { count: 2, withPet: false },
    locationCheck: 'PASS',
  },
  {
    ownerUid: 'demo-sofia',
    title: 'Estudio luminoso en Lavapiés',
    description:
      'Estudio reformado en una calle tranquila de Lavapiés, con cocina completa, escritorio para teletrabajar y cines, mercados y teatros a un paseo.',
    cityId: 'madrid',
    zone: 'Lavapiés',
    type: 'STUDIO',
    sizeM2: 38,
    bedrooms: 0,
    beds: 1,
    bathrooms: 1,
    maxGuests: 2,
    petsAllowed: true,
    amenities: ['WIFI', 'KITCHEN', 'WORKSPACE', 'AIR_CONDITIONING'],
    houseRules: 'Recicla, por favor: los cubos están en la cocina.',
    photoCount: 5,
    destinations: ['valencia'],
    windowIds: ['puente-mayo-2027'],
    travelers: { count: 1, withPet: true },
    locationCheck: 'NONE',
  },
];
