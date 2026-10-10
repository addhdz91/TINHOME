import { SendHorizontal } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PARAM_DEFAULTS } from '@tinhome/shared/constants';
import { cn } from '@/lib/utils';

const SUGGESTIONS = ['dates', 'neighbourhood', 'family'] as const;

/** C-xx `MessageComposer` — Enter sends, Shift+Enter new line, counter near the limit. */
export function MessageComposer({
  onSend,
  showSuggestions,
  disabled,
}: {
  onSend: (text: string) => void;
  showSuggestions: boolean;
  disabled: boolean;
}) {
  const { t } = useTranslation();
  // P-28 — the server checks it again (E_MESSAGE_TOO_LONG).
  const max = PARAM_DEFAULTS.chatMessageMaxLength;
  const [text, setText] = useState('');
  const send = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || trimmed.length > max) return;
    onSend(trimmed);
    setText('');
  };
  return (
    <div className="flex flex-col gap-2">
      {showSuggestions ? (
        <ul className="flex gap-2 overflow-x-auto" aria-label={t('chat.suggestionsLabel')}>
          {SUGGESTIONS.map((key) => (
            <li key={key}>
              <button
                type="button"
                className="min-h-11 shrink-0 rounded-full border border-border bg-surface px-3 text-sm"
                onClick={() => send(t(`chat.suggestions.${key}`))}
              >
                {t(`chat.suggestions.${key}`)}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <form
        className="flex items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          send(text);
        }}
      >
        <label htmlFor="composer" className="sr-only">
          {t('chat.composerLabel')}
        </label>
        <textarea
          id="composer"
          rows={1}
          value={text}
          disabled={disabled}
          maxLength={max + 50}
          placeholder={t('chat.placeholder')}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              send(text);
            }
          }}
          className="max-h-40 min-h-11 flex-1 resize-none rounded-2xl border border-border bg-surface px-4 py-2.5 text-text"
        />
        <button
          type="submit"
          disabled={disabled || text.trim().length === 0 || text.length > max}
          aria-label={t('chat.send')}
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"
        >
          <SendHorizontal aria-hidden="true" className="size-5" />
        </button>
      </form>
      {text.length > max - 100 ? (
        <p
          className={cn(
            'text-right text-xs',
            text.length > max ? 'font-semibold text-danger' : 'text-muted',
          )}
        >
          {t('chat.counter', { count: text.length, max })}
        </p>
      ) : null}
    </div>
  );
}
