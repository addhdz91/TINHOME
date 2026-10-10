import { simpleEmail } from '../simple.js';
import type { RenderedEmail } from '../types.js';

export interface ReferralData {
  days: number;
  role: 'INVITER' | 'INVITEE';
  url: string;
}

/** N-13 — referral reward for both people (BR-20). */
export function referral(data: ReferralData): RenderedEmail {
  return simpleEmail({
    subject: `Tienes ${String(data.days)} días de Premium`,
    paragraphs: [
      data.role === 'INVITER'
        ? 'La persona que invitaste ya ha verificado su identidad.'
        : 'Te uniste con una invitación y ya has verificado tu identidad.',
      `Os regalamos ${String(data.days)} días de Premium a las dos personas.`,
    ],
    cta: { label: 'Invitar a más gente', url: data.url },
  });
}
