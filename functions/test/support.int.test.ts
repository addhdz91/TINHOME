import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fixedClock, resetClock, setClock } from '../src/core/clock.js';
import { db } from '../src/core/firebase.js';
import { alertDeadlines } from '../src/modules/moderation/jobs.js';
import {
  addComplaintMessage,
  adminGetComplaint,
  adminListComplaints,
  adminListFaqs,
  adminReplyComplaint,
  adminUpsertFaq,
  getComplaint,
  listMyComplaints,
  rateFaq,
  submitComplaint,
  submitPublicReport,
} from '../src/modules/support/callables.js';
import { seedEligible } from './fixtures.js';
import {
  authedRequest,
  clearFirestore,
  errorCode,
  publicRequest,
  seedLegal,
  seedWaitlistFixtures,
  type TestToken,
} from './helpers.js';

const token = (uid: string): TestToken => ({
  uid,
  email: `${uid}@ejemplo.es`,
  email_verified: true,
});
const laura = token('laura');
const javier = token('javier');
const admin: TestToken = {
  uid: 'admin',
  email_verified: true,
  role: 'admin',
  firebase: { sign_in_second_factor: 'totp' },
};
const complaint = {
  category: 'PREMIUM_BILLING' as const,
  subject: 'Cobro duplicado',
  description: 'Me habéis cobrado dos veces la cuota mensual de marzo.',
};

async function mails(): Promise<string[]> {
  return (await db().collection('mailQueue').get()).docs
    .map((d) => `${String(d.get('templateId'))}:${String(d.get('to'))}`)
    .sort();
}

beforeEach(async () => {
  await clearFirestore();
  await seedWaitlistFixtures();
  await seedLegal();
  setClock(fixedClock('2027-03-01T10:00:00+01:00'));
  await seedEligible('laura', 'madrid');
  await seedEligible('javier', 'valencia');
  await db().doc('adminDirectory/admin').set({ email: 'admin@tinhome.es', role: 'admin' });
});

afterEach(() => resetClock());

describe('complaints (FR-67, BR-43)', () => {
  it('gets a tracking number, a deadline and an acknowledgement', async () => {
    const first = await submitComplaint.run(authedRequest(complaint, laura));
    expect(first).toMatchObject({ number: 'TH-2027-000001', dueAt: '2027-03-16T09:00:00.000Z' });
    const second = await submitComplaint.run(authedRequest(complaint, javier));
    expect(second.number).toBe('TH-2027-000002');
    expect(await mails()).toEqual(['N-25:javier@ejemplo.es', 'N-25:laura@ejemplo.es']);
    const mine = await listMyComplaints.run(authedRequest({}, laura));
    expect(mine.items.map((t) => t.number)).toEqual(['TH-2027-000001']);
    expect(
      await errorCode(getComplaint.run(authedRequest({ ticketId: first.ticketId }, javier))),
    ).toBe('E_NOT_FOUND');
  });

  it('visitors must leave an e-mail', async () => {
    expect(await errorCode(submitComplaint.run(publicRequest(complaint)))).toBe('E_VALIDATION');
    const visitor = await submitComplaint.run(
      publicRequest({ ...complaint, email: 'visitante@ejemplo.es', name: 'Ana' }),
    );
    expect(visitor.number).toMatch(/^TH-2027-\d{6}$/);
    expect(await mails()).toEqual(['N-25:visitante@ejemplo.es']);
  });

  it('thread: the team asks, the person answers, resolving closes the ticket', async () => {
    const { ticketId } = await submitComplaint.run(authedRequest(complaint, laura));
    const queue = await adminListComplaints.run(authedRequest({ limit: 20 }, admin));
    expect(queue.items.map((t) => t.id)).toEqual([ticketId]);
    await adminReplyComplaint.run(
      authedRequest(
        { ticketId, text: '¿Nos envías el justificante?', status: 'WAITING_USER' },
        admin,
      ),
    );
    setClock(fixedClock('2027-03-02T10:00:00+01:00'));
    await addComplaintMessage.run(authedRequest({ ticketId, text: 'Adjunto el extracto.' }, laura));
    let detail = await getComplaint.run(authedRequest({ ticketId }, laura));
    expect(detail.ticket.status).toBe('IN_REVIEW');
    expect(detail.messages.map((m) => m.authorType)).toEqual(['ADMIN', 'USER']);
    await adminReplyComplaint.run(
      authedRequest(
        { ticketId, text: 'Te hemos devuelto el cobro duplicado.', status: 'RESOLVED' },
        admin,
      ),
    );
    expect(
      await errorCode(addComplaintMessage.run(authedRequest({ ticketId, text: 'Gracias' }, laura))),
    ).toBe('E_TICKET_CLOSED');
    detail = await adminGetComplaint.run(authedRequest({ ticketId }, admin));
    expect(detail.ticket.status).toBe('RESOLVED');
    const notices = await db().collection('notifications/laura/items').get();
    expect(notices.docs.map((d) => d.get('type') as string)).toEqual(['N-25', 'N-25']);
  });

  it('J-12 alerts the team 24 h before the deadline', async () => {
    await submitComplaint.run(authedRequest(complaint, laura));
    expect(await alertDeadlines(db(), new Date('2027-03-14T09:00:00Z'))).toBe(0);
    expect(await alertDeadlines(db(), new Date('2027-03-15T10:00:00Z'))).toBe(1);
    const alerts = await db().collection('adminAlerts').get();
    expect(alerts.docs.map((d) => d.get('type') as string)).toEqual(['COMPLAINT_DUE']);
  });
});

