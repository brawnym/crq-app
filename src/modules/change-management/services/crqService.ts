import { supabase } from '@shared/auth/supabaseClient';
import type { CRQ, CRQFilters } from '@modules/change-management/types';

const CRQ_SELECT = `
  *,
  project:projects(id, name),
  requester:users!requester_id(id, full_name, email),
  approvers:crq_approvers(
    id, approver_id, status, comments, actioned_at,
    approver:users!approver_id(id, full_name, email)
  )
`;

export async function listCRQs(filters: CRQFilters): Promise<CRQ[]> {
  // approver_id is not a column on crqs — resolve via crq_approvers first
  if (filters.approver_id) {
    const { data: rows, error: apvErr } = await supabase
      .from('crq_approvers')
      .select('crq_id')
      .eq('approver_id', filters.approver_id);
    if (apvErr) throw apvErr;
    const ids = (rows ?? []).map((r) => r.crq_id as string);
    if (ids.length === 0) return [];
    // Re-call without approver_id but scoped to those IDs
    const rest = { ...filters, approver_id: undefined };
    const crqs = await listCRQs(rest);
    return crqs.filter((c) => ids.includes(c.id));
  }

  let query = supabase.from('crqs').select(CRQ_SELECT);

  if (!filters.include_archived) query = query.neq('status', 'archived');
  if (filters.status?.length) query = query.in('status', filters.status);
  if (filters.project_id) query = query.eq('project_id', filters.project_id);
  if (filters.priority) query = query.eq('priority', filters.priority);
  if (filters.date_from) query = query.gte('created_at', filters.date_from);
  if (filters.date_to) query = query.lte('created_at', filters.date_to);
  if (filters.search) {
    query = query.or(`title.ilike.%${filters.search}%,crq_number.ilike.%${filters.search}%`);
  }

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getCRQ(id: string): Promise<CRQ> {
  const { data, error } = await supabase
    .from('crqs')
    .select(CRQ_SELECT)
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function createCRQ(input: {
  title: string;
  description: string;
  priority: string;
  project_id: string | null;
  requester_id: string;
  requested_by: string;
  requested_date: string;
  authorized_by: string;
  changes_effective_from: string;
  due_date?: string | null;
  approver_ids: string[];
}): Promise<CRQ> {
  const { approver_ids, ...crqFields } = input;

  const { data: crq, error: crqError } = await supabase
    .from('crqs')
    .insert(crqFields)
    .select()
    .single();
  if (crqError) throw crqError;

  if (approver_ids.length > 0) {
    const approverRows = approver_ids.map((id) => ({
      crq_id: crq.id,
      approver_id: id,
    }));
    const { error: approverError } = await supabase
      .from('crq_approvers')
      .insert(approverRows);
    if (approverError) throw approverError;
  }

  return getCRQ(crq.id);
}

export async function updateCRQ(
  id: string,
  input: Partial<Pick<CRQ,
    'title' | 'description' | 'priority' | 'project_id' |
    'requested_by' | 'requested_date' | 'authorized_by' |
    'changes_effective_from' | 'due_date'
  >>
): Promise<void> {
  const { error } = await supabase.from('crqs').update(input).eq('id', id);
  if (error) throw error;
}

export async function updateCRQStatus(
  id: string,
  status: CRQ['status'],
  extra?: { archived_at?: string }
): Promise<void> {
  const { error } = await supabase
    .from('crqs')
    .update({ status, ...extra })
    .eq('id', id);
  if (error) throw error;
}

export async function archiveCRQ(id: string): Promise<void> {
  await updateCRQStatus(id, 'archived', { archived_at: new Date().toISOString() });
}
