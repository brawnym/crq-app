import { supabase } from '@shared/auth/supabaseClient';
import type { ApproverStatus } from '@modules/change-management/types';

export async function actionApproval(
  approverRowId: string,
  status: ApproverStatus,
  comments: string | null
): Promise<void> {
  const { error } = await supabase
    .from('crq_approvers')
    .update({ status, comments, actioned_at: new Date().toISOString() })
    .eq('id', approverRowId);
  if (error) throw error;
}

export async function checkAllApproved(crqId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('check_all_approved', { p_crq_id: crqId });
  if (error) throw error;
  return data === true;
}

export async function resetApproversForResubmit(crqId: string): Promise<void> {
  const { error } = await supabase
    .from('crq_approvers')
    .update({ status: 'pending', comments: null, actioned_at: null })
    .eq('crq_id', crqId);
  if (error) throw error;
}
