import { z } from 'zod/mini';
import { JoinWaitlistInput } from '@tinhome/shared/schemas';

/**
 * Form model of S-16. It reuses the shared input schema field by field so the client guides
 * with the same rules the server enforces; each legal checkbox becomes the accepted version
 * when submitting.
 */
export function waitlistFormSchema(maxDestinations: number) {
  return z
    .object({
      email: JoinWaitlistInput.shape.email,
      cityId: z.string().check(z.minLength(1, 'cityId')),
      destinations: z
        .array(z.string()).check(z.minLength(1, 'destinations'), z.maxLength(maxDestinations, 'destinationsMax')),
      windowIds: z.array(z.string()),
      acceptTerms: z.boolean().check(z.refine((accepted) => accepted, 'acceptTerms')),
      acceptPrivacy: z.boolean().check(z.refine((accepted) => accepted, 'acceptPrivacy')),
      acceptCookies: z.boolean().check(z.refine((accepted) => accepted, 'acceptCookies')),
    }).check(z.refine((v) => !v.destinations.includes(v.cityId), {
      path: ['destinations'],
      message: 'destinations',
    }));
}

export type WaitlistFormValues = z.input<ReturnType<typeof waitlistFormSchema>>;
