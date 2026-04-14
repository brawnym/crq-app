import { Clock } from 'lucide-react';
import type { AuditEntry } from '@modules/change-management/types';

const ACTION_LABELS: Record<string, string> = {
  created:            'Created CRQ',
  edited:             'Edited CRQ',
  submitted:          'Submitted for approval',
  approved:           'Approved',
  rejected:           'Rejected',
  sent_back:          'Sent back for changes',
  resubmitted:        'Resubmitted for approval',
  followed_up:        'Sent follow-up',
  completed:          'Marked as complete',
  archived:           'Archived',
  in_implementation:  'Moved to implementation',
  sla_reminder_sent:  'SLA reminder sent',
  sla_breached_notified: 'SLA breach notification sent',
};

interface AuditTrailProps {
  entries: AuditEntry[];
}

export function AuditTrail({ entries }: AuditTrailProps) {
  if (entries.length === 0) {
    return <p className="text-sm text-gray-400">No audit history yet.</p>;
  }

  return (
    <ol className="relative border-l border-gray-200 space-y-6 ml-3">
      {entries.map((entry) => (
        <li key={entry.id} className="ml-6">
          <span className="absolute -left-3 flex items-center justify-center w-6 h-6 rounded-full bg-blue-50 ring-4 ring-white">
            <Clock size={12} className="text-blue-500" />
          </span>
          <div className="p-3 bg-white border border-gray-100 rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-gray-900">
                {ACTION_LABELS[entry.action] ?? entry.action}
              </span>
              <time className="text-xs text-gray-400">
                {new Date(entry.created_at).toLocaleString()}
              </time>
            </div>
            <p className="text-xs text-gray-500">
              by <strong>{entry.actor?.full_name ?? 'System'}</strong>
            </p>
            {entry.note && (
              <p className="mt-1 text-xs text-gray-600 bg-gray-50 rounded p-2">{entry.note}</p>
            )}
            {entry.previous_value && entry.new_value && (
              <details className="mt-1">
                <summary className="text-xs text-blue-500 cursor-pointer">View changes</summary>
                <div className="text-xs mt-1 space-y-1">
                  {Object.keys(entry.new_value).map((key) => (
                    <div key={key} className="flex gap-2">
                      <span className="font-medium w-24 shrink-0">{key}:</span>
                      <span className="text-red-500 line-through">{String(entry.previous_value![key] ?? '')}</span>
                      <span className="text-green-600">{String(entry.new_value![key] ?? '')}</span>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
