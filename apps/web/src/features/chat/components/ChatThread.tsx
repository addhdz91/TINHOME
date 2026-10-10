import { AlertTriangle, Check, CheckCheck, Clock, RotateCcw } from 'lucide-react';
import { Fragment, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { formatTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { MessageView } from '../lib/types';

export interface PendingMessage {
  id: string;
  text: string;
  status: 'sending' | 'failed';
}

function dayLabel(date: Date, t: (key: 'chat.today' | 'chat.yesterday') => string): string {
  const today = new Date();
  const yesterday = new Date(today.getTime() - 86_400_000);
  if (date.toDateString() === today.toDateString()) return t('chat.today');
  if (date.toDateString() === yesterday.toDateString()) return t('chat.yesterday');
  return date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
}

/** C-xx `ChatThread` — day separators, own bubbles, read receipt, system messages, safety notes. */
export function ChatThread({
  uid,
  otherName,
  messages,
  pending,
  otherReadAt,
  onRetry,
}: {
  uid: string;
  otherName: string;
  messages: MessageView[];
  pending: PendingMessage[];
  otherReadAt: Date | null;
  onRetry: (message: PendingMessage) => void;
}) {
  const { t } = useTranslation();
  const end = useRef<HTMLLIElement>(null);
  const visible = messages
    .filter((m) => !m.deletedFor.includes(uid) && !pending.some((p) => p.id === m.id))
    .map((message, i, all) => {
      const day = (message.createdAt ?? new Date()).toDateString();
      const previous = all[i - 1];
      return {
        message,
        separator: !previous || (previous.createdAt ?? new Date()).toDateString() !== day,
      };
    });
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' });
  }, [visible.length, pending.length]);
  return (
    <ol className="flex flex-col gap-2" aria-label={t('chat.messagesLabel', { name: otherName })}>
      {visible.map(({ message, separator }) => {
        const date = message.createdAt ?? new Date();
        const mine = message.senderUid === uid;
        const time = formatTime(date);
        let body;
        if (message.type === 'SYSTEM' || message.type === 'PHONE_SHARED') {
          body = (
            <p className="mx-auto max-w-sm rounded-full bg-surface-muted px-3 py-1 text-center text-xs text-muted">
              {message.type === 'PHONE_SHARED'
                ? t(mine ? 'chat.system.phoneSharedMine' : 'chat.system.phoneShared', {
                    name: otherName,
                  })
                : t(`chat.system.${message.systemCode ?? 'MATCH_CREATED'}` as const, {
                    name: otherName,
                  })}
            </p>
          );
        } else {
          body = (
            <div className={cn('flex flex-col gap-1', mine ? 'items-end' : 'items-start')}>
              <p
                className={cn(
                  'max-w-[80%] rounded-2xl px-3 py-2 break-words whitespace-pre-wrap',
                  mine ? 'bg-primary text-primary-foreground' : 'bg-surface-muted text-text',
                  message.type === 'PREMIUM_LIKE_MESSAGE' && 'border-2 border-accent',
                )}
              >
                {message.hiddenByModeration ? <em>{t('chat.hidden')}</em> : message.text}
              </p>
              <span className="flex items-center gap-1 text-xs text-muted">
                {time}
                {mine ? (
                  otherReadAt && message.createdAt && otherReadAt >= message.createdAt ? (
                    <>
                      <CheckCheck aria-hidden="true" className="size-3.5 text-accent" />
                      <span className="sr-only">{t('chat.read')}</span>
                    </>
                  ) : (
                    <>
                      <Check aria-hidden="true" className="size-3.5" />
                      <span className="sr-only">{t('chat.sent')}</span>
                    </>
                  )
                ) : null}
              </span>
              {!mine && message.paymentWarning ? (
                <p
                  role="note"
                  className="flex max-w-[80%] items-start gap-2 rounded-md border border-warning p-2 text-xs"
                >
                  <AlertTriangle aria-hidden="true" className="size-4 shrink-0" />
                  {t('chat.paymentWarning')}
                </p>
              ) : null}
            </div>
          );
        }
        return (
          <Fragment key={message.id}>
            {separator ? (
              <li className="py-2 text-center text-xs font-semibold text-muted">
                {dayLabel(date, t)}
              </li>
            ) : null}
            <li>{body}</li>
          </Fragment>
        );
      })}
      {pending.map((message) => (
        <li key={message.id} className="flex flex-col items-end gap-1">
          <p className="max-w-[80%] rounded-2xl bg-primary px-3 py-2 break-words whitespace-pre-wrap text-primary-foreground opacity-80">
            {message.text}
          </p>
          {message.status === 'sending' ? (
            <span className="flex items-center gap-1 text-xs text-muted">
              <Clock aria-hidden="true" className="size-3.5" />
              {t('chat.sending')}
            </span>
          ) : (
            <button
              type="button"
              onClick={() => onRetry(message)}
              className="flex min-h-11 items-center gap-1 text-xs font-semibold text-danger"
            >
              <RotateCcw aria-hidden="true" className="size-3.5" />
              {t('chat.failed')}
            </button>
          )}
        </li>
      ))}
      <li ref={end} aria-hidden="true" />
    </ol>
  );
}
