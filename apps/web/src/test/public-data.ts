import { PARAM_DEFAULTS, toPublicConfig } from '@tinhome/shared/constants';

/** In-memory replacement of the public Firestore data (mirrors scripts/seed-data). */
const city = (
  name: string,
  status: string,
  order: number,
  visibleCandidates: number,
  waitlist = 0,
) => ({
  name,
  province: name,
  region: name,
  timezone: 'Europe/Madrid',
  center: { lat: 40, lng: -3 },
  radiusKm: 25,
  status,
  openThreshold: 150,
  counters: { visibleCandidates, waitlist, foundersAwarded: 0 },
  order,
});

export const PUBLIC_DOCS: Record<string, Record<string, unknown>> = {
  'config/public': toPublicConfig(PARAM_DEFAULTS),
  'cities/madrid': city('Madrid', 'OPEN', 1, 162),
  'cities/valencia': city('Valencia', 'OPEN', 2, 151),
  'cities/malaga': city('Málaga', 'WAITLIST', 3, 87, 214),
  'windows/semana-santa-2027': {
    name: 'Semana Santa 2027',
    startDate: '2027-03-20',
    endDate: '2027-03-28',
    active: true,
    cityIds: null,
    order: 1,
  },
  'demandStats/valencia_madrid_semana-santa-2027': {
    fromCityId: 'valencia',
    toCityId: 'madrid',
    windowId: 'semana-santa-2027',
    count: 47,
  },
  'demandStats/malaga_madrid_semana-santa-2027': {
    fromCityId: 'malaga',
    toCityId: 'madrid',
    windowId: 'semana-santa-2027',
    count: 3,
  },
  'legalDocs/privacidad': { title: 'Política de privacidad', currentVersion: '0.1-provisional' },
  'legalDocs/terminos': { title: 'Términos y condiciones', currentVersion: '0.1-provisional' },
  'legalDocs/declaracion-responsable': {
    title: 'Declaración responsable',
    currentVersion: '0.1-provisional',
  },
  'legalDocs/terminos/versions/0.1-provisional': {
    markdown: '# Términos y condiciones\n\n> **PROVISIONAL**',
    requiresReacceptance: true,
    changeSummary: 'Aclaramos cómo funciona la verificación.',
  },
  'legalDocs/privacidad/versions/0.1-provisional': {
    markdown:
      '# Política de privacidad\n\n> **PROVISIONAL**\n\n## Responsable\n\nTexto <script>alert(1)</script> [enlace](javascript:alert(1)) y [web](https://example.com).',
    requiresReacceptance: false,
    publishedAt: { toDate: () => new Date('2026-10-09T10:00:00Z') },
  },
};

export async function readPublicDoc(path: string): Promise<Record<string, unknown> | null> {
  return Promise.resolve(PUBLIC_DOCS[path] ?? null);
}

export async function readPublicCollection(
  path: string,
): Promise<{ id: string; data: Record<string, unknown> }[]> {
  const prefix = `${path}/`;
  return Promise.resolve(
    Object.entries(PUBLIC_DOCS)
      .filter(([key]) => key.startsWith(prefix) && !key.slice(prefix.length).includes('/'))
      .map(([key, data]) => ({ id: key.slice(prefix.length), data })),
  );
}

export const orderBy = (): null => null;
export const where = (): null => null;
export const limit = (): null => null;
