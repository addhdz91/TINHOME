import { useQuery } from '@tanstack/react-query';
import { PARAM_DEFAULTS, toPublicConfig } from '@tinhome/shared/constants';
import { PublicConfigSchema } from '@tinhome/shared/schemas';
import type { PublicConfig } from '@tinhome/shared/types';
import { readPublicDoc } from '@/lib/firestore-public';

const FALLBACK = toPublicConfig(PARAM_DEFAULTS);

/** `config/public` (prices, limits shown to visitors). Falls back to the documented defaults. */
export function usePublicConfig() {
  return useQuery({
    queryKey: ['config', 'public'],
    queryFn: async (): Promise<PublicConfig> => {
      const data = await readPublicDoc('config/public');
      const parsed = PublicConfigSchema.safeParse(data);
      return parsed.success ? parsed.data : FALLBACK;
    },
    staleTime: 5 * 60_000,
  });
}
