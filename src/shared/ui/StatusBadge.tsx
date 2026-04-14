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
  draft:             'bg-gray-100 text-gray-600',
  pending_approval:  'bg-yellow-100 text-yellow-700',
  in_implementation: 'bg-blue-100 text-blue-700',
  completed:         'bg-green-100 text-green-700',
  rejected:          'bg-red-100 text-red-700',
  archived:          'bg-gray-200 text-gray-500',
};

export function StatusBadge({ status }: { status: CRQStatus }) {
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status]}`}>
      {labels[status]}
    </span>
  );
}
