import type { UserRole } from '@shared/types';

export const ROLES = {
  REQUESTER: 'requester' as UserRole,
  APPROVER: 'approver' as UserRole,
  ADMIN: 'admin' as UserRole,
} as const;

export function canCreateCRQ(role: UserRole): boolean {
  return role === ROLES.REQUESTER || role === ROLES.ADMIN;
}

export function canApprove(role: UserRole): boolean {
  return role === ROLES.APPROVER || role === ROLES.ADMIN;
}

export function canManageUsers(role: UserRole): boolean {
  return role === ROLES.ADMIN;
}