describe('FAQ (FR-66)', () => {
  it('admins create and edit articles; anyone rates published ones', async () => {
    const article = {
      slug: 'como-cancelar-premium',
      category: 'PREMIUM_PAYMENTS' as const,
      question: '¿Cómo cancelo Premium?',
      answerMarkdown: 'Desde **Perfil › Premium › Gestionar suscripción**.',
      order: 1,
      published: false,
      tags: ['premium'],
    };
    await adminUpsertFaq.run(authedRequest(article, admin));
    expect(await errorCode(rateFaq.run(publicRequest({ slug: article.slug, helpful: true })))).toBe(
      'E_NOT_FOUND',
    );
    await adminUpsertFaq.run(authedRequest({ ...article, published: true }, admin));
    await rateFaq.run(publicRequest({ slug: article.slug, helpful: true }));
    await rateFaq.run(publicRequest({ slug: article.slug, helpful: false }));
    await adminUpsertFaq.run(authedRequest({ ...article, published: true, order: 2 }, admin));
    const list = await adminListFaqs.run(authedRequest({}, admin));
    expect(list.items.find((f) => f.slug === article.slug)).toMatchObject({
      order: 2,
      helpfulYes: 1,
      helpfulNo: 1,
    });
    expect(await errorCode(adminUpsertFaq.run(authedRequest(article, laura)))).toBe(
      'E_ROLE_REQUIRED',
    );
  });
});

describe('public report (FR-43)', () => {
  it('links the URL to a home, acknowledges by e-mail and limits by IP', async () => {
    const input = {
      name: 'Visitante',
      email: 'visitante@ejemplo.es',
      targetUrl: 'https://tinhome.es/app/casa/javier',
      reason: 'PHOTOS_NOT_OWN' as const,
      description: 'Estas fotos son de mi piso, no de esta persona.',
      goodFaith: true as const,
    };
    const { reportId } = await submitPublicReport.run(publicRequest(input, '198.51.100.9'));
    const report = (await db().doc(`reports/${reportId}`).get()).data();
    expect(report).toMatchObject({
      public: true,
      targetType: 'HOME',
      targetUid: 'javier',
      priority: 'HIGH',
    });
    // Not verified: no preventive hold (BR-42).
    expect((await db().doc('homes/javier').get()).get('moderationHold')).toBeNull();
    expect(await mails()).toEqual(['N-14:visitante@ejemplo.es', 'N-26:admin@tinhome.es']);
    await submitPublicReport.run(publicRequest(input, '198.51.100.9'));
    await submitPublicReport.run(publicRequest(input, '198.51.100.9'));
    expect(await errorCode(submitPublicReport.run(publicRequest(input, '198.51.100.9')))).toBe(
      'E_RATE_LIMIT',
    );
  });
});
