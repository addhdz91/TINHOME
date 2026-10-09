import type { FaqCategory } from '@tinhome/shared/constants';

/** FR-66 — sample help articles (product help, not legal text). Editable from admin in M9. */
export const FAQS: Record<
  string,
  { category: FaqCategory; question: string; answerMarkdown: string; order: number; tags: string[] }
> = {
  'que-es-tinhome': {
    category: 'START',
    order: 1,
    tags: ['empezar', 'intercambio'],
    question: '¿Qué es TinHome?',
    answerMarkdown:
      'TinHome es una app para que personas que viven en España **intercambien sus casas** para viajar. Publicas tu casa, descubres casas de personas verificadas y, si os gustáis mutuamente, hacéis match y habláis por el chat.\n\nTinHome os pone en contacto; **el acuerdo lo cerráis vosotros**.',
  },
  'cuanto-cuesta': {
    category: 'START',
    order: 2,
    tags: ['precio', 'gratis', 'premium'],
    question: '¿Cuánto cuesta usar TinHome?',
    answerMarkdown:
      'Crear la cuenta, publicar tu casa, verificarte, hacer match y chatear no cuesta nada. **Premium** es opcional y te da me gusta ilimitados, ver quién te ha dado me gusta y más visibilidad. Consulta los precios en [Precios](/precios).',
  },
  'como-funciona-la-verificacion': {
    category: 'VERIFICATION',
    order: 1,
    tags: ['identidad', 'dni', 'nie', 'documentos', 'verificar'],
    question: '¿Cómo funciona la verificación?',
    answerMarkdown:
      'Para que todos sepamos con quién hablamos, verificamos tres cosas:\n\n1. **Tu teléfono**, con un código por SMS.\n2. **Tu identidad**: DNI o NIE y un selfie con el documento. Lo revisa **una persona del equipo**, no un algoritmo.\n3. **Tu casa**: un documento que acredite tu relación con ella y una comprobación de ubicación desde el móvil.\n\nBorramos los documentos 30 días después de revisarlos.',
  },
  'soy-inquilino': {
    category: 'VERIFICATION',
    order: 2,
    tags: ['alquiler', 'arrendador', 'autorización', 'inquilino'],
    question: 'Vivo en una casa que no es mía, ¿puedo participar?',
    answerMarkdown:
      'Sí, si tienes la **autorización escrita de la persona propietaria**. Te damos un modelo para que te la firme y la subes durante la verificación.',
  },
  'mi-casa-no-aparece': {
    category: 'VERIFICATION',
    order: 3,
    tags: ['visible', 'publicar', 'casa', 'no se ve'],
    question: 'Mi casa no aparece a otras personas, ¿por qué?',
    answerMarkdown:
      'Tu casa se muestra cuando: está **publicada**, tu **identidad** está aprobada y la **ubicación** de la casa está verificada. Mira en tu perfil qué te falta; te lo indicamos paso a paso.',
  },
  'que-es-un-match': {
    category: 'LIKES_MATCH',
    order: 1,
    tags: ['match', 'me gusta', 'deslizar'],
    question: '¿Qué es un match?',
    answerMarkdown:
      'Cuando a ti te gusta la casa de otra persona y a ella le gusta la tuya, es un **match**. A partir de ahí podéis hablar por el chat y acordar las fechas.',
  },
  'seguridad-en-el-chat': {
    category: 'CHAT_SAFETY',
    order: 1,
    tags: ['seguridad', 'dinero', 'pagos', 'chat'],
    question: '¿Qué hago si alguien me pide dinero?',
    answerMarkdown:
      'TinHome no participa en el acuerdo y **nunca debes pagar ni enviar dinero a otro usuario**. Si alguien te lo pide, denúncialo desde el chat en dos toques y bloquéale si quieres.',
  },
  'como-acordar-un-intercambio': {
    category: 'EXCHANGES',
    order: 1,
    tags: ['fechas', 'acuerdo', 'intercambio'],
    question: '¿Cómo acordamos un intercambio?',
    answerMarkdown:
      'Hablad por el chat y acordad las fechas, cuántas personas vais y las normas de cada casa. Después podéis **declarar el intercambio** en la app para que, al terminar, os podáis valorar.',
  },
  'premium-y-pagos': {
    category: 'PREMIUM_PAYMENTS',
    order: 1,
    tags: ['premium', 'pago', 'cancelar', 'suscripción'],
    question: '¿Cómo funciona Premium y cómo lo cancelo?',
    answerMarkdown:
      'Premium es una suscripción mensual o anual con IVA incluido. Puedes cancelarla cuando quieras desde la app y sigue activa hasta el final del periodo pagado, sin permanencia.',
  },
  'que-datos-guardais': {
    category: 'PRIVACY',
    order: 1,
    tags: ['datos', 'privacidad', 'dirección'],
    question: '¿Mostráis mi dirección?',
    answerMarkdown:
      'No. En tu ficha solo aparecen la **ciudad y la zona**. La dirección se la das tú a la otra persona cuando hayáis acordado el intercambio. Más detalles en la [Política de privacidad](/legal/privacidad).',
  },
  'como-denunciar': {
    category: 'REPORTS',
    order: 1,
    tags: ['denunciar', 'denuncia', 'bloquear', 'reportar'],
    question: '¿Cómo denuncio a alguien o un contenido?',
    answerMarkdown:
      'Desde cualquier casa, perfil, valoración o mensaje, toca **Denunciar** y elige el motivo. Lo revisa el equipo y te informamos del resultado. Si no tienes cuenta, consulta la [información DSA](/legal/info-dsa).',
  },
};
