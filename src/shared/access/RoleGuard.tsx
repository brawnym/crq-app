import { ReactNode } from 'react';
import type { UserRole } from '@shared/types';
import { useAuth } from '@shared/auth/useAuth';

interface RoleGuardProps {
  allow: UserRole[];
  children: ReactNode;
  fallback?: ReactNode;
}

export function RoleGuard({ allow, children, fallback = null }: RoleGuardProps) {
  const { profile } = useAuth();
  if (!profile || !allow.includes(profile.role)) return <>{fallback}</>;
  return <>{children}</>;
}
