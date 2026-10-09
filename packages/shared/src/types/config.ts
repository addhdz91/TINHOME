import type { z } from 'zod';
import type { ParamsSchema, PublicConfigSchema } from '../schemas/config.js';

/** `config/params` — every P-xx parameter (01_PRD.md §9). */
export type Params = z.infer<typeof ParamsSchema>;

/** `config/public` — parameters the client may read (04 §2.22). */
export type PublicConfig = z.infer<typeof PublicConfigSchema>;
