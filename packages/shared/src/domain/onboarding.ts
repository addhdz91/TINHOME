import type { OnboardingStep } from '../constants/enums.js';

/** FR-06 — percent shown as «Perfil completado X %»: completed steps out of 6. */
export function onboardingPercent(step: OnboardingStep, completed: boolean): number {
  if (completed) return 100;
  return Math.round(((step - 1) * 100) / 6);
}

/**
 * 02_UX §2.3 — steps 2–4 are mandatory before using the app; 5 and 6 can be done later
 * (Discover explains the blocker). Returns the step to redirect to, or null.
 */
export function mandatoryOnboardingStep(
  step: OnboardingStep,
  completed: boolean,
): OnboardingStep | null {
  if (completed) return null;
  return step <= 4 ? step : null;
}
