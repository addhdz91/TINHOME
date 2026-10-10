import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { AMENITIES, HOME_TYPES, RESIDENCE_USES, TENURES } from '@tinhome/shared/constants';
import type { HomeOwnerView } from '@tinhome/shared/schemas';
import { CheckboxGroup } from '@/components/CheckboxGroup';
import { SelectField } from '@/components/SelectField';
import { TextField } from '@/components/TextField';
import { Button } from '@/components/ui/button';
import type { City } from '@/features/cities';
import { BasicsSchema, type BasicsValues } from '../lib/forms';

interface HomeBasicsFormProps {
  home: HomeOwnerView | null;
  cities: City[];
  defaultCityId?: string | undefined;
  submitLabel: string;
  onSubmit: (values: ReturnType<typeof BasicsSchema.parse>) => Promise<void>;
}

/** S-03 step 3a — city, zone (never the address), type, tenure and capacity (FR-10). */
export function HomeBasicsForm({
  home,
  cities,
  defaultCityId,
  submitLabel,
  onSubmit,
}: HomeBasicsFormProps) {
  const { t } = useTranslation();
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<BasicsValues, unknown, ReturnType<typeof BasicsSchema.parse>>({
    resolver: zodResolver(BasicsSchema),
    mode: 'onTouched',
    defaultValues: {
      cityId: home?.cityId ?? defaultCityId ?? '',
      zone: home?.zone ?? '',
      type: home?.type ?? 'FLAT',
      tenure: home?.tenure ?? 'OWNER',
      residenceUse: home?.residenceUse ?? 'PRIMARY',
      sizeM2: home?.sizeM2 ?? '',
      bedrooms: home?.bedrooms ?? 1,
      beds: home?.beds ?? 1,
      bathrooms: home?.bathrooms ?? 1,
      maxGuests: home?.maxGuests ?? 2,
      petsAllowed: home?.petsAllowed ?? false,
      amenities: home?.amenities ?? [],
    },
  });
  const msg = (field: keyof BasicsValues) => {
    const key = errors[field]?.message;
    return key ? t(`home.validation.${key as 'required'}`) : undefined;
  };

  return (
    <form
      noValidate
      onSubmit={(event) => void handleSubmit(onSubmit)(event)}
      className="flex flex-col gap-4"
    >
      <SelectField
        label={t('home.fields.city')}
        placeholder={t('home.fields.cityPlaceholder')}
        options={cities.map((c) => ({ value: c.id, label: c.name }))}
        error={msg('cityId')}
        {...register('cityId')}
      />
      <TextField
        label={t('home.fields.zone')}
        hint={t('home.fields.zoneHint')}
        error={msg('zone')}
        {...register('zone')}
      />
      <SelectField
        label={t('home.fields.type')}
        options={HOME_TYPES.map((v) => ({ value: v, label: t(`home.types.${v}`) }))}
        {...register('type')}
      />
      <SelectField
        label={t('home.fields.tenure')}
        options={TENURES.map((v) => ({ value: v, label: t(`home.tenures.${v}`) }))}
        {...register('tenure')}
      />
      <SelectField
        label={t('home.fields.use')}
        options={RESIDENCE_USES.map((v) => ({ value: v, label: t(`home.uses.${v}`) }))}
        {...register('residenceUse')}
      />
      <div className="grid grid-cols-2 gap-3">
        <TextField
          label={t('home.fields.sizeM2')}
          type="number"
          inputMode="numeric"
          min={10}
          max={1000}
          error={msg('sizeM2')}
          {...register('sizeM2')}
        />
        <TextField
          label={t('home.fields.maxGuests')}
          type="number"
          inputMode="numeric"
          min={1}
          max={12}
          error={msg('maxGuests')}
          {...register('maxGuests')}
        />
        <TextField
          label={t('home.fields.bedrooms')}
          type="number"
          inputMode="numeric"
          min={0}
          max={10}
          error={msg('bedrooms')}
          {...register('bedrooms')}
        />
        <TextField
          label={t('home.fields.beds')}
          type="number"
          inputMode="numeric"
          min={1}
          max={20}
          error={msg('beds')}
          {...register('beds')}
        />
        <TextField
          label={t('home.fields.bathrooms')}
          type="number"
          inputMode="numeric"
          min={1}
          max={10}
          error={msg('bathrooms')}
          {...register('bathrooms')}
        />
      </div>
      <label className="flex min-h-11 items-center gap-3">
        <input type="checkbox" className="size-5 accent-primary" {...register('petsAllowed')} />
        {t('home.fields.petsAllowed')}
      </label>
      <Controller
        control={control}
        name="amenities"
        render={({ field }) => (
          <CheckboxGroup
            id="home-amenities"
            legend={t('home.fields.amenities')}
            options={AMENITIES.map((a) => ({ value: a, label: t(`home.amenities.${a}`) }))}
            value={field.value}
            onChange={(value) => field.onChange(value)}
          />
        )}
      />
      <Button type="submit" size="lg" disabled={isSubmitting} className="self-start">
        {isSubmitting ? t('home.saving') : submitLabel}
      </Button>
    </form>
  );
}
