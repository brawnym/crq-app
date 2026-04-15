import type { CRQStatus } from '@modules/change-management/types';

const labels: Record<CRQStatus, string> = {
  draft:             'Draft',
  pending_approval:  'Pending Approval',
  in_implementation: 'In Implementation',
  completed:         'Completed',
  rejected:          'Rejected',
  archived:          'Archived',
};

const colors: Record<CRQStatus, string> = {
  draft:             'bg-gray-100 text-gray-600 ring-1 ring-gray-200',
  pending_approval:  'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  in_implementation: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  completed:         'bg-green-50 text-green-700 ring-1 ring-green-200',
  rejected:          'bg-red-50 text-red-700 ring-1 ring-red-200',
  archived:          'bg-gray-50 text-gray-500 ring-1 ring-gray-200',
};

export function StatusBadge({ status }: { status: CRQStatus }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status]}`}>
      {labels[status]}
    </span>
  );
}
