import { supabase } from './supabaseClient';

export async function updateProfileName(userId: string, fullName: string): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({ full_name: fullName })
    .eq('id', userId);
  if (error) throw error;
}

export async function updatePassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `${userId}/avatar.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true, contentType: file.type });
  if (uploadError) throw uploadError;

  // Bust cache by appending a timestamp
  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return `${data.publicUrl}?t=${Date.now()}`;
}

export async function saveAvatarUrl(userId: string, url: string): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({ avatar_url: url })
    .eq('id', userId);
  if (error) throw error;
}
