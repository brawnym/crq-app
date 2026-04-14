import { supabase } from '@shared/auth/supabaseClient';
import type { FollowUp } from '@modules/change-management/types';

export async function createFollowUp(input: {
  crq_id: string;
  sender_id: string;
  recipient_id: string;
  message: string;
}): Promise<void> {
  const { error } = await supabase.from('follow_ups').insert(input);
  if (error) throw error;
}

export async function getFollowUps(crqId: string): Promise<FollowUp[]> {
  const { data, error } = await supabase
    .from('follow_ups')
    .select('*, sender:users!sender_id(id, full_name), recipient:users!recipient_id(id, full_name)')
    .eq('crq_id', crqId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}
