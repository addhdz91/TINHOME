import { collection, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import type { AdminAlertType } from '@tinhome/shared/constants';
import { firebase } from '@/lib/firebase';

export interface AlertItem {
  id: string;
  type: AdminAlertType;
  refType: string;
  refId: string;
  priority: 'HIGH' | 'NORMAL';
  createdAt: Date | null;
}

/** N-26 — unhandled admin alerts in real time (rules: admins with 2FA only). */
export function useAdminAlerts(): AlertItem[] | null {
  const [items, setItems] = useState<AlertItem[] | null>(null);
  useEffect(
    () =>
      onSnapshot(
        query(
          collection(firebase().db, 'adminAlerts'),
          where('handledAt', '==', null),
          orderBy('createdAt', 'desc'),
          limit(100),
        ),
        (snap) =>
          setItems(
            snap.docs.map((doc) => {
              const createdAt = doc.get('createdAt') as { toDate?: () => Date } | null;
              return {
                id: doc.id,
                type: doc.get('type') as AdminAlertType,
                refType: String(doc.get('refType') ?? ''),
                refId: String(doc.get('refId') ?? ''),
                priority: doc.get('priority') === 'HIGH' ? 'HIGH' : 'NORMAL',
                createdAt: createdAt?.toDate ? createdAt.toDate() : null,
              };
            }),
          ),
        () => setItems([]),
      ),
    [],
  );
  return items;
}
