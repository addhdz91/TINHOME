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
}

/** Homes of the CLAUDE.md demo users. Laura and Marta start without one to try step 3. */
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
  },
];
