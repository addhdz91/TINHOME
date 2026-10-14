import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  MODERATION_ACTIONS,
  RESTRICTIVE_ACTIONS,
  type ModerationAction,
  type ReportTarget,
  type SanctionSuggestion,
} from '@tinhome/shared/constants';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { toUserMessage } from '@/lib/app-error';
import { adminModerate } from '@/lib/callables';
import { EMPTY_STATEMENT, statementReady, type StatementDraft } from '../lib/statement';
import { StatementFields } from './StatementFields';

const isRestrictive = (action: ModerationAction) =>
  (RESTRICTIVE_ACTIONS as readonly ModerationAction[]).includes(action);

/**
 * FR-44 / FR-68 — decision form. The proposed next sanction (BR-41) is never applied by itself:
 * it opens a confirmation that preselects it.
 */
export function ModerationForm({
  reportId,
  targetType,
  targetId,
  targetUid,
  defaultAction = 'DISMISS',
  onDone,
}: {
  reportId?: string;
  targetType: ReportTarget;
  targetId: string;
  targetUid: string;
  defaultAction?: ModerationAction;
  onDone?: () => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [action, setAction] = useState<ModerationAction>(defaultAction);
  const [statement, setStatement] = useState<StatementDraft>(EMPTY_STATEMENT);
  const [recordStrike, setRecordStrike] = useState(false);
  const [suspendedUntil, setSuspendedUntil] = useState('');
  const [suggestion, setSuggestion] = useState<SanctionSuggestion>('NONE');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const restrictive = isRestrictive(action);
  const available = MODERATION_ACTIONS.filter(
    (a) => a !== 'HIDE_MESSAGE' || targetType === 'MESSAGE',
  );

  const submit = useMutation({
    mutationFn: (chosen: ModerationAction) =>
      adminModerate({
        // The follow-up sanction is a separate decision: the report was already resolved.
        ...(reportId && chosen === action ? { reportId } : {}),
        targetType,
        targetId,
        targetUid,
        action: chosen,
        ...(isRestrictive(chosen) ? { statement } : {}),
        ...(isRestrictive(chosen) && recordStrike && chosen === action
          ? { recordStrike: true }
          : {}),
        ...(chosen === 'SUSPEND' && suspendedUntil
          ? { suspendedUntil: new Date(`${suspendedUntil}T23:59:00`).toISOString() }
          : {}),
      }),
    onSuccess: async (result) => {
      toast.success(t('admin.moderation.done', { count: result.strikesActive }));
      setSuggestion(result.suggestedNext);
      setConfirmOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['admin'] });
      if (result.suggestedNext === 'NONE') onDone?.();
    },
    onError: (error) => toast.error(toUserMessage(t, error)),
  });

  const ready = !restrictive || statementReady(statement);
  return (
    <section
      aria-labelledby="moderation-form"
      className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4"
    >
      <h2 id="moderation-form" className="text-h3">
        {t('admin.moderation.decide')}
      </h2>
      <label className="flex flex-col gap-1">
        <span className="font-semibold">{t('admin.moderation.action')}</span>
        <select
          className="min-h-11 rounded-md border border-border bg-surface px-3"
          value={action}
          onChange={(event) => setAction(event.target.value as ModerationAction)}
        >
          {available.map((value) => (
            <option key={value} value={value}>
              {t(`admin.moderation.actions.${value}`)}
            </option>
          ))}
        </select>
      </label>
      {action === 'SUSPEND' ? (
        <label className="flex flex-col gap-1">
          <span className="font-semibold">{t('admin.moderation.suspendedUntil')}</span>
          <input
            type="date"
            className="min-h-11 rounded-md border border-border bg-surface px-3"
            value={suspendedUntil}
            onChange={(event) => setSuspendedUntil(event.target.value)}
          />
          <span className="text-sm text-muted">{t('admin.moderation.suspendDefault')}</span>
        </label>
      ) : null}
      {restrictive ? (
        <>
          <StatementFields value={statement} onChange={setStatement} idPrefix="moderation" />
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              className="size-5 accent-primary"
              checked={recordStrike}
              onChange={(event) => setRecordStrike(event.target.checked)}
            />
            {t('admin.moderation.recordStrike')}
          </label>
        </>
      ) : null}
      <Button
        variant={restrictive ? 'danger' : 'primary'}
        disabled={!ready || submit.isPending}
        onClick={() => submit.mutate(action)}
      >
        {t('admin.moderation.apply')}
      </Button>
      {suggestion !== 'NONE' ? (
        <div role="alert" className="flex flex-col gap-2 rounded-md border border-danger p-3">
          <p className="font-semibold">{t(`admin.moderation.suggested.${suggestion}`)}</p>
          <Button variant="danger" className="self-start" onClick={() => setConfirmOpen(true)}>
            {t('admin.moderation.reviewSuggestion')}
          </Button>
        </div>
      ) : null}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent
          title={t(`admin.moderation.confirm.${suggestion === 'BAN' ? 'BAN' : 'SUSPEND'}`)}
          description={t('admin.moderation.confirmBody')}
          closeLabel={t('common.close')}
        >
          <Button
            variant="danger"
            disabled={!statementReady(statement) || submit.isPending}
            onClick={() => submit.mutate(suggestion === 'BAN' ? 'BAN' : 'SUSPEND')}
          >
            {t(`admin.moderation.confirm.${suggestion === 'BAN' ? 'BAN' : 'SUSPEND'}`)}
          </Button>
        </DialogContent>
      </Dialog>
    </section>
  );
}
