import { z } from 'zod/mini';
import { MAX_AGE_YEARS, MIN_AGE_YEARS } from '@tinhome/shared/constants';
import { ageOn, isIsoDate, normalizeReferralCode, toIsoDate } from '@tinhome/shared/domain';
import { passwordProblem } from './password';

/**
 * S-02 sign-up form. Error messages are es.json keys under `auth.validation`. `withCredentials`
 * is false when completing a Google sign-up (no e-mail/password fields).
 */
export function registerSchema(now: Date, withCredentials: boolean) {
  const today = toIsoDate(now);
  return z.object({
    firstName: z.string().check(z.trim(), z.minLength(1, 'firstName'), z.maxLength(60, 'firstName')),
    lastName: z.string().check(z.trim(), z.minLength(1, 'lastName'), z.maxLength(60, 'lastName')),
    birthDate: z
      .string().check(z.refine(isIsoDate, 'birthDate'), z.refine(
          (value) => !isIsoDate(value) || (value <= today && ageOn(value, today) <= MAX_AGE_YEARS),
          'birthDate',
        ), z.refine((value) => !isIsoDate(value) || ageOn(value, today) >= MIN_AGE_YEARS, 'underage')),
    email: withCredentials ? z.pipe(z.string().check(z.trim()), z.email('email')) : z.string(),
    password: withCredentials
      ? z.string().check(z.superRefine((value, ctx) => {
          const problem = passwordProblem(value);
          if (problem)
            ctx.addIssue({
              code: 'custom',
              message: problem === 'common' ? 'passwordCommon' : 'password',
            });
        }))
      : z.string(),
    referralCode: z
      .string().check(z.refine((value) => value.trim() === '' || normalizeReferralCode(value) !== null, 'referralCode')),
    acceptTerms: z.boolean().check(z.refine(Boolean, 'terms')),
    acceptPrivacy: z.boolean().check(z.refine(Boolean, 'privacy')),
    acceptCookies: z.boolean().check(z.refine(Boolean, 'cookies')),
  });
}

export type RegisterValues = z.input<ReturnType<typeof registerSchema>>;
