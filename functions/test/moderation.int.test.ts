import { Timestamp } from 'firebase-admin/firestore';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fixedClock, resetClock, setClock } from '../src/core/clock.js';
import { db } from '../src/core/firebase.js';
import { getParams } from '../src/core/params.js';
import { likeHome } from '../src/modules/match/callables.js';
import {
  adminDecideAppeal,
  adminGetReport,
  adminListAlerts,
  adminListReports,
  adminModerate,
  adminResolveHold,
  getMyStanding,
  submitAppeal,
  submitReport,
} from '../src/modules/moderation/callables.js';
import {
  alertDeadlines,
  expireStrikes,
  reactivateSuspended,
} from '../src/modules/moderation/jobs.js';
import { seedEligible } from './fixtures.js';
import {
  authedRequest,
  clearFirestore,
  errorCode,
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
const ana = token('ana');
const admin: TestToken = {
  uid: 'admin',
  email_verified: true,
  role: 'admin',
  firebase: { sign_in_second_factor: 'totp' },
};
const otherAdmin: TestToken = { ...admin, uid: 'admin2' };

const statement = {
  templateId: 'PHOTOS_NOT_OWN' as const,
  facts: 'Las fotos de la casa aparecen publicadas en un portal de otra ciudad.',
  ground: 'TERMS' as const,
  groundDetail: 'Normas de la comunidad, apartado 2 (anuncios veraces).',
};
const description = 'Estas fotos son de un anuncio de otra web, no de su casa.';

const at = (iso: string) => setClock(fixedClock(iso));

async function mails(): Promise<string[]> {
  return (await db().collection('mailQueue').get()).docs
    .map((d) => `${String(d.get('templateId'))}:${String(d.get('to'))}`)
    .sort();
}

async function clearMail(): Promise<void> {
  const all = await db().collection('mailQueue').get();
  await Promise.all(all.docs.map((d) => d.ref.delete()));
}

beforeEach(async () => {
  await clearFirestore();
  await seedWaitlistFixtures();
  await seedLegal();
  at('2027-03-01T10:00:00+01:00');
  await seedEligible('laura', 'madrid');
  await seedEligible('javier', 'valencia', { premium: true });
  await seedEligible('ana', 'madrid', { identity: 'NONE' });
  await db().doc('adminDirectory/admin').set({ email: 'admin@tinhome.es', role: 'admin' });
  await db().doc('adminDirectory/boss').set({ email: 'boss@tinhome.es', role: 'superadmin' });
});

afterEach(() => resetClock());

describe('reports and preventive hold (FR-42, FR-69, BR-42)', () => {
  it('«photos not theirs» from a verified user hides the home at once and alerts the admins', async () => {
    const result = await submitReport.run(
      authedRequest(
        { targetType: 'HOME', targetId: 'javier', reason: 'PHOTOS_NOT_OWN', description },
        laura,
      ),
    );
    expect(result).toMatchObject({ priority: 'HIGH', preventiveHold: true });
    const home = (await db().doc('homes/javier').get()).data();
    expect(home).toMatchObject({
      visible: false,
      moderationHold: { active: true, reason: 'REPORT' },
    });
    const alerts = await adminListAlerts.run(authedRequest({}, admin));
    expect(alerts.items.map((a) => a.type).sort()).toEqual(['HOLD_DUE', 'REPORT_HIGH']);
    expect(await mails()).toEqual([
      'N-14:laura@ejemplo.es',
      'N-23:javier@ejemplo.es',
      'N-26:admin@tinhome.es',
      'N-26:boss@tinhome.es',
    ]);
    // The report keeps a snapshot; the reported person never learns who reported.
    const detail = await adminGetReport.run(authedRequest({ id: result.reportId }, admin));
    expect(detail.report.snapshot.title).toBe('Casa de javier');
    expect(detail.targetUserHistory.hold).toMatchObject({ reason: 'REPORT' });
  });

  it('unverified reporters do not hold alone; P-34 independent reports do', async () => {
    const first = await submitReport.run(
      authedRequest({ targetType: 'USER', targetId: 'javier', reason: 'RUDE', description }, ana),
    );
    expect(first.preventiveHold).toBe(false);
    const second = await submitReport.run(
      authedRequest({ targetType: 'USER', targetId: 'javier', reason: 'RUDE', description }, laura),
    );
    expect(second.preventiveHold).toBe(true);
    expect((await db().doc('users/javier').get()).get('moderationHold')).toMatchObject({
      active: true,
      reason: 'REPORTS_THRESHOLD',
    });
    const queue = await adminListReports.run(authedRequest({ limit: 20 }, admin));
    expect(queue.items).toHaveLength(2);
    expect(
      await errorCode(
        submitReport.run(
          authedRequest(
            { targetType: 'USER', targetId: 'laura', reason: 'RUDE', description },
            laura,
          ),
        ),
      ),
    ).toBe('E_VALIDATION');
  });

  it('a reported message carries itself and its context; only participants can report it', async () => {
    await likeHome.run(authedRequest({ homeId: 'javier' }, laura));
    await likeHome.run(authedRequest({ homeId: 'laura' }, javier));
    const messages = db().collection('matches/javier_laura/messages');
    await messages.doc('m1').set({
      senderUid: 'laura',
      type: 'TEXT',
      text: 'Hola',
      createdAt: Timestamp.fromMillis(1000),
    });
    await messages.doc('m2').set({
      senderUid: 'javier',
      type: 'TEXT',
      text: 'Págame por Bizum ya',
      createdAt: Timestamp.fromMillis(2000),
    });
    const result = await submitReport.run(
      authedRequest(
        { targetType: 'MESSAGE', targetId: 'javier_laura/m2', reason: 'FRAUD', description },
        laura,
      ),
    );
    const detail = await adminGetReport.run(authedRequest({ id: result.reportId }, admin));
    expect(detail.report.targetUid).toBe('javier');
    expect(detail.report.snapshot.messages.map((m) => [m.text, m.reported])).toEqual(
      expect.arrayContaining([
        ['Hola', false],
        ['Págame por Bizum ya', true],
      ]),
    );
    expect(
      await errorCode(
        submitReport.run(
          authedRequest(
            { targetType: 'MESSAGE', targetId: 'javier_laura/m2', reason: 'FRAUD', description },
            ana,
          ),
        ),
      ),
    ).toBe('E_NOT_FOUND');
  });
});

describe('moderation decisions (FR-44, FR-68, BR-27, BR-41)', () => {
  it('needs a statement; dismissing frees the hold without a strike and tells the reporter', async () => {
    const { reportId } = await submitReport.run(
      authedRequest(
        { targetType: 'HOME', targetId: 'javier', reason: 'PHOTOS_NOT_OWN', description },
        laura,
      ),
    );
    const base = { reportId, targetType: 'HOME' as const, targetId: 'javier', targetUid: 'javier' };
    expect(
      await errorCode(adminModerate.run(authedRequest({ ...base, action: 'HIDE_CONTENT' }, admin))),
    ).toBe('E_STATEMENT_REQUIRED');
    await clearMail();
    const dismissed = await adminModerate.run(authedRequest({ ...base, action: 'DISMISS' }, admin));
    expect(dismissed).toMatchObject({ strikesActive: 0, suggestedNext: 'NONE' });
    expect((await db().doc('homes/javier').get()).data()).toMatchObject({
      visible: true,
      moderationHold: null,
    });
    expect(await mails()).toEqual(['N-16:laura@ejemplo.es']);
  });

  it('hides content with a statement of reasons (N-15) and the third strike proposes a ban', async () => {
    const { reportId } = await submitReport.run(
      authedRequest(
        { targetType: 'HOME', targetId: 'javier', reason: 'PHOTOS_NOT_OWN', description },
        laura,
      ),
    );
    await clearMail();
    const hidden = await adminModerate.run(
      authedRequest(
        {
          reportId,
          targetType: 'HOME',
          targetId: 'javier',
          targetUid: 'javier',
          action: 'HIDE_CONTENT',
          recordStrike: true,
          statement,
        },
        admin,
      ),
    );
    // A serious fault (photos not theirs) proposes a suspension straight away.
    expect(hidden).toMatchObject({ strikesActive: 1, suggestedNext: 'SUSPEND' });
    const action = (await db().doc(`moderationActions/${hidden.actionId}`).get()).data();
    expect(action?.statementOfReasons).toMatchObject({
      facts: statement.facts,
      scope: expect.stringContaining('Se oculta tu casa') as string,
      redress: expect.stringContaining('6 meses') as string,
    });
    expect((await db().doc('homes/javier').get()).get('visible')).toBe(false);
    expect(await mails()).toEqual(['N-15:javier@ejemplo.es', 'N-16:laura@ejemplo.es']);

    const warn = {
      targetType: 'USER' as const,
      targetId: 'javier',
      targetUid: 'javier',
      action: 'WARN' as const,
      recordStrike: true,
      statement: { ...statement, templateId: 'RUDE' as const },
    };
    // Second strike (minor) → the system proposes a suspension.
    expect((await adminModerate.run(authedRequest(warn, admin))).suggestedNext).toBe('SUSPEND');
    // The system only proposes: the account is still active until an admin confirms the ban.
    expect((await db().doc('users/javier').get()).get('status')).toBe('ACTIVE');
    await clearMail();
    const ban = await adminModerate.run(
      authedRequest(
        { targetType: 'USER', targetId: 'javier', targetUid: 'javier', action: 'BAN', statement },
        admin,
      ),
    );
    expect(ban.suggestedNext).toBe('NONE');
    expect((await db().doc('users/javier').get()).get('status')).toBe('BANNED');
    expect(await mails()).toEqual(['N-24:javier@ejemplo.es']);
  });

  it('three minor strikes: none → suspend → ban', async () => {
    const warn = {
      targetType: 'USER' as const,
      targetId: 'javier',
      targetUid: 'javier',
      action: 'WARN' as const,
      recordStrike: true,
      statement: { ...statement, templateId: 'RUDE' as const },
    };
    const results = [];
    for (let i = 0; i < 3; i += 1)
      results.push((await adminModerate.run(authedRequest(warn, admin))).suggestedNext);
    expect(results).toEqual(['NONE', 'SUSPEND', 'BAN']);
  });

  it('suspends until a date and J-07 lifts it; holds can be released or confirmed', async () => {
    await adminModerate.run(
      authedRequest(
        {
          targetType: 'USER',
          targetId: 'javier',
          targetUid: 'javier',
          action: 'SUSPEND',
          suspendedUntil: '2027-03-08T10:00:00.000Z',
          statement,
        },
        admin,
      ),
    );
    expect((await db().doc('users/javier').get()).get('status')).toBe('SUSPENDED');
    expect((await db().doc('homes/javier').get()).get('visible')).toBe(false);
    const params = await getParams();
    expect(await reactivateSuspended(db(), params, new Date('2027-03-07T10:00:00Z'))).toBe(0);
    expect(await reactivateSuspended(db(), params, new Date('2027-03-08T10:00:00Z'))).toBe(1);
    expect((await db().doc('homes/javier').get()).get('visible')).toBe(true);

    await submitReport.run(
      authedRequest(
        { targetType: 'HOME', targetId: 'javier', reason: 'PHOTOS_NOT_OWN', description },
        laura,
      ),
    );
    expect(
      await errorCode(
        adminResolveHold.run(
          authedRequest({ uid: 'javier', scope: 'HOME', decision: 'CONFIRM' }, admin),
        ),
      ),
    ).toBe('E_STATEMENT_REQUIRED');
    await adminResolveHold.run(
      authedRequest({ uid: 'javier', scope: 'HOME', decision: 'RELEASE' }, admin),
    );
    expect((await db().doc('homes/javier').get()).get('visible')).toBe(true);
  });
});

describe('appeals (FR-45) and standing (FR-68)', () => {
  it('appeals once; upholding restores the content and revokes the strike', async () => {
    const hidden = await adminModerate.run(
      authedRequest(
        {
          targetType: 'HOME',
          targetId: 'javier',
          targetUid: 'javier',
          action: 'HIDE_CONTENT',
          recordStrike: true,
          statement,
        },
        admin,
      ),
    );
    const standing = await getMyStanding.run(authedRequest({}, javier));
    expect(standing.strikes).toHaveLength(1);
    expect(standing.actions[0]).toMatchObject({
      id: hidden.actionId,
      action: 'HIDE_CONTENT',
      appealable: true,
    });
    expect(
      await errorCode(
        submitAppeal.run(
          authedRequest(
            { actionId: hidden.actionId, text: 'Son mis fotos, tengo las originales.' },
            laura,
          ),
        ),
      ),
    ).toBe('E_NOT_FOUND');
    const { appealId } = await submitAppeal.run(
      authedRequest(
        { actionId: hidden.actionId, text: 'Son mis fotos, tengo las originales.' },
        javier,
      ),
    );
    expect(
      await errorCode(
        submitAppeal.run(
          authedRequest({ actionId: hidden.actionId, text: 'Otra vez el mismo recurso.' }, javier),
        ),
      ),
    ).toBe('E_APPEAL_EXISTS');

    const same = await adminDecideAppeal.run(
      authedRequest({ appealId, decision: 'UPHOLD', text: 'Has aportado los originales.' }, admin),
    );
    expect(same).toMatchObject({ appeal: { status: 'UPHELD' }, sameAdmin: true });
    expect((await db().doc('homes/javier').get()).get('visible')).toBe(true);
    expect((await db().doc('users/javier').get()).get('strikesActive')).toBe(0);
    const after = await getMyStanding.run(authedRequest({}, javier));
    expect(after.actions[0]).toMatchObject({ appealable: false, appeal: { status: 'UPHELD' } });
  });

  it('closes the appeal window after P-14R months; other admins are not flagged', async () => {
    const warned = await adminModerate.run(
      authedRequest(
        { targetType: 'USER', targetId: 'javier', targetUid: 'javier', action: 'WARN', statement },
        admin,
      ),
    );
    at('2027-09-02T10:00:00+02:00');
    expect(
      await errorCode(
        submitAppeal.run(
          authedRequest(
            { actionId: warned.actionId, text: 'No estoy de acuerdo con esto.' },
            javier,
          ),
        ),
      ),
    ).toBe('E_APPEAL_WINDOW_CLOSED');
    at('2027-03-02T10:00:00+01:00');
    const { appealId } = await submitAppeal.run(
      authedRequest({ actionId: warned.actionId, text: 'No estoy de acuerdo con esto.' }, javier),
    );
    const decided = await adminDecideAppeal.run(
      authedRequest(
        { appealId, decision: 'REJECT', text: 'Se mantiene la advertencia.' },
        otherAdmin,
      ),
    );
    expect(decided.sameAdmin).toBe(false);
  });
});

describe('jobs J-11 and J-12', () => {
  it('expires strikes and alerts deadlines, escalating overdue ones to superadmins', async () => {
    await adminModerate.run(
      authedRequest(
        {
          targetType: 'USER',
          targetId: 'javier',
          targetUid: 'javier',
          action: 'WARN',
          recordStrike: true,
          statement,
        },
        admin,
      ),
    );
    expect(await expireStrikes(db(), new Date('2028-02-28T10:00:00Z'))).toBe(0);
    expect(await expireStrikes(db(), new Date('2028-03-02T10:00:00Z'))).toBe(1);
    expect((await db().doc('users/javier').get()).get('strikesActive')).toBe(0);

    await submitReport.run(
      authedRequest({ targetType: 'USER', targetId: 'javier', reason: 'RUDE', description }, laura),
    );
    await clearMail();
    // Normal priority: 72 h. Two hours before → alert; after → escalation.
    expect(await alertDeadlines(db(), new Date('2027-03-04T08:30:00+01:00'))).toBe(1);
    expect(await mails()).toEqual(['N-26:admin@tinhome.es', 'N-26:boss@tinhome.es']);
    await clearMail();
    expect(await alertDeadlines(db(), new Date('2027-03-04T10:30:00+01:00'))).toBe(1);
    expect(await mails()).toEqual(['N-26:boss@tinhome.es']);
    expect(await alertDeadlines(db(), new Date('2027-03-04T11:30:00+01:00'))).toBe(0);
  });
});
