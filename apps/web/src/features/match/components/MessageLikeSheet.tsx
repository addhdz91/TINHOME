import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PARAM_DEFAULTS } from '@tinhome/shared/constants';
import { validateListingText } from '@tinhome/shared/domain';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';

const SUGGESTIONS = ['dates', 'city', 'family'] as const;

/** S-17 / FR-61 — Premium like with a message (≤ P-40 characters, BR-22 checked in the client too). */
export function MessageLikeSheet({
  open,
  onOpenChange,
  targetName,
  onSend,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetName: string;
  onSend: (message: string) => Promise<void>;
}) {
  const { t } = useTranslation();
  const max = PARAM_DEFAULTS.premiumMessageMaxLength;
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const check = text.trim() ? validateListingText(text) : null;
  const problem = check && !check.ok ? t('home.validation.text') : null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={t('messageLike.title', { name: targetName })}
        description={t('messageLike.body', { count: PARAM_DEFAULTS.premiumMessageLikesPerDay })}
        closeLabel={t('common.close')}
      >
        <ul className="flex flex-wrap gap-2" aria-label={t('chat.suggestionsLabel')}>
          {SUGGESTIONS.map((key) => (
            <li key={key}>
              <button
                type="button"
                className="min-h-11 rounded-full border border-border px-3 text-left text-sm"
                onClick={() => setText(t(`messageLike.suggestions.${key}`))}
              >
                {t(`messageLike.suggestions.${key}`)}
              </button>
            </li>
          ))}
        </ul>
        <label htmlFor="like-message" className="font-semibold">
          {t('messageLike.label')}
        </label>
        <textarea
          id="like-message"
          rows={3}
          maxLength={max}
          value={text}
          aria-describedby="like-message-help"
          onChange={(event) => setText(event.target.value)}
          className="rounded-md border border-border bg-surface p-3 text-text"
        />
        <p
          id="like-message-help"
          className={problem ? 'text-sm font-semibold text-danger' : 'text-sm text-muted'}
        >
          {problem ?? t('chat.counter', { count: text.length, max })}
        </p>
        <Button
          variant="gradient"
          size="lg"
          disabled={busy || !text.trim() || problem !== null}
          onClick={() => {
            setBusy(true);
            void onSend(text.trim()).finally(() => {
              setBusy(false);
              setText('');
            });
          }}
        >
          {t('messageLike.send')}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
