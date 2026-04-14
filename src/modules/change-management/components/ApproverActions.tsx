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
  const [modal, setModal] = useState<'reject' | 'send_back' | null>(null);
  const [comments, setComments] = useState('');
  const [loading, setLoading] = useState(false);

  const myRow = approvers.find((a) => a.approver_id === profile?.id && a.status === 'pending');
  if (!myRow) return null;

  async function handleApprove() {
    setLoading(true);
    try { await approve(myRow!.id); } finally { setLoading(false); }
  }

  async function handleConfirmModal() {
    if (!comments.trim()) return;
    setLoading(true);
    try {
      if (modal === 'reject') await reject(myRow!.id, comments);
      else await sendBack(myRow!.id, comments);
      setModal(null);
      setComments('');
    } finally { setLoading(false); }
  }

  return (
    <div className="flex gap-2 items-center">
      <Button onClick={handleApprove} disabled={loading}>
        <CheckCircle size={14} /> Approve
      </Button>
      <Button variant="secondary" onClick={() => setModal('send_back')} disabled={loading}>
        <RotateCcw size={14} /> Send Back
      </Button>
      <Button variant="danger" onClick={() => setModal('reject')} disabled={loading}>
        <XCircle size={14} /> Reject
      </Button>

      {modal && (
        <Modal
          title={modal === 'reject' ? 'Reject CRQ' : 'Send Back for Changes'}
          onClose={() => { setModal(null); setComments(''); }}
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              {modal === 'reject'
                ? 'Please provide a reason for rejection.'
                : 'Please describe what changes are needed.'}
            </p>
            <textarea
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              rows={4}
              placeholder="Comments (required)…"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => { setModal(null); setComments(''); }}>
                Cancel
              </Button>
              <Button
                variant={modal === 'reject' ? 'danger' : 'primary'}
                onClick={handleConfirmModal}
                disabled={!comments.trim() || loading}
              >
                {modal === 'reject' ? 'Reject' : 'Send Back'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
