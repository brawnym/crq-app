import { supabase } from '@shared/auth/supabaseClient';
import type { Project } from '@shared/types';

export async function listProjects(includeInactive = false): Promise<Project[]> {
  let query = supabase.from('projects').select('*, owner:users!owner_id(id, full_name, email)');
  if (!includeInactive) query = query.eq('is_active', true);
  const { data, error } = await query.order('name');
  if (error) throw error;
  return data ?? [];
}

export async function createProject(input: {
  name: string;
  description: string | null;
  owner_id: string | null;
}): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateProject(
  id: string,
  input: Partial<Pick<Project, 'name' | 'description' | 'owner_id' | 'is_active'>>
): Promise<void> {
  const { error } = await supabase.from('projects').update(input).eq('id', id);
  if (error) throw error;
}
