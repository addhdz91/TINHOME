import { Flag } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ReportTarget } from '@tinhome/shared/constants';
import { cn } from '@/lib/utils';
import { ReportDialog } from './ReportDialog';

/** One tap to open the report sheet, a second to send it (CLAUDE.md §6b). */
export function ReportButton({
  targetType,
  targetId,
  targetName,
  canBlock = false,
  compact = false,
  className,
}: {
  targetType: ReportTarget;
  targetId: string;
  targetName: string;
  canBlock?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const label = t(`report.button.${targetType}`, { name: targetName });
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={compact ? label : undefined}
        className={cn(
          'inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-sm text-muted hover:bg-surface-muted hover:text-danger',
          compact && 'min-w-11 justify-center',
          className,
        )}
      >
        <Flag aria-hidden="true" className="size-4" />
        {compact ? null : label}
      </button>
      <ReportDialog
        open={open}
        onOpenChange={setOpen}
        targetType={targetType}
        targetId={targetId}
        targetName={targetName}
        canBlock={canBlock}
      />
    </>
  );
}
