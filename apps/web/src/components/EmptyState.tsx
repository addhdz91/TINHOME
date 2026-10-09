import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  title: string;
  body?: string;
  icon?: ReactNode;
  action?: ReactNode;
  /** Use 1 when the empty state is the whole page. */
  headingLevel?: 1 | 2 | 3;
  className?: string;
}

/** C-16 — empty state: icon, title, text and up to two actions. */
export function EmptyState({
  title,
  body,
  icon,
  action,
  headingLevel,
  className,
}: EmptyStateProps) {
  const Heading = headingLevel ? (`h${String(headingLevel)}` as 'h1' | 'h2' | 'h3') : 'p';
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3 rounded-lg border border-dashed border-border p-6 text-center',
        className,
      )}
    >
      {icon ? (
        <div aria-hidden="true" className="text-brand-text [&_svg]:size-8">
          {icon}
        </div>
      ) : null}
      <Heading className="font-display text-h3 font-extrabold">{title}</Heading>
      {body ? <p className="text-muted">{body}</p> : null}
      {action}
    </div>
  );
}
