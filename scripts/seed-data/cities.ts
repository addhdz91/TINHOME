import type { CityDoc, WindowDoc } from '@tinhome/shared/types';

/** 03_TECHNICAL_SPEC.md §13 — corridor Madrid ⇄ Valencia (DEC-81) + two cities on the waitlist. */
export const CITIES: Record<string, CityDoc> = {
  madrid: {
    name: 'Madrid',
    province: 'Madrid',
    region: 'Comunidad de Madrid',
    timezone: 'Europe/Madrid',
    center: { lat: 40.4168, lng: -3.7038 },
    radiusKm: 25,
    status: 'OPEN',
    openThreshold: 150,
    counters: { visibleCandidates: 162, waitlist: 412, foundersAwarded: 0 },
    order: 1,
  },
  valencia: {
    name: 'Valencia',
    province: 'Valencia',
    region: 'Comunitat Valenciana',
    timezone: 'Europe/Madrid',
    center: { lat: 39.4699, lng: -0.3763 },
    radiusKm: 25,
    status: 'OPEN',
    openThreshold: 150,
    counters: { visibleCandidates: 151, waitlist: 356, foundersAwarded: 0 },
    order: 2,
  },
  malaga: {
    name: 'Málaga',
    province: 'Málaga',
    region: 'Andalucía',
    timezone: 'Europe/Madrid',
    center: { lat: 36.7213, lng: -4.4214 },
    radiusKm: 25,
    status: 'WAITLIST',
    openThreshold: 150,
    counters: { visibleCandidates: 87, waitlist: 214, foundersAwarded: 0 },
    order: 3,
  },
  barcelona: {
    name: 'Barcelona',
    province: 'Barcelona',
    region: 'Cataluña',
    timezone: 'Europe/Madrid',
    center: { lat: 41.3874, lng: 2.1686 },
    radiusKm: 25,
    status: 'WAITLIST',
    openThreshold: 150,
    counters: { visibleCandidates: 43, waitlist: 298, foundersAwarded: 0 },
    order: 4,
  },
};

/** 03 §13 — exchange windows for 2027. */
export const WINDOWS: Record<
  string,
  Omit<WindowDoc, 'startDate' | 'endDate'> & { startDate: string; endDate: string }
> = {
  'semana-santa-2027': {
    name: 'Semana Santa 2027',
    startDate: '2027-03-20',
    endDate: '2027-03-28',
    active: true,
    cityIds: null,
    order: 1,
  },
  'puente-mayo-2027': {
    name: 'Puente de mayo 2027',
    startDate: '2027-04-30',
    endDate: '2027-05-03',
    active: true,
    cityIds: null,
    order: 2,
  },
  'agosto-1-2027': {
    name: 'Primera quincena de agosto 2027',
    startDate: '2027-08-01',
    endDate: '2027-08-15',
    active: true,
    cityIds: null,
    order: 3,
  },
  'agosto-2-2027': {
    name: 'Segunda quincena de agosto 2027',
    startDate: '2027-08-16',
    endDate: '2027-08-31',
    active: true,
    cityIds: null,
    order: 4,
  },
};

/** FR-18 sample demand. The last pair stays below P-18 and must not be published. */
export const DEMAND: { from: string; to: string; window: string; count: number }[] = [
  { from: 'valencia', to: 'madrid', window: 'semana-santa-2027', count: 47 },
  { from: 'madrid', to: 'valencia', window: 'agosto-1-2027', count: 32 },
  { from: 'malaga', to: 'madrid', window: 'puente-mayo-2027', count: 12 },
  { from: 'barcelona', to: 'valencia', window: 'semana-santa-2027', count: 3 },
];
