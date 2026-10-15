import {
  connectFunctionsEmulator,
  getFunctions,
  httpsCallable,
  type Functions,
} from 'firebase/functions';
import type { z } from 'zod/mini';
import { REGION } from '@tinhome/shared/constants';
import { toAppError } from './app-error';
import { emulatorsEnabled, firebaseApp } from './firebase-app';

let functionsInstance: Functions | null = null;

function functions(): Functions {
  if (functionsInstance) return functionsInstance;
  functionsInstance = getFunctions(firebaseApp(), REGION);
  if (emulatorsEnabled()) connectFunctionsEmulator(functionsInstance, '127.0.0.1', 5001);
  return functionsInstance;
}

/**
 * 03_TECHNICAL_SPEC.md §4.2 — typed callable: validates input and output with the shared
 * zod schemas and turns failures into `AppError`.
 */
export function callable<I extends z.ZodMiniType, O extends z.ZodMiniType>(name: string, input: I, output: O) {
  return async (data: z.input<I>): Promise<z.output<O>> => {
    try {
      const fn = httpsCallable(functions(), name);
      const result = await fn(input.parse(data));
      return output.parse(result.data);
    } catch (error) {
      throw toAppError(error);
    }
  };
}

