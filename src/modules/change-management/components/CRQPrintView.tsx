import { useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@shared/ui/Button';
import type { CRQ, AuditEntry } from '@modules/change-management/types';

const KEY_ACTIONS = ['created','submitted','approved','in_implementation','completed'];

interface CRQPrintViewProps {
  crq: CRQ;
  auditEntries: AuditEntry[];
  onClose: () => void;
}

export function CRQPrintView({ crq, auditEntries, onClose }: CRQPrintViewProps) {
  useEffect(() => {
    document.title = `${crq.crq_number} - CRQ Export`;
    return () => { document.title = 'CRQ Manager'; };
  }, [crq.crq_number]);

  const milestones = auditEntries.filter((e) => KEY_ACTIONS.includes(e.action));
  const generatedDate = new Date().toLocaleString();

  return (
    <div>
      {/* Screen-only close button */}
      <div className="no-print fixed top-4 right-4 z-50 flex gap-2">
        <Button onClick={() => window.print()}>Print / Save PDF</Button>
        <Button variant="secondary" onClick={onClose}><X size={14} /> Close</Button>
      </div>

      <div className="print-area max-w-3xl mx-auto p-10 font-sans text-sm text-gray-900">
        {/* 1. Header */}
        <div className="flex items-start justify-between border-b-2 border-gray-900 pb-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Change Request</h1>
            <p className="text-gray-500 text-xs mt-1">Generated: {generatedDate}</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-mono font-bold">{crq.crq_number}</p>
          </div>
        </div>

        {/* 2. Project */}
        <section className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Project</h2>
          <p className="font-semibold">{crq.project?.name ?? '—'}</p>
        </section>

        {/* 3. CRQ Details */}
        <section className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Change Request Details</h2>
          <table className="w-full border-collapse text-sm">
            <tbody>
              {[
                ['Title', crq.title],
                ['Status', crq.status.replace(/_/g, ' ')],
                ['Priority', crq.priority],
                ['Description', crq.description],
              ].map(([label, value]) => (
                <tr key={label} className="border-t border-gray-200">
                  <td className="py-2 pr-4 font-medium text-gray-600 w-40 align-top">{label}</td>
                  <td className="py-2 text-gray-900 whitespace-pre-wrap">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* 4. Requestor Info */}
        <section className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Requestor Information</h2>
          <table className="w-full border-collapse text-sm">
            <tbody>
              {[
                ['Requested By', crq.requested_by],
                ['Requested Date', crq.requested_date],
                ['Authorized By', crq.authorized_by],
                ['Changes Effective From', crq.changes_effective_from],
              ].map(([label, value]) => (
                <tr key={label} className="border-t border-gray-200">
                  <td className="py-2 pr-4 font-medium text-gray-600 w-40">{label}</td>
                  <td className="py-2 text-gray-900">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* 5. Approvers */}
        <section className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Approvers</h2>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="py-2 px-3 text-left font-medium">Name</th>
                <th className="py-2 px-3 text-left font-medium">Decision</th>
                <th className="py-2 px-3 text-left font-medium">Date</th>
                <th className="py-2 px-3 text-left font-medium">Comments</th>
              </tr>
            </thead>
            <tbody>
              {(crq.approvers ?? []).map((a) => (
                <tr key={a.id} className="border-t border-gray-200">
                  <td className="py-2 px-3">{a.approver?.full_name ?? '—'}</td>
                  <td className="py-2 px-3 capitalize">{a.status}</td>
                  <td className="py-2 px-3">{a.actioned_at ? new Date(a.actioned_at).toLocaleDateString() : '—'}</td>
                  <td className="py-2 px-3 text-gray-600">{a.comments ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* 6. Audit Summary */}
        <section className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Key Milestones</h2>
          <table className="w-full border-collapse text-sm">
            <tbody>
              {milestones.map((e) => (
                <tr key={e.id} className="border-t border-gray-200">
                  <td className="py-2 pr-4 font-medium text-gray-600 w-40 capitalize">{e.action.replace(/_/g, ' ')}</td>
                  <td className="py-2 text-gray-500">{new Date(e.created_at).toLocaleString()}</td>
                  <td className="py-2 text-gray-700">{e.actor?.full_name ?? 'System'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* 7. Footer */}
        <footer className="border-t border-gray-300 pt-4 mt-8 text-xs text-gray-400 text-center">
          This document was generated from CRQ Manager on {generatedDate}.
          Document reference: {crq.crq_number}
        </footer>
      </div>
    </div>
  );
}
