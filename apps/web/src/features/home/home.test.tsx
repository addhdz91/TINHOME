import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { HomeOwnerView } from '@tinhome/shared/schemas';
import { renderRoutesWithAuth } from '@/test/render';
import { signedIn } from '@/test/session';
import { PublishReview } from './components/PublishReview';
import { TravelPrefsForm } from './components/TravelPrefsForm';
import { homeRoutes } from './routes';

vi.mock('@/lib/firebase', () => ({ firebase: () => ({ db: {} }) }));
vi.mock('firebase/firestore', () => ({ doc: vi.fn(), onSnapshot: vi.fn(() => () => undefined) }));
const callables = vi.hoisted(() => ({
  getMyHome: vi.fn(),
  pauseHome: vi.fn(),
  unpauseHome: vi.fn(),
  acceptDeclaration: vi.fn(async () => ({ ok: true })),
  publishHome: vi.fn(),
}));
vi.mock('@/lib/callables', () => callables);

const photo = (id: string) => ({
  id,
  order: Number(id),
  thumbUrl: `/t/${id}.webp`,
  cardUrl: `/c/${id}.webp`,
  fullUrl: `/f/${id}.webp`,
  width: 1080,
  height: 1350,
});

function makeHome(overrides: Partial<HomeOwnerView> = {}): HomeOwnerView {
  return {
    id: 'laura',
    status: 'DRAFT',
    visible: false,
    complete: true,
    title: 'Piso luminoso en Chamberí',
    description: 'Piso tranquilo con mucha luz, cerca del metro y de parques para pasear.',
    cityId: 'madrid',
    zone: 'Chamberí',
    type: 'FLAT',
    tenure: 'OWNER',
    residenceUse: 'PRIMARY',
    sizeM2: 70,
    bedrooms: 2,
    beds: 2,
    bathrooms: 1,
    maxGuests: 4,
    petsAllowed: false,
    amenities: [],
    houseRules: '',
    photos: ['1', '2', '3', '4', '5'].map(photo),
    destinations: null,
    availability: null,
    travelers: null,
    declarationVersion: null,
    locationCheck: 'NONE',
    moderationHold: null,
    visibilityProblems: ['NOT_PUBLISHED'],
    ...overrides,
  };
}

const notFound = Object.assign(new Error('not found'), { details: { code: 'E_NOT_FOUND' } });

beforeEach(() => vi.clearAllMocks());

describe('MyHomePage', () => {
  it('invites the user to create the home when there is none', async () => {
    callables.getMyHome.mockRejectedValue(notFound);
    renderRoutesWithAuth([{ path: '/app', children: homeRoutes }], '/app/mi-casa', signedIn());
    expect(await screen.findByRole('link', { name: 'Crear mi casa' })).toHaveAttribute(
      'href',
      '/app/onboarding/3',
    );
  });

  it('pauses a published home (FR-13)', async () => {
    callables.getMyHome.mockResolvedValue({ home: makeHome({ status: 'PUBLISHED' }) });
    callables.pauseHome.mockResolvedValue({ home: makeHome({ status: 'PAUSED' }) });
    const user = userEvent.setup();
    renderRoutesWithAuth([{ path: '/app', children: homeRoutes }], '/app/mi-casa', signedIn());
    await user.click(await screen.findByRole('button', { name: 'Pausar' }));
    await waitFor(() => expect(callables.pauseHome).toHaveBeenCalled());
    expect(await screen.findByRole('button', { name: 'Reanudar' })).toBeInTheDocument();
  });
});

describe('PublishReview (S-03 step 6)', () => {
  const route = (home: HomeOwnerView, onPublished = vi.fn()) => [
    {
      path: '/',
      element: <PublishReview home={home} photosMin={5} onPublished={onPublished} />,
    },
  ];

  it('needs the responsible declaration before publishing (BR-03)', async () => {
    callables.publishHome.mockResolvedValue({
      home: makeHome({ status: 'PUBLISHED', visibilityProblems: ['IDENTITY'] }),
      visible: false,
      pendingReasons: ['IDENTITY'],
    });
    const onPublished = vi.fn();
    const user = userEvent.setup();
    renderRoutesWithAuth(
      route(makeHome(), onPublished),
      '/',
      signedIn({ verification: { emailVerified: true, phoneVerified: true, identity: 'NONE' } }),
    );
    const publish = await screen.findByRole('button', { name: 'Publicar mi casa' });
    expect(publish).toBeDisabled();
    expect(screen.getByText('Al menos 5 fotos')).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox'));
    await waitFor(() => expect(publish).toBeEnabled());
    await user.click(publish);
    expect(
      await screen.findByRole('heading', { name: '¡Tu casa está publicada!' }),
    ).toBeInTheDocument();
    expect(callables.acceptDeclaration).toHaveBeenCalledWith({ version: '0.1-provisional' });
    expect(onPublished).toHaveBeenCalled();
  });

  it('keeps publishing disabled while the phone is not verified', async () => {
    const user = userEvent.setup();
    renderRoutesWithAuth(route(makeHome()), '/', signedIn());
    await user.click(await screen.findByRole('checkbox'));
    expect(screen.getByRole('button', { name: 'Publicar mi casa' })).toBeDisabled();
    expect(screen.getAllByRole('link', { name: 'Completar' })[0]).toHaveAttribute(
      'href',
      '/app/onboarding/2',
    );
  });
});

describe('TravelPrefsForm', () => {
  it('asks for at least one destination', async () => {
    const onSubmit = vi.fn(async () => undefined);
    const user = userEvent.setup();
    renderRoutesWithAuth(
      [
        {
          path: '/',
          element: (
            <TravelPrefsForm
              home={makeHome()}
              cities={[]}
              windows={[]}
              maxDestinations={3}
              maxRanges={3}
              submitLabel="Guardar"
              onSubmit={onSubmit}
            />
          ),
        },
      ],
      '/',
      signedIn(),
    );
    await user.click(await screen.findByRole('button', { name: 'Guardar' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
