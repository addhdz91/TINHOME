import { useId, type ComponentProps } from 'react';
import { cn } from '@/lib/utils';

interface SelectFieldProps extends Omit<ComponentProps<'select'>, 'id'> {
  label: string;
  options: { value: string; label: string }[];
  placeholder?: string;
  error?: string | undefined;
}

/** Labelled native select (best on mobile) with linked error. */
export function SelectField({
  label,
  options,
  placeholder,
  error,
  className,
  ...props
}: SelectFieldProps) {
  const id = useId();
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="font-semibold">
        {label}
      </label>
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={`${id}-error`}
        className={cn(
          'min-h-11 w-full min-w-0 rounded-md border bg-surface px-3 text-text',
          error ? 'border-danger' : 'border-border',
        )}
        {...props}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <p id={`${id}-error`} className="text-sm font-semibold text-danger">
        {error ?? ''}
      </p>
    </div>
  );
}
