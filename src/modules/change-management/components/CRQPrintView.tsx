import type { CRQ, AuditEntry } from '@modules/change-management/types';

interface CRQPrintViewProps {
  crq: CRQ;
  auditEntries: AuditEntry[];
  onClose: () => void;
}

export function CRQPrintView({ onClose }: CRQPrintViewProps) {
  return (
    <div className="p-8">
      <button onClick={onClose}>← Back</button>
      <p>Print view coming soon.</p>
    </div>
  );
}
