import { collection, doc, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { firebase } from '@/lib/firebase';
import { toMatchView, toMessageView, type MatchView, type MessageView } from '../lib/types';

type Loadable<T> = { status: 'loading' } | { status: 'error' } | { status: 'ready'; data: T };

/** FR-25 — the user's ACTIVE matches in real time, most recent activity first. */
export function useMatches(uid: string): Loadable<MatchView[]> {
  const [state, setState] = useState<Loadable<MatchView[]>>({ status: 'loading' });
  useEffect(
    () =>
      onSnapshot(
        query(
          collection(firebase().db, 'matches'),
          where('participants', 'array-contains', uid),
          where('status', '==', 'ACTIVE'),
          orderBy('lastActivityAt', 'desc'),
          limit(100),
        ),
        (snap) =>
          setState({ status: 'ready', data: snap.docs.map((d) => toMatchView(d.id, d.data())) }),
        () => setState({ status: 'error' }),
      ),
    [uid],
  );
  return state;
}

/** One match (also when it was closed, to say «Esta conversación ya no está disponible»). */
export function useMatch(matchId: string): Loadable<MatchView | null> {
  const [state, setState] = useState<Loadable<MatchView | null>>({ status: 'loading' });
  useEffect(
    () =>
      onSnapshot(
        doc(firebase().db, 'matches', matchId),
        (snap) =>
          setState({
            status: 'ready',
            data: snap.exists() ? toMatchView(snap.id, snap.data()) : null,
          }),
        () => setState({ status: 'error' }),
      ),
    [matchId],
  );
  return state;
}

/** Last 50 messages in real time (05 §2.7b), oldest first for display. */
export function useMessages(matchId: string, enabled: boolean): Loadable<MessageView[]> {
  const [state, setState] = useState<Loadable<MessageView[]>>({ status: 'loading' });
  useEffect(() => {
    if (!enabled) return undefined;
    return onSnapshot(
      query(
        collection(firebase().db, 'matches', matchId, 'messages'),
        orderBy('createdAt', 'desc'),
        limit(50),
      ),
      { includeMetadataChanges: false },
      (snap) =>
        setState({
          status: 'ready',
          data: snap.docs.map((d) => toMessageView(d.id, d.data())).toReversed(),
        }),
      () => setState({ status: 'error' }),
    );
  }, [matchId, enabled]);
  return state;
}

/** Badge of the Chats tab: unread messages of the user across their matches. */
export function useUnreadTotal(uid: string): number {
  const matches = useMatches(uid);
  return matches.status === 'ready'
    ? matches.data.reduce(
        (sum, match) => sum + (match.unread[uid] ?? 0) + (match.unseenBy.includes(uid) ? 1 : 0),
        0,
      )
    : 0;
}
