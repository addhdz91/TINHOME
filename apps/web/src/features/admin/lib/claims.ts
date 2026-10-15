import { useQuery } from '@tanstack/react-query';
import type { User } from 'firebase/auth';
import { ADMIN_ROLES, type AdminRole } from '@tinhome/shared/constants';

export interface AdminClaims {
  role: AdminRole | null;
  secondFactor: boolean;
}

/** Role (custom claim) and whether this session used a second factor (FR-48). */
export function useAdminClaims(user: User) {
  return useQuery({
    queryKey: ['admin', 'claims', user.uid],
    staleTime: 60_000,
    queryFn: async (): Promise<AdminClaims> => {
      const token = await user.getIdTokenResult();
      const role = ADMIN_ROLES.find((r) => r === token.claims.role) ?? null;
      return { role, secondFactor: Boolean(token.signInSecondFactor) };
    },
  });
}
