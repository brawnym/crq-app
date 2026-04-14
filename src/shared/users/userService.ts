import { supabase } from '@shared/auth/supabaseClient';
import type { User, UserRole } from '@shared/types';

export async function listUsers(): Promise<User[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('full_name');
  if (error) throw error;
  return data ?? [];
}

export async function listApprovers(): Promise<User[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('role', 'approver')
    .eq('is_active', true)
    .order('full_name');
  if (error) throw error;
  return data ?? [];
}

export async function inviteUser(
  email: string,
  fullName: string,
  role: UserRole
): Promise<void> {
  const { error } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName, role },
  });
  if (error) throw error;
}

export async function updateUserRole(userId: string, role: UserRole): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({ role })
    .eq('id', userId);
  if (error) throw error;
}

export async function deactivateUser(userId: string): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({ is_active: false })
    .eq('id', userId);
  if (error) throw error;
}

export async function reactivateUser(userId: string): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({ is_active: true })
    .eq('id', userId);
  if (error) throw error;
}
