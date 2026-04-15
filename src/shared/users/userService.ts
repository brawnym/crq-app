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
  const { data, error } = await supabase.rpc('get_active_approvers');
  if (error) throw error;
  return (data ?? []) as User[];
}

export async function inviteUser(
  email: string,
  fullName: string,
  role: UserRole
): Promise<{ tempPassword: string }> {
  // Uses signUp from the browser (service_role key is not available client-side).
  // The handle_new_user trigger reads full_name and role from raw_user_meta_data.
  //
  // EMAIL CONFIRMATION:
  //   Development / LAN: "Confirm email" is OFF in Supabase → user can log in immediately.
  //   PRODUCTION: Turn "Confirm email" ON in Supabase Auth settings.
  //               The green notice in the success modal (UserManagementPage.tsx) should then
  //               be swapped for the amber "confirmation required" notice that is currently
  //               commented out there.
  const tempPassword = 'Tmp1' + crypto.randomUUID().replace(/-/g, '').slice(0, 10);
  const { error } = await supabase.auth.signUp({
    email,
    password: tempPassword,
    options: { data: { full_name: fullName, role } },
  });
  if (error) throw error;
  return { tempPassword };
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
