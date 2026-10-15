import { GetMeInput, GetMeOutput, OkOutput, UpdateSettingsInput } from '@tinhome/shared/schemas';
import { callable } from './callable';

/**
 * NFR-02 — the two callables the session gate needs, in their own module so the session chunk
 * does not carry every schema of `callables.ts` (all routes load it before the first paint).
 */
export const getMe = callable('getMe', GetMeInput, GetMeOutput);
export const updateSettings = callable('updateSettings', UpdateSettingsInput, OkOutput);
