import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type DocumentData,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';
import type { NotificationType } from '@tinhome/shared/constants';
import { firebase } from '@/lib/firebase';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string;
  createdAt: Date | null;
  read: boolean;
}

type Loadable<T> = { status: 'loading' } | { status: 'error' } | { status: 'ready'; data: T };

function toItem(id: string, data: DocumentData): NotificationItem {
  const createdAt = data.createdAt as { toDate?: () => Date } | undefined;
  return {
    id,
    type: data.type as NotificationType,
    title: String(data.title ?? ''),
    body: String(data.body ?? ''),
    link: String(data.link ?? '/app/avisos'),
    createdAt: createdAt?.toDate ? createdAt.toDate() : null,
    read: data.readAt !== null && data.readAt !== undefined,
  };
}

/** FR-46 — the notification centre in real time (latest 50). */
export function useNotifications(uid: string): Loadable<NotificationItem[]> {
  const [state, setState] = useState<Loadable<NotificationItem[]>>({ status: 'loading' });
  useEffect(
    () =>
      onSnapshot(
        query(
          collection(firebase().db, 'notifications', uid, 'items'),
          orderBy('createdAt', 'desc'),
          limit(50),
        ),
        (snap) => setState({ status: 'ready', data: snap.docs.map((d) => toItem(d.id, d.data())) }),
        () => setState({ status: 'error' }),
      ),
    [uid],
  );
  return state;
}

/** Unread count for the bell badge (capped at 99). */
export function useUnreadNotifications(uid: string): number {
  const [count, setCount] = useState(0);
  useEffect(
    () =>
      onSnapshot(
        query(
          collection(firebase().db, 'notifications', uid, 'items'),
          where('readAt', '==', null),
          limit(99),
        ),
        (snap) => setCount(snap.size),
        () => setCount(0),
      ),
    [uid],
  );
  return count;
}

/** The rules only allow the owner to set `readAt` (04 §4). */
export function markNotificationRead(uid: string, id: string): Promise<void> {
  return updateDoc(doc(firebase().db, 'notifications', uid, 'items', id), {
    readAt: serverTimestamp(),
  });
}
