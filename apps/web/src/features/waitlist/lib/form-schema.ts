import { z } from 'zod';
import { JoinWaitlistInput } from '@tinhome/shared/schemas';

/**
 * Form model of S-16. It reuses the shared input schema field by field so the client guides
 * with the same rules the server enforces; the privacy checkbox becomes the accepted version
 * when submitting.
 */
export function waitlistFormSchema(maxDestinations: number) {
  return z
    .object({
      email: JoinWaitlistInput.shape.email,
      cityId: z.string().min(1, 'cityId'),
      destinations: z
        .array(z.string())
        .min(1, 'destinations')
        .max(maxDestinations, 'destinationsMax'),
      windowIds: z.array(z.string()),
      acceptPrivacy: z.boolean().refine((accepted) => accepted, 'acceptPrivacy'),
    })
    .refine((v) => !v.destinations.includes(v.cityId), {
      path: ['destinations'],
      message: 'destinations',
    });
}

export type WaitlistFormValues = z.input<ReturnType<typeof waitlistFormSchema>>;
