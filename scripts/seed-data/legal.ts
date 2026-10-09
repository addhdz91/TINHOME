import type { LegalDocSlug } from '@tinhome/shared/constants';

/**
 * LEG-03 — PROVISIONAL drafts. TinHome never writes final legal clauses: these documents
 * only provide the structure (headings) so the mechanism can be built and tested. The
 * lawyer's texts are published later from the admin panel (FR-56).
 */
export const LEGAL_VERSION = '0.1-provisional';

const PROVISIONAL =
  '> **PROVISIONAL** — Texto pendiente de redacción y validación por el abogado (LEG-03). No es el texto definitivo.';

function draft(title: string, sections: string[]): string {
  return [
    `# ${title}`,
    '',
    PROVISIONAL,
    '',
    ...sections.flatMap((section) => [`## ${section}`, '', '_Pendiente._', '']),
  ].join('\n');
}

/**
 * FR-58 demo: the current Terms version requires re-acceptance, so a user who accepted an older
 * version (marta@demo.tinhome) sees the blocking modal. New sign-ups accept the current one.
 */
export const REACCEPTANCE: Partial<Record<LegalDocSlug, string>> = {
  terminos: 'Ejemplo del seed: aclaramos cómo funciona la verificación de identidad y de la casa.',
};

export const LEGAL_DOCS: Record<LegalDocSlug, { title: string; markdown: string }> = {
  'aviso-legal': {
    title: 'Aviso legal',
    markdown: draft('Aviso legal', [
      'Titular del sitio',
      'Objeto',
      'Propiedad intelectual',
      'Legislación aplicable',
    ]),
  },
  terminos: {
    title: 'Términos y condiciones',
    markdown: draft('Términos y condiciones', [
      'Qué es TinHome',
      'TinHome no es parte del acuerdo entre usuarios',
      'Cuenta y verificación',
      'Premium: precio, renovación, cancelación y desistimiento',
      'Normas de uso y moderación',
      'Responsabilidad',
    ]),
  },
  privacidad: {
    title: 'Política de privacidad',
    markdown: draft('Política de privacidad', [
      'Responsable del tratamiento',
      'Qué datos tratamos y para qué',
      'Lista de espera',
      'Base jurídica',
      'Encargados y transferencias',
      'Conservación',
      'Tus derechos',
    ]),
  },
  cookies: {
    title: 'Política de cookies',
    markdown: draft('Política de cookies', [
      'Solo usamos cookies técnicas',
      'Almacenamiento local del navegador',
    ]),
  },
  'normas-comunidad': {
    title: 'Normas de la comunidad',
    markdown: draft('Normas de la comunidad', [
      'Respeto',
      'Casas reales y fotos propias',
      'Nada de dinero entre usuarios',
      'Qué pasa si no se cumplen',
    ]),
  },
  'info-dsa': {
    title: 'Información DSA',
    markdown: draft('Información sobre la Ley de Servicios Digitales', [
      'Punto de contacto',
      'Cómo denunciar contenido',
      'Cómo moderamos',
      'Cómo recurrir una decisión',
    ]),
  },
  'declaracion-responsable': {
    title: 'Declaración responsable',
    markdown: draft('Declaración responsable', ['Qué declaras al publicar tu casa']),
  },
  'autorizacion-arrendador': {
    title: 'Modelo de autorización del arrendador',
    markdown: draft('Modelo de autorización del arrendador', [
      'Datos del arrendador',
      'Datos del inquilino',
      'Autorización',
      'Firma',
    ]),
  },
  'acuerdo-intercambio': {
    title: 'Acuerdo de intercambio (plantilla)',
    markdown: draft('Acuerdo de intercambio', [
      'Partes',
      'Casas y fechas',
      'Personas y mascotas',
      'Normas de la casa',
      'Firma',
    ]),
  },
};
