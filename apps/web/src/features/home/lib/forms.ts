import { z } from 'zod';
import { AMENITIES, HOME_TYPES, RESIDENCE_USES, TENURES } from '@tinhome/shared/constants';
import { validateListingText } from '@tinhome/shared/domain';

/** Messages are keys of `home.validation`. */
const noContact = (value: string) => validateListingText(value).ok;

const int = (min: number, max: number) =>
  z.coerce.number<string | number>().int('range').min(min, 'range').max(max, 'range');

/** S-03 step 3a — basic data. */
export const BasicsSchema = z.object({
  cityId: z.string().min(1, 'required'),
  zone: z.string().trim().min(2, 'zone').max(60, 'zone').refine(noContact, 'text'),
  type: z.enum(HOME_TYPES, 'required'),
  tenure: z.enum(TENURES, 'required'),
  residenceUse: z.enum(RESIDENCE_USES, 'required'),
  sizeM2: int(10, 1000),
  bedrooms: int(0, 10),
  beds: int(1, 20),
  bathrooms: int(1, 10),
  maxGuests: int(1, 12),
  petsAllowed: z.boolean(),
  amenities: z.array(z.enum(AMENITIES)),
});
export type BasicsValues = z.input<typeof BasicsSchema>;

/** S-03 step 3c — texts, validated with BR-22 while typing (the server decides). */
export const DescriptionSchema = z.object({
  title: z.string().trim().min(10, 'title').max(70, 'title').refine(noContact, 'text'),
  description: z
    .string()
    .trim()
    .min(50, 'description')
    .max(1500, 'description')
    .refine(noContact, 'text'),
  houseRules: z.string().trim().max(500, 'range').refine(noContact, 'text'),
});
export type DescriptionValues = z.infer<typeof DescriptionSchema>;
