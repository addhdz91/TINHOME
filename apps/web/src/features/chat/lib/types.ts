import type { DocumentData, Timestamp } from 'firebase/firestore';
import type { MessageType, SystemCode } from '@tinhome/shared/constants';

export interface Person {
  displayName: string;
  homeTitle: string;
  cityId: string;
  cityName: string;
  photoUrl: string | null;
}

/** `matches/{id}` as the chat screens use it (04 §2.6). */
export interface MatchView {
  id: string;
  participants: string[];
  people: Record<string, Person>;
  status: 'ACTIVE' | 'UNMATCHED' | 'BLOCKED';
  perfectFit: boolean;
  sharedWindowIds: string[];
  unseenBy: string[];
  lastMessage: {
    text: string;
    senderUid: string | null;
    at: Date | null;
    type: MessageType;
  } | null;
  unread: Record<string, number>;
  lastReadAt: Record<string, Date>;
  phoneSharedBy: string[];
  /** S-09 — the open (or last) exchange of this match. */
  activeExchangeId: string | null;
  lastActivityAt: Date | null;
}

export interface MessageView {
  id: string;
  senderUid: string | null;
  type: MessageType;
  text: string;
  systemCode: SystemCode | null;
  /** Exchange a system message is about (M8). */
  exchangeId: string | null;
  paymentWarning: boolean;
  hiddenByModeration: boolean;
  deletedFor: string[];
  createdAt: Date | null;
}

function toDate(value: unknown): Date | null {
  return value && typeof value === 'object' && 'toDate' in value
    ? (value as Timestamp).toDate()
    : null;
}

export function toMatchView(id: string, data: DocumentData): MatchView {
  const last = data.lastMessage as (DocumentData & { at?: unknown }) | null | undefined;
  const lastReadAt = (data.lastReadAt ?? {}) as Record<string, unknown>;
  const compatibility = (data.compatibility ?? {}) as {
    perfectFit?: boolean;
    sharedWindowIds?: string[];
  };
  return {
    id,
    participants: (data.participants as string[] | undefined) ?? [],
    people: (data.people as Record<string, Person> | undefined) ?? {},
    status: data.status as MatchView['status'],
    perfectFit: compatibility.perfectFit === true,
    sharedWindowIds: compatibility.sharedWindowIds ?? [],
    unseenBy: (data.unseenBy as string[] | undefined) ?? [],
    lastMessage: last
      ? {
          text: String(last.text ?? ''),
          senderUid: (last.senderUid as string | null | undefined) ?? null,
          at: toDate(last.at),
          type: (last.type as MessageType | undefined) ?? 'TEXT',
        }
      : null,
    unread: (data.unread as Record<string, number> | undefined) ?? {},
    lastReadAt: Object.fromEntries(
      Object.entries(lastReadAt).flatMap(([uid, value]) => {
        const date = toDate(value);
        return date ? [[uid, date] as const] : [];
      }),
    ),
    phoneSharedBy: (data.phoneSharedBy as string[] | undefined) ?? [],
    activeExchangeId: (data.activeExchangeId as string | null | undefined) ?? null,
    lastActivityAt: toDate(data.lastActivityAt),
  };
}

export function toMessageView(id: string, data: DocumentData): MessageView {
  return {
    id,
    senderUid: (data.senderUid as string | null | undefined) ?? null,
    type: (data.type as MessageType | undefined) ?? 'TEXT',
    text: String(data.text ?? ''),
    systemCode: (data.systemCode as SystemCode | undefined) ?? null,
    exchangeId: (data.exchangeId as string | null | undefined) ?? null,
    paymentWarning: data.paymentWarning === true,
    hiddenByModeration: data.hiddenByModeration === true,
    deletedFor: (data.deletedFor as string[] | undefined) ?? [],
    createdAt: toDate(data.createdAt),
  };
}

export function otherOf(match: MatchView, uid: string): string {
  return match.participants.find((p) => p !== uid) ?? '';
}
