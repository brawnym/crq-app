import { useState } from 'react';
import { CheckCircle, XCircle, RotateCcw } from 'lucide-react';
import { Button } from '@shared/ui/Button';
import { Modal } from '@shared/ui/Modal';
import { useApprovals } from '@modules/change-management/hooks/useApprovals';
import type { CRQApprover } from '@modules/change-management/types';
import { useAuth } from '@shared/auth/useAuth';

interface ApproverActionsProps {
  crqId: string;
  approvers: CRQApprover[];
  onUpdate: () => void;
}

export function ApproverActions({ crqId, approvers, onUpdate }: ApproverActionsProps) {
  const { profile } = useAuth();
  const { approve, reject, sendBack } = useApprovals(crqId, onUpdate);
  const [modal, setModal] = useState<'approve' | 'reject' | 'send_back' | null>(null);
  const [comments, setComments] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const myRow = approvers.find((a) => a.approver_id === profile?.id && a.status === 'pending');
  if (!myRow) return null;

  async function handleConfirmModal() {
    if (!comments.trim()) return;
    setLoading(true);
    setError(null);
    try {
      if (modal === 'approve') await approve(myRow!.id, comments);
      else if (modal === 'reject') await reject(myRow!.id, comments);
      else await sendBack(myRow!.id, comments);
      setModal(null);
      setComments('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2 items-center">
        <Button onClick={() => setModal('approve')} disabled={loading}>
          <CheckCircle size={14} /> Approve
        </Button>
        <Button variant="secondary" onClick={() => setModal('send_back')} disabled={loading}>
          <RotateCcw size={14} /> Send Back
        </Button>
        <Button variant="danger" onClick={() => setModal('reject')} disabled={loading}>
          <XCircle size={14} /> Reject
        </Button>
      </div>

      {modal && (
        <Modal
          title={
            modal === 'approve' ? 'Approve CRQ' :
            modal === 'reject' ? 'Reject CRQ' : 'Send Back for Changes'
          }
          onClose={() => { setModal(null); setComments(''); setError(null); }}
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              {modal === 'approve'
                ? 'Please add your approval comments.'
                : modal === 'reject'
                ? 'Please provide a reason for rejection.'
                : 'Please describe what changes are needed.'}
            </p>
            <textarea
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              rows={4}
              placeholder="Comments (required)…"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              autoFocus
            />
            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => { setModal(null); setComments(''); setError(null); }}>
                Cancel
              </Button>
              <Button
                variant={modal === 'reject' ? 'danger' : 'primary'}
                onClick={handleConfirmModal}
                disabled={!comments.trim() || loading}
              >
                {modal === 'approve' ? 'Approve' : modal === 'reject' ? 'Reject' : 'Send Back'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

