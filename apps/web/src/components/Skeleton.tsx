import { cn } from '@/lib/utils';

/** C-17 — placeholder block while data loads (decorative for assistive tech). */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded-md bg-surface-muted', className)}
    />
  );
}
