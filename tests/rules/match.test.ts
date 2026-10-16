import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { adminWithMfa, createEnv, verified } from './env.js';

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await createEnv('demo-tinhome-rules-match');
});
afterAll(async () => {
  await env.cleanup();
});
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'matches/javier_laura'), {
      participants: ['javier', 'laura'],
      status: 'ACTIVE',
      lastActivityAt: 1,
    });
    await setDoc(doc(db, 'matches/javier_laura/messages/m1'), {
      senderUid: 'laura',
      text: 'Hola',
      createdAt: 1,
    });
    await setDoc(doc(db, 'matches/ana_laura'), {
      participants: ['ana', 'laura'],
      status: 'UNMATCHED',
      lastActivityAt: 1,
    });
    await setDoc(doc(db, 'matches/ana_laura/messages/m1'), {
      senderUid: 'ana',
      text: 'Adiós',
      createdAt: 1,
    });
    await setDoc(doc(db, 'likes/laura_javier'), { fromUid: 'laura', toUid: 'javier' });
    await setDoc(doc(db, 'blocks/laura_pepe'), { blockerUid: 'laura', blockedUid: 'pepe' });
  });
});

describe('matches and chat (FR-60, BR-36, BR-45)', () => {
  it('participants list their matches and read messages of an ACTIVE match', async () => {
    const laura = env.authenticatedContext('laura', verified).firestore();
    await assertSucceeds(
      getDocs(
        query(collection(laura, 'matches'), where('participants', 'array-contains', 'laura')),
      ),
    );
    await assertSucceeds(
      getDocs(
        query(
          collection(laura, 'matches/javier_laura/messages'),
          orderBy('createdAt', 'desc'),
          limit(50),
        ),
      ),
    );
  });

  it('nobody else reads the chat, not even admins (the team never reads chats)', async () => {
    await assertFails(
      getDoc(
        doc(
          env.authenticatedContext('marta', verified).firestore(),
          'matches/javier_laura/messages/m1',
        ),
      ),
    );
    await assertFails(
      getDoc(
        doc(
          env.authenticatedContext('admin', adminWithMfa).firestore(),
          'matches/javier_laura/messages/m1',
        ),
      ),
    );
  });

  it('admins cannot read the match document either (it carries the last message preview)', async () => {
    const admin = env.authenticatedContext('admin', adminWithMfa).firestore();
    await assertFails(getDoc(doc(admin, 'matches/javier_laura')));
    await assertFails(getDocs(collection(admin, 'matches')));
  });

  it('after unmatching the conversation is no longer readable (BR-45)', async () => {
    const laura = env.authenticatedContext('laura', verified).firestore();
    await assertSucceeds(getDoc(doc(laura, 'matches/ana_laura')));
    await assertFails(getDoc(doc(laura, 'matches/ana_laura/messages/m1')));
  });

  it('messages, likes and blocks are written only by callables', async () => {
    const laura = env.authenticatedContext('laura', verified).firestore();
    await assertFails(
      setDoc(doc(laura, 'matches/javier_laura/messages/m2'), { senderUid: 'laura', text: 'x' }),
    );
    await assertFails(setDoc(doc(laura, 'likes/laura_ana'), { fromUid: 'laura', toUid: 'ana' }));
    await assertFails(setDoc(doc(laura, 'blocks/laura_ana'), { blockerUid: 'laura' }));
  });

  it('only the sender reads a like; only the blocker reads a block', async () => {
    await assertSucceeds(
      getDoc(doc(env.authenticatedContext('laura', verified).firestore(), 'likes/laura_javier')),
    );
    await assertFails(
      getDoc(doc(env.authenticatedContext('javier', verified).firestore(), 'likes/laura_javier')),
    );
    await assertSucceeds(
      getDoc(doc(env.authenticatedContext('laura', verified).firestore(), 'blocks/laura_pepe')),
    );
    await assertFails(
      getDoc(doc(env.authenticatedContext('pepe', verified).firestore(), 'blocks/laura_pepe')),
    );
  });
});
