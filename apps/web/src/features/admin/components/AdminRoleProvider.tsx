import type { ReactNode } from 'react';
import type { AdminRole } from '@tinhome/shared/constants';
import { AdminRoleContext } from '../lib/role';

export function AdminRoleProvider({
  adminRole,
  children,
}: {
  adminRole: AdminRole;
  children: ReactNode;
}) {
  return <AdminRoleContext value={adminRole}>{children}</AdminRoleContext>;
}
