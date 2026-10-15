import { z } from 'zod';
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
    firstName: z.string().trim().min(1, 'firstName').max(60, 'firstName'),
    lastName: z.string().trim().min(1, 'lastName').max(60, 'lastName'),
    birthDate: z
      .string()
      .refine(isIsoDate, 'birthDate')
      .refine(
        (value) => value <= today && ageOn(value, today) <= MAX_AGE_YEARS,
        'birthDate',
      )
      .refine((value) => ageOn(value, today) >= MIN_AGE_YEARS, 'underage'),
    email: withCredentials ? z.string().trim().pipe(z.email('email')) : z.string(),
    password: withCredentials
      ? z.string().superRefine((value, ctx) => {
          const problem = passwordProblem(value);
          if (problem)
            ctx.addIssue({
              code: 'custom',
              message: problem === 'common' ? 'passwordCommon' : 'password',
            });
        })
      : z.string(),
    referralCode: z
      .string()
      .refine(
        (value) => value.trim() === '' || normalizeReferralCode(value) !== null,
        'referralCode',
      ),
    acceptTerms: z.boolean().refine(Boolean, 'terms'),
    acceptPrivacy: z.boolean().refine(Boolean, 'privacy'),
  });
}

export type RegisterValues = z.input<ReturnType<typeof registerSchema>>;
