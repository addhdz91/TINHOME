import { useId, type ComponentProps, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface TextFieldProps extends Omit<ComponentProps<'input'>, 'id'> {
  label: string;
  hint?: ReactNode;
  error?: string | undefined;
  /** Rendered inside the input box on the right (e.g. «mostrar contraseña»). */
  trailing?: ReactNode;
  /** Rendered before the input (e.g. a fixed +34 prefix). */
  leading?: ReactNode;
  id?: string;
}

/**
 * Labelled input with hint and error linked by `aria-describedby` (UX §10). 16 px text and
 * 44 px height; accepts react-hook-form's `register()` props, including `ref`.
 */
export function TextField({
  label,
  hint,
  error,
  trailing,
  leading,
  id,
  className,
  ...props
}: TextFieldProps) {
  const generated = useId();
  const inputId = id ?? generated;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={inputId} className="font-semibold">
        {label}
      </label>
      <div
        className={cn(
          'flex min-h-11 items-center rounded-md border bg-surface focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus',
          error ? 'border-danger' : 'border-border',
        )}
      >
        {leading}
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={`${hint ? hintId : ''} ${errorId}`.trim()}
          className="min-h-11 w-full min-w-0 flex-1 rounded-md bg-transparent px-3 text-text outline-none"
          {...props}
        />
        {trailing}
      </div>
      {hint ? (
        <p id={hintId} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
      <p id={errorId} className="text-sm font-semibold text-danger">
        {error ?? ''}
      </p>
    </div>
  );
}
