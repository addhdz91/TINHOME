import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ONBOARDING_STEPS, type OnboardingStep } from '@tinhome/shared/constants';
import { cn } from '@/lib/utils';

type StepStatus = 'done' | 'current' | 'todo';

function stepStatus(
  step: OnboardingStep,
  current: OnboardingStep,
  reached: OnboardingStep,
): StepStatus {
  if (step === current) return 'current';
  return step < reached ? 'done' : 'todo';
}

interface ProgressStepperProps {
  current: OnboardingStep;
  /** Highest step the user has reached (earlier ones are done). */
  reached: OnboardingStep;
}

/** C-10 — «Paso N de 6» bar on mobile; numbered steps with status from `sm`. */
export function ProgressStepper({ current, reached }: ProgressStepperProps) {
  const { t } = useTranslation();
  return (
    <nav aria-label={t('onboarding.progressLabel')} className="flex flex-col gap-2">
      <p className="text-sm font-semibold text-muted">
        {t('onboarding.stepOf', { step: current })}
      </p>
      <div
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={6}
        aria-valuenow={current}
        aria-valuetext={t('onboarding.stepOf', { step: current })}
        className="h-2 overflow-hidden rounded-full bg-surface-muted sm:hidden"
      >
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${String((current / 6) * 100)}%` }}
        />
      </div>
      <ol className="hidden gap-2 sm:grid sm:grid-cols-6">
        {ONBOARDING_STEPS.map((step) => {
          const status = stepStatus(step, current, reached);
          const done = status === 'done';
          const isCurrent = status === 'current';
          return (
            <li
              key={step}
              aria-current={isCurrent ? 'step' : undefined}
              className="flex flex-col items-start gap-1"
            >
              <span
                className={cn(
                  'flex size-8 items-center justify-center rounded-full border text-sm font-semibold',
                  isCurrent && 'border-primary bg-primary text-primary-foreground',
                  done && 'border-success text-success',
                  status === 'todo' && 'border-border text-muted',
                )}
              >
                {done ? <Check aria-hidden="true" className="size-4" /> : step}
              </span>
              <span
                className={cn('text-caption', isCurrent ? 'font-semibold text-text' : 'text-muted')}
              >
                {t(`onboarding.steps.${String(step) as '1'}`)}
                <span className="sr-only"> ({t(`onboarding.stepStatus.${status}`)})</span>
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
