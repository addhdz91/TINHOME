import type { CityStatus } from '../constants/enums.js';
import type { IsoDate } from './common.js';

/** `cities/{slug}` (04 §2.12). Publicly readable. */
export interface CityDoc {
  name: string;
  province: string;
  region: string;
  timezone: 'Europe/Madrid' | 'Atlantic/Canary';
  center: { lat: number; lng: number };
  radiusKm: number;
  status: CityStatus;
  openThreshold: number;
  counters: { visibleCandidates: number; waitlist: number; foundersAwarded: number };
  order: number;
}

/** `windows/{id}` (04 §2.13). Publicly readable. */
export interface WindowDoc {
  name: string;
  startDate: IsoDate;
  endDate: IsoDate;
  active: boolean;
  cityIds: string[] | null;
  order: number;
}

/** `demandStats/{from}_{to}_{window}` (04 §2.14). Only written when count ≥ P-18. */
export interface DemandStatDoc {
  fromCityId: string;
  toCityId: string;
  windowId: string;
  count: number;
}
