import { useState } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@shared/ui/Button';
import { createFollowUp } from '@modules/change-management/services/followUpService';
import { appendAudit } from '@modules/change-management/services/auditService';
import { useAuth } from '@shared/auth/useAuth';
import type { CRQApprover } from '@modules/change-management/types';

interface FollowUpFormProps {
  crqId: string;
  approvers: CRQApprover[];
  onSent: () => void;
}

export function FollowUpForm({ crqId, approvers, onSent }: FollowUpFormProps) {
  const { profile } = useAuth();
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const pendingApprovers = approvers.filter((a) => a.status === 'pending');

  async function handleSend() {
    if (!message.trim() || pendingApprovers.length === 0) return;
    setLoading(true);
    try {
      for (const a of pendingApprovers) {
        await createFollowUp({
          crq_id: crqId,
          sender_id: profile!.id,
          recipient_id: a.approver_id,
          message,
        });
      }
      await appendAudit({ crq_id: crqId, actor_id: profile!.id, action: 'followed_up', note: message });
      setMessage('');
      onSent();
    } finally {
      setLoading(false);
    }
  }

  if (pendingApprovers.length === 0) return null;

  return (
    <div className="border border-gray-200 rounded-lg p-4 space-y-3">
      <h3 className="text-sm font-medium text-gray-700">Follow up with approvers</h3>
      <textarea
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
        rows={2}
        placeholder="Add a message to nudge approvers…"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      <Button size="sm" onClick={handleSend} disabled={!message.trim() || loading}>
        <Send size={13} /> Send Follow-up
      </Button>
    </div>
  );
}
