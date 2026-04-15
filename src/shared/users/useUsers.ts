import { useEffect, useState, useCallback } from 'react';
import type { User, UserRole } from '@shared/types';
import { listUsers, inviteUser, updateUserRole, deactivateUser, reactivateUser } from './userService';

export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setUsers(await listUsers());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function invite(email: string, fullName: string, role: UserRole): Promise<{ tempPassword: string }> {
    const result = await inviteUser(email, fullName, role);
    await load();
    return result;
  }

  async function changeRole(userId: string, role: UserRole) {
    await updateUserRole(userId, role);
    await load();
  }

  async function deactivate(userId: string) {
    await deactivateUser(userId);
    await load();
  }

  async function reactivate(userId: string) {
    await reactivateUser(userId);
    await load();
  }

  return { users, loading, error, invite, changeRole, deactivate, reactivate, reload: load };
}
