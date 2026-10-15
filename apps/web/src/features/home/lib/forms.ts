import { z } from 'zod/mini';
import { AMENITIES, HOME_TYPES, RESIDENCE_USES, TENURES } from '@tinhome/shared/constants';
import { validateListingText } from '@tinhome/shared/domain';

/** Messages are keys of `home.validation`. */
const noContact = (value: string) => validateListingText(value).ok;

const int = (min: number, max: number) =>
  z
    .coerce.number<string | number>()
    .check(z.refine(Number.isInteger, 'range'), z.gte(min, 'range'), z.lte(max, 'range'));

/** S-03 step 3a — basic data. */
export const BasicsSchema = z.object({
  cityId: z.string().check(z.minLength(1, 'required')),
  zone: z.string().check(z.trim(), z.minLength(2, 'zone'), z.maxLength(60, 'zone'), z.refine(noContact, 'text')),
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
  title: z.string().check(z.trim(), z.minLength(10, 'title'), z.maxLength(70, 'title'), z.refine(noContact, 'text')),
  description: z
    .string().check(z.trim(), z.minLength(50, 'description'), z.maxLength(1500, 'description'), z.refine(noContact, 'text')),
  houseRules: z.string().check(z.trim(), z.maxLength(500, 'range'), z.refine(noContact, 'text')),
});
export type DescriptionValues = z.infer<typeof DescriptionSchema>;
