import { useAuth } from '@shared/auth/useAuth';
import { actionApproval, checkAllApproved, resetApproversForResubmit } from '../services/approvalService';
import { updateCRQStatus } from '../services/crqService';
import { appendAudit } from '../services/auditService';

export function useApprovals(crqId: string, onUpdate: () => void) {
  const { profile } = useAuth();

  async function approve(approverRowId: string) {
    await actionApproval(approverRowId, 'approved', null);
    await appendAudit({ crq_id: crqId, actor_id: profile!.id, action: 'approved' });
    const allDone = await checkAllApproved(crqId);
    if (allDone) {
      await updateCRQStatus(crqId, 'in_implementation');
      await appendAudit({ crq_id: crqId, actor_id: profile!.id, action: 'in_implementation', note: 'All approvers approved' });
    }
    onUpdate();
  }

  async function reject(approverRowId: string, comments: string) {
    await actionApproval(approverRowId, 'rejected', comments);
    await updateCRQStatus(crqId, 'rejected');
    await appendAudit({ crq_id: crqId, actor_id: profile!.id, action: 'rejected', note: comments });
    onUpdate();
  }

  async function sendBack(approverRowId: string, comments: string) {
    await actionApproval(approverRowId, 'sent_back', comments);
    await updateCRQStatus(crqId, 'draft');
    await appendAudit({ crq_id: crqId, actor_id: profile!.id, action: 'sent_back', note: comments });
    onUpdate();
  }

  return { approve, reject, sendBack, resetApproversForResubmit };
}
