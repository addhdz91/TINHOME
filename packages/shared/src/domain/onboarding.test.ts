import { describe, expect, it } from 'vitest';
import { mandatoryOnboardingStep, onboardingPercent } from './onboarding.js';

describe('onboarding', () => {
  it('reports progress by completed steps', () => {
    expect(onboardingPercent(1, false)).toBe(0);
    expect(onboardingPercent(3, false)).toBe(33);
    expect(onboardingPercent(6, false)).toBe(83);
    expect(onboardingPercent(6, true)).toBe(100);
  });

  it('forces steps 2–4 only', () => {
    expect(mandatoryOnboardingStep(2, false)).toBe(2);
    expect(mandatoryOnboardingStep(4, false)).toBe(4);
    expect(mandatoryOnboardingStep(5, false)).toBeNull();
    expect(mandatoryOnboardingStep(3, true)).toBeNull();
  });
});
