import { createContext, use } from 'react';
import type { AdminRole } from '@tinhome/shared/constants';

export const AdminRoleContext = createContext<AdminRole>('admin');

/** FR-48 — superadmin-only items are hidden for admins (the server checks again). */
export function useIsSuperadmin(): boolean {
  return use(AdminRoleContext) === 'superadmin';
}
