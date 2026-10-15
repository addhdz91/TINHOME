import type { DocumentData } from 'firebase/firestore';
import type { ExchangeStatus } from '@tinhome/shared/constants';
import type { IsoDate } from '@tinhome/shared/types';

/** `exchanges/{id}` as the client reads it (participants only, 04 §2.7). */
export interface ExchangeDoc {
  id: string;
  matchId: string;
  participants: string[];
  proposedBy: string;
  startDate: IsoDate;
  endDate: IsoDate;
  nights: number;
  guests: Record<string, number>;
  pets: Record<string, number>;
  note: string | null;
  status: ExchangeStatus;
  expiresAt: Date | null;
  cancelledBy: string | null;
  reviewDeadlineDate: IsoDate | null;
}

function toDate(value: unknown): Date | null {
  return value && typeof value === 'object' && 'toDate' in value
    ? (value as { toDate: () => Date }).toDate()
    : null;
}

export function toExchangeDoc(id: string, data: DocumentData): ExchangeDoc {
  return {
    id,
    matchId: String(data.matchId ?? ''),
    participants: (data.participants as string[] | undefined) ?? [],
    proposedBy: String(data.proposedBy ?? ''),
    startDate: String(data.startDate ?? '') as IsoDate,
    endDate: String(data.endDate ?? '') as IsoDate,
    nights: Number(data.nights ?? 0),
    guests: (data.guests as Record<string, number> | undefined) ?? {},
    pets: (data.pets as Record<string, number> | undefined) ?? {},
    note: (data.note as string | null | undefined) ?? null,
    status: data.status as ExchangeStatus,
    expiresAt: toDate(data.expiresAt),
    cancelledBy: (data.cancelledBy as string | null | undefined) ?? null,
    reviewDeadlineDate: (data.reviewDeadlineDate as IsoDate | null | undefined) ?? null,
  };
}
