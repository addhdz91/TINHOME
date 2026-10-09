import { Eye, EyeOff } from 'lucide-react';
import { useState, type ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { TextField } from '@/components/TextField';
import { cn } from '@/lib/utils';
import { passwordStrength } from '../lib/password';

interface PasswordFieldProps extends Omit<ComponentProps<typeof TextField>, 'type' | 'trailing'> {
  /** Current value, to show the strength indicator (sign-up only). */
  strengthOf?: string;
}

const STRENGTH_CLASS = {
  weak: 'w-1/3 bg-danger',
  medium: 'w-2/3 bg-warning',
  strong: 'w-full bg-success',
} as const;

/** S-02 — password with «mostrar» toggle and optional strength indicator. */
export function PasswordField({ strengthOf, ...props }: PasswordFieldProps) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const strength = strengthOf ? passwordStrength(strengthOf) : null;
  return (
    <div className="flex flex-col gap-1">
      <TextField
        {...props}
        type={visible ? 'text' : 'password'}
        trailing={
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? t('common.hidePassword') : t('common.showPassword')}
            aria-pressed={visible}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-md text-muted hover:text-text"
          >
            {visible ? (
              <EyeOff aria-hidden="true" className="size-5" />
            ) : (
              <Eye aria-hidden="true" className="size-5" />
            )}
          </button>
        }
      />
      {strength ? (
        <div className="flex items-center gap-2" aria-live="polite">
          <div
            aria-hidden="true"
            className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-muted"
          >
            <div className={cn('h-full rounded-full', STRENGTH_CLASS[strength])} />
          </div>
          <span className="text-caption text-muted">
            {t('auth.strength.label', { level: t(`auth.strength.${strength}`) })}
          </span>
        </div>
      ) : null}
    </div>
  );
}
