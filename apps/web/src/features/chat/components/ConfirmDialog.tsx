import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog';

/** Small confirmation sheet for irreversible actions (share phone, unmatch, block). */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  body,
  confirmLabel,
  cancelLabel,
  danger = false,
  busy = false,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={title} description={body}>
        <Button
          variant={danger ? 'danger' : 'primary'}
          size="lg"
          disabled={busy}
          onClick={onConfirm}
        >
          {confirmLabel}
        </Button>
        <DialogClose asChild>
          <Button variant="ghost">{cancelLabel}</Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}
