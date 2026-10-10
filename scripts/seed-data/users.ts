import type { AdminRole } from '@tinhome/shared/constants';

/**
 * CLAUDE.md §3 demo users (emulator only). The password `Demo1234!` predates the FR-71 policy
 * (≥ 10 characters); accounts created by the seed are not subject to it (10_DECISIONS §5).
 */
export const DEMO_PASSWORD = 'Demo1234!';

export interface DemoUser {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  phone: string;
  cityId: string;
  referralCode: string;
  premiumMonths: number;
  role: AdminRole | null;
  /** Accepted Terms version; an older one makes the re-acceptance modal appear (FR-58). */
  acceptedTerms: 'current' | '0.0-provisional';
  theme: 'system' | 'light' | 'dark' | 'black';
}

export const DEMO_USERS: DemoUser[] = [
  {
    uid: 'demo-laura',
    email: 'laura@demo.tinhome',
    firstName: 'Laura',
    lastName: 'Martín',
    birthDate: '1991-04-12',
    phone: '+34600000001',
    cityId: 'madrid',
    referralCode: 'CASAMAD2',
    premiumMonths: 0,
    role: null,
    acceptedTerms: 'current',
    theme: 'system',
  },
  {
    uid: 'demo-javier',
    email: 'javier@demo.tinhome',
    firstName: 'Javier',
    lastName: 'Soler',
    birthDate: '1987-09-30',
    phone: '+34600000002',
    cityId: 'valencia',
    referralCode: 'JAVSVC23',
    premiumMonths: 12,
    role: null,
    acceptedTerms: 'current',
    theme: 'system',
  },
  {
    uid: 'demo-admin',
    email: 'admin@demo.tinhome',
    firstName: 'Admin',
    lastName: 'TinHome',
    birthDate: '1985-01-15',
    phone: '+34600000003',
    cityId: 'madrid',
    referralCode: 'ADMN2345',
    premiumMonths: 0,
    role: 'superadmin',
    acceptedTerms: 'current',
    theme: 'system',
  },
  {
    uid: 'demo-marta',
    email: 'marta@demo.tinhome',
    firstName: 'Marta',
    lastName: 'Ruiz',
    birthDate: '1995-06-21',
    phone: '+34600000004',
    cityId: 'valencia',
    referralCode: 'MRTA2345',
    premiumMonths: 0,
    role: null,
    acceptedTerms: '0.0-provisional',
    theme: 'dark',
  },
  {
    // Starts at step 3 without a home; E2E-03 publishes a home with it.
    uid: 'demo-pablo',
    email: 'pablo@demo.tinhome',
    firstName: 'Pablo',
    lastName: 'Gil',
    birthDate: '1989-11-03',
    phone: '+34600000005',
    cityId: 'madrid',
    referralCode: 'PBGX2345',
    premiumMonths: 0,
    role: null,
    acceptedTerms: 'current',
    theme: 'light',
  },
];
