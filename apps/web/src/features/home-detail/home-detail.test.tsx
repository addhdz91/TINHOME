import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderRoutesWithAuth } from '@/test/render';
import { signedIn } from '@/test/session';
import { homeDetailRoutes } from './routes';

const callables = vi.hoisted(() => ({ getHomeDetail: vi.fn(), passHome: vi.fn() }));
vi.mock('@/lib/callables', () => callables);

const routes = [{ path: '/app', children: homeDetailRoutes }];
const detail = {
  home: {
    homeId: 'h1',
    ownerUid: 'h1',
    title: 'Ático con terraza junto al Turia',
    description: 'Ático luminoso.',
    cityId: 'valencia',
    cityName: 'Valencia',
    zone: 'Ruzafa',
    type: 'PENTHOUSE',
    sizeM2: 85,
    bedrooms: 2,
    beds: 3,
    bathrooms: 1,
    maxGuests: 4,
    petsAllowed: true,
    amenities: ['WIFI', 'TERRACE'],
    houseRules: 'Silencio a partir de las 23:00.',
    photos: [{ thumbUrl: 't', cardUrl: '/c.webp', fullUrl: '/f.webp', width: 1080, height: 1350 }],
    destinations: { mode: 'LIST', cityIds: ['madrid'] },
    availability: { windowIds: [], ranges: [{ start: '2027-07-01', end: '2027-07-15' }] },
    rating: null,
    isTop: false,
  },
  host: {
    uid: 'h1',
    displayName: 'Javier S.',
    photoUrl: null,
    about: 'Me encanta Madrid.',
    languages: ['es'],
    travelsWith: null,
    memberSince: '2026-10-01T00:00:00.000Z',
    identityVerified: true,
    foundingMember: true,
    isTopHost: false,
    ratingAvg: null,
    reviewsCount: 0,
  },
  reviews: [],
  relation: { liked: false, passed: false, matchId: null },
  compatibility: {
    perfectFit: false,
    mutualDestination: false,
    wantsYourCity: true,
    sharedWindowIds: [],
    overlapDays: 0,
    petsOk: true,
    capacityOk: true,
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  callables.getHomeDetail.mockResolvedValue(detail);
});

describe('HomeDetailPage (S-06, FR-22)', () => {
  it('shows features, availability, wishes and the host, never an address', async () => {
    renderRoutesWithAuth(
      routes,
      '/app/casa/h1',
      signedIn({
        city: {
          id: 'madrid',
          name: 'Madrid',
          status: 'OPEN',
          progress: { count: 1, threshold: 150 },
        },
      }),
    );
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Ático con terraza junto al Turia' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Valencia · Ruzafa')).toBeInTheDocument();
    expect(screen.getByText('Quiere viajar a Madrid')).toBeInTheDocument();
    expect(screen.getByText('Quiere venir a Madrid')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Anfitrión: Javier S.' })).toBeInTheDocument();
    expect(screen.getAllByText('Fundador').length).toBeGreaterThan(0);
    expect(screen.getByText('Todavía no tiene valoraciones.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Me gusta' })).toBeInTheDocument();
  });

  it('explains when the home is no longer available', async () => {
    callables.getHomeDetail.mockRejectedValue(
      Object.assign(new Error('x'), { details: { code: 'E_NOT_FOUND' } }),
    );
    renderRoutesWithAuth(routes, '/app/casa/h1', signedIn());
    expect(
      await screen.findByRole('heading', { name: 'Esta casa ya no está disponible' }),
    ).toBeInTheDocument();
  });
});
