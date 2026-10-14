import { simpleEmail } from '../simple.js';
import type { RenderedEmail } from '../types.js';

export interface AdminAlertData {
  kind: 'REPORT_HIGH' | 'REPORT_DUE' | 'HOLD_OVERDUE' | 'COMPLAINT_DUE' | 'ESCALATION';
  /** Short label without personal data («Denuncia de prioridad alta: fotos que no son suyas»). */
  summary: string;
  url: string;
}

const SUBJECT: Record<AdminAlertData['kind'], string> = {
  REPORT_HIGH: '[TinHome admin] Denuncia de prioridad alta',
  REPORT_DUE: '[TinHome admin] Denuncia a punto de vencer',
  HOLD_OVERDUE: '[TinHome admin] Retención preventiva vencida',
  COMPLAINT_DUE: '[TinHome admin] Queja a punto de vencer',
  ESCALATION: '[TinHome admin] Plazo superado: requiere superadmin',
};

/** N-26 — admin alert (no content of the report: it is only visible in /admin). */
export function adminAlert(data: AdminAlertData): RenderedEmail {
  return simpleEmail({
    subject: SUBJECT[data.kind],
    paragraphs: [data.summary, 'Ábrelo en el panel de administración para revisarlo.'],
    cta: { label: 'Abrir en /admin', url: data.url },
    footer: 'Recibes este email porque eres administrador de TinHome.',
  });
}
