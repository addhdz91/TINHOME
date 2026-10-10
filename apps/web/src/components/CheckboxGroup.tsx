import { FieldError } from './FieldError';

interface CheckboxGroupProps {
  id: string;
  legend: string;
  hint?: string;
  options: { value: string; label: string }[];
  value: string[];
  onChange: (value: string[]) => void;
  error?: string | undefined;
}

/** Accessible multi-choice (fieldset + legend), chips with 44 px targets. */
export function CheckboxGroup({
  id,
  legend,
  hint,
  options,
  value,
  onChange,
  error,
}: CheckboxGroupProps) {
  const toggle = (option: string, checked: boolean) => {
    onChange(checked ? [...value, option] : value.filter((v) => v !== option));
  };
  return (
    <fieldset
      id={id}
      tabIndex={-1}
      aria-describedby={`${id}-hint ${id}-error`}
      aria-invalid={error ? true : undefined}
      className="flex flex-col gap-2 outline-none"
    >
      <legend className="mb-2 font-semibold">{legend}</legend>
      {hint ? (
        <p id={`${id}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const checked = value.includes(option.value);
          const inputId = `${id}-${option.value}`;
          return (
            <label
              key={option.value}
              htmlFor={inputId}
              className="flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-border bg-surface px-4 has-checked:border-primary has-checked:bg-brand-soft has-focus-visible:outline-2 has-focus-visible:outline-focus"
            >
              <input
                id={inputId}
                type="checkbox"
                className="size-4 accent-primary"
                checked={checked}
                onChange={(event) => toggle(option.value, event.target.checked)}
              />
              {option.label}
            </label>
          );
        })}
      </div>
      <FieldError id={`${id}-error`} message={error} />
    </fieldset>
  );
}
