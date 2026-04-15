import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Pencil, Archive, Printer, Send } from 'lucide-react';
import { useCRQDetail, useCRQActions } from '@modules/change-management/hooks/useCRQ';
import { useAuditTrail } from '@modules/change-management/hooks/useAuditTrail';
import { StatusBadge } from '@shared/ui/StatusBadge';
import { Button } from '@shared/ui/Button';
import { Modal } from '@shared/ui/Modal';
import { RoleGuard } from '@shared/access/RoleGuard';
import { ApproverActions } from '@modules/change-management/components/ApproverActions';
import { FollowUpForm } from '@modules/change-management/components/FollowUpForm';
import { AuditTrail } from '@modules/change-management/components/AuditTrail';
import { CRQPrintView } from '@modules/change-management/components/CRQPrintView';
import { appendAudit } from '@modules/change-management/services/auditService';
import { useAuth } from '@shared/auth/useAuth';

export default function CRQDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const { crq, loading, reload } = useCRQDetail(id!);
  const { entries } = useAuditTrail(id!);
  const { updateCRQStatus, archiveCRQ } = useCRQActions();
  const navigate = useNavigate();
  const [printMode, setPrintMode] = useState(false);
  const [completeModal, setCompleteModal] = useState(false);
  const [completeComment, setCompleteComment] = useState('');
  const [completeLoading, setCompleteLoading] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);

  if (loading) return <div className="p-8 text-center text-gray-400">Loading…</div>;
  if (!crq) return <div className="p-8 text-center text-red-500">CRQ not found.</div>;

  const isOwner = crq.requester_id === profile?.id || profile?.role === 'admin';
  const canEdit = crq.status === 'draft' && isOwner;
  const canSubmit = crq.status === 'draft' && isOwner && (crq.approvers?.length ?? 0) > 0;
  const canComplete = crq.status === 'in_implementation' && isOwner;
  const canArchive = ['completed', 'rejected', 'draft'].includes(crq.status);
  const showPDF = ['in_implementation', 'completed', 'archived'].includes(crq.status);

  async function handleSubmit() {
    await updateCRQStatus(id!, 'pending_approval');
    await appendAudit({ crq_id: id!, actor_id: profile!.id, action: 'submitted', new_value: { status: 'pending_approval' } });
    reload();
  }

  async function handleComplete() {
    if (!completeComment.trim()) return;
    setCompleteLoading(true);
    setCompleteError(null);
    try {
      await updateCRQStatus(id!, 'completed');
      await appendAudit({ crq_id: id!, actor_id: profile!.id, action: 'completed', note: completeComment.trim() });
      setCompleteModal(false);
      setCompleteComment('');
      reload();
    } catch (e) {
      setCompleteError(e instanceof Error ? e.message : 'Failed to complete CRQ. Please try again.');
    } finally {
      setCompleteLoading(false);
    }
  }

  async function handleArchive() {
    await archiveCRQ(id!);
    await appendAudit({ crq_id: id!, actor_id: profile!.id, action: 'archived' });
    reload();
  }

  if (printMode) {
    return <CRQPrintView crq={crq} auditEntries={entries} onClose={() => setPrintMode(false)} />;
  }

  const completeModalEl = completeModal && (
    <Modal title="Mark CRQ Complete" onClose={() => { setCompleteModal(false); setCompleteComment(''); setCompleteError(null); }}>
      <div className="space-y-4">
        <p className="text-sm text-gray-600">Please add completion notes before closing this CRQ.</p>
        <textarea
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          rows={4}
          placeholder="Completion notes (required)…"
          value={completeComment}
          onChange={(e) => setCompleteComment(e.target.value)}
          autoFocus
        />
        {completeError && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{completeError}</p>
        )}
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={() => { setCompleteModal(false); setCompleteComment(''); setCompleteError(null); }}>
            Cancel
          </Button>
          <Button onClick={handleComplete} disabled={!completeComment.trim() || completeLoading}>
            {completeLoading ? 'Completing…' : 'Mark Complete'}
          </Button>
        </div>
      </div>
    </Modal>
  );

  const dl = (label: string, value: string | undefined | null) => (
    <div>
      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-900">{value ?? '—'}</dd>
    </div>
  );

  return (
    <div className="space-y-6">
      {completeModalEl}
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-mono text-gray-400">{crq.crq_number}</p>
          <h1 className="text-xl font-bold text-gray-900 mt-1">{crq.title}</h1>
          <div className="flex items-center gap-2 mt-2">
            <StatusBadge status={crq.status} />
            <span className={`text-xs px-2 py-0.5 rounded font-medium ${
              crq.priority === 'critical' ? 'bg-red-100 text-red-700' :
              crq.priority === 'high' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'
            }`}>{crq.priority}</span>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          {canEdit && (
            <Link to={`/crqs/${id}/edit`}>
              <Button variant="secondary" size="sm"><Pencil size={13} /> Edit</Button>
            </Link>
          )}
          {canSubmit && (
            <Button size="sm" onClick={handleSubmit}>
              <Send size={13} /> Submit for Approval
            </Button>
          )}
          {canComplete && (
            <Button size="sm" onClick={() => setCompleteModal(true)}>Mark Complete</Button>
          )}
          {canArchive && (
            <RoleGuard allow={['requester', 'admin']}>
              <Button variant="secondary" size="sm" onClick={handleArchive}>
                <Archive size={13} /> Archive
              </Button>
            </RoleGuard>
          )}
          {showPDF && (
            <Button variant="secondary" size="sm" onClick={() => setPrintMode(true)}>
              <Printer size={13} /> Export PDF
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left: Main details */}
        <div className="col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Description</h2>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{crq.description}</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Request Information</h2>
            <dl className="grid grid-cols-2 gap-4">
              {dl('Project', crq.project?.name)}
              {dl('Requested By', crq.requested_by)}
              {dl('Requested Date', crq.requested_date)}
              {dl('Authorized By', crq.authorized_by)}
              {dl('Changes Effective From', crq.changes_effective_from)}
              {dl('SLA Deadline', crq.sla_deadline ? new Date(crq.sla_deadline).toLocaleString() : undefined)}
            </dl>
          </div>

          <RoleGuard allow={['approver', 'admin']}>
            {crq.status === 'pending_approval' && crq.approvers && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-sm font-semibold text-gray-700 mb-4">Your Action</h2>
                <ApproverActions crqId={id!} approvers={crq.approvers} onUpdate={reload} />
              </div>
            )}
          </RoleGuard>

          <RoleGuard allow={['requester', 'admin']}>
            {crq.status === 'pending_approval' && crq.approvers && (
              <FollowUpForm crqId={id!} approvers={crq.approvers} onSent={reload} />
            )}
          </RoleGuard>
        </div>

        {/* Right: Sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Approvers</h2>
            {crq.approvers?.length ? (
              <ul className="space-y-3">
                {crq.approvers.map((a) => (
                  <li key={a.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-800">{a.approver?.full_name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      a.status === 'approved' ? 'bg-green-100 text-green-700' :
                      a.status === 'rejected' ? 'bg-red-100 text-red-700' :
                      a.status === 'sent_back' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-500'
                    }`}>{a.status}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-gray-400">No approvers assigned.</p>}

            {crq.approvers?.some((a) => a.comments) && (
              <div className="mt-4 space-y-2">
                <h3 className="text-xs font-medium text-gray-500 uppercase">Comments</h3>
                {crq.approvers.filter((a) => a.comments).map((a) => (
                  <div key={a.id} className="bg-yellow-50 rounded p-2 text-xs text-gray-700">
                    <strong>{a.approver?.full_name}:</strong> {a.comments}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Audit Trail</h2>
            <AuditTrail entries={entries} />
          </div>
        </div>
      </div>
    </div>
  );
}
