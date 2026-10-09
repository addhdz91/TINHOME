import { X } from 'lucide-react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

interface DialogContentProps extends ComponentProps<typeof DialogPrimitive.Content> {
  title: string;
  description?: ReactNode;
  /** Label of the close button; omit it for blocking dialogs (FR-58). */
  closeLabel?: string;
}

/**
 * shadcn/ui dialog mapped to tokens: bottom sheet on mobile, centred card from `sm`.
 * Focus trap, Escape and `aria-*` come from Radix.
 */
export function DialogContent({
  title,
  description,
  closeLabel,
  className,
  children,
  ...props
}: DialogContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-overlay" />
      <DialogPrimitive.Content
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 flex max-h-[90dvh] flex-col gap-4 overflow-y-auto rounded-t-xl border border-border bg-surface p-5 text-text shadow-sheet',
          'sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl',
          'pb-[max(1.25rem,env(safe-area-inset-bottom))]',
          className,
        )}
        {...props}
      >
        <div className="flex items-start justify-between gap-3">
          <DialogPrimitive.Title className="font-display text-h2 font-extrabold">
            {title}
          </DialogPrimitive.Title>
          {closeLabel ? (
            <DialogPrimitive.Close
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-md hover:bg-surface-muted"
              aria-label={closeLabel}
            >
              <X aria-hidden="true" className="size-5" />
            </DialogPrimitive.Close>
          ) : null}
        </div>
        {description ? (
          <DialogPrimitive.Description className="text-muted">
            {description}
          </DialogPrimitive.Description>
        ) : (
          <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
        )}
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
