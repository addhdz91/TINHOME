import { collection, doc, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { firebase } from '@/lib/firebase';
import { toExchangeDoc, type ExchangeDoc } from '../lib/types';

export type Loadable<T> =
  { status: 'loading' } | { status: 'error' } | { status: 'ready'; data: T };

/** One exchange in real time (null if it does not exist or is not mine). */
export function useExchange(exchangeId: string | null): Loadable<ExchangeDoc | null> {
  const [state, setState] = useState<Loadable<ExchangeDoc | null>>({ status: 'loading' });
  useEffect(() => {
    if (!exchangeId) return undefined;
    return onSnapshot(
      doc(firebase().db, 'exchanges', exchangeId),
      (snap) =>
        setState({
          status: 'ready',
          data: snap.exists() ? toExchangeDoc(snap.id, snap.data()) : null,
        }),
      (error) =>
        setState(
          error.code === 'permission-denied'
            ? { status: 'ready', data: null }
            : { status: 'error' },
        ),
    );
  }, [exchangeId]);
  return exchangeId ? state : { status: 'ready', data: null };
}

/** S-09 — my exchanges, latest start first. */
export function useMyExchanges(uid: string): Loadable<ExchangeDoc[]> {
  const [state, setState] = useState<Loadable<ExchangeDoc[]>>({ status: 'loading' });
  useEffect(
    () =>
      onSnapshot(
        query(
          collection(firebase().db, 'exchanges'),
          where('participants', 'array-contains', uid),
          orderBy('startDate', 'desc'),
          limit(50),
        ),
        (snap) =>
          setState({ status: 'ready', data: snap.docs.map((d) => toExchangeDoc(d.id, d.data())) }),
        () => setState({ status: 'error' }),
      ),
    [uid],
  );
  return state;
}

/** FR-32 — whether I already reviewed this exchange (my review is readable by me). */
export function useMyReview(exchangeId: string, uid: string): Loadable<boolean> {
  const [state, setState] = useState<Loadable<boolean>>({ status: 'loading' });
  useEffect(
    () =>
      onSnapshot(
        doc(firebase().db, 'reviews', `${exchangeId}_${uid}`),
        (snap) => setState({ status: 'ready', data: snap.exists() }),
        // A missing document the rules cannot evaluate reads as «not reviewed yet».
        () => setState({ status: 'ready', data: false }),
      ),
    [exchangeId, uid],
  );
  return state;
}
