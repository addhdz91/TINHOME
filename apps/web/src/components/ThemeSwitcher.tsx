import { RadioGroup } from 'radix-ui';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { THEME_PREFERENCES, type ThemePreference } from '@tinhome/shared/constants';
import { useTheme } from '@/app/theme-context';
import { cn } from '@/lib/utils';

function ThemePreview({ preference }: { preference: ThemePreference }) {
  // `system` shows half light / half dark; the others nest their own data-theme.
  if (preference === 'system') {
    return (
      <span
        aria-hidden="true"
        className="flex h-10 w-16 overflow-hidden rounded-sm border border-border"
      >
        <span data-theme="light" className="flex-1 bg-bg" />
        <span data-theme="dark" className="flex-1 bg-bg" />
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      data-theme={preference}
      className="flex h-10 w-16 flex-col justify-end gap-1 rounded-sm border border-border bg-bg p-1.5"
    >
      <span className="h-1.5 w-8 rounded-full bg-text" />
      <span className="h-2.5 w-full rounded-sm bg-primary" />
    </span>
  );
}

interface ThemeSwitcherProps {
  className?: string;
  /** Called instead of only storing locally (e.g. to also save it in the account). */
  onChange?: (preference: ThemePreference) => void;
}

/** C-26 — Sistema / Claro / Oscuro / Negro with a thumbnail preview (radio group). */
export function ThemeSwitcher({ className, onChange }: ThemeSwitcherProps) {
  const { t } = useTranslation();
  const { preference, setPreference } = useTheme();
  const labelId = useId();

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <span id={labelId} className="text-sm font-semibold">
        {t('theme.label')}
      </span>
      <RadioGroup.Root
        aria-labelledby={labelId}
        value={preference}
        onValueChange={(value) => {
          const next = THEME_PREFERENCES.find((option) => option === value);
          if (next) (onChange ?? setPreference)(next);
        }}
        className="grid grid-cols-2 gap-2 sm:grid-cols-4"
      >
        {THEME_PREFERENCES.map((option) => (
          <RadioGroup.Item
            key={option}
            value={option}
            aria-labelledby={`${labelId}-${option}-name`}
            aria-describedby={`${labelId}-${option}-hint`}
            className={cn(
              'flex min-h-11 flex-col items-center gap-2 rounded-md border border-border bg-surface p-2 text-sm text-text transition-colors duration-fast',
              'hover:bg-surface-muted data-[state=checked]:border-primary data-[state=checked]:ring-2 data-[state=checked]:ring-primary',
            )}
          >
            <ThemePreview preference={option} />
            <span id={`${labelId}-${option}-name`} className="font-semibold">
              {t(`theme.options.${option}`)}
            </span>
            <span id={`${labelId}-${option}-hint`} className="text-caption text-muted">
              {t(`theme.hints.${option}`)}
            </span>
          </RadioGroup.Item>
        ))}
      </RadioGroup.Root>
    </div>
  );
}
