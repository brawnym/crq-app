import { supabase } from '@shared/auth/supabaseClient';
import type { AuditEntry } from '@modules/change-management/types';

export async function appendAudit(entry: {
  crq_id: string;
  actor_id: string;
  action: string;
  previous_value?: Record<string, unknown> | null;
  new_value?: Record<string, unknown> | null;
  note?: string;
}): Promise<void> {
  const { error } = await supabase.from('audit_trail').insert(entry);
  if (error) throw error;
}

export async function getAuditTrail(crqId: string): Promise<AuditEntry[]> {
  const { data, error } = await supabase
    .from('audit_trail')
    .select('*, actor:users!actor_id(id, full_name, email)')
    .eq('crq_id', crqId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}
