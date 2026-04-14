import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, Search, Archive } from 'lucide-react';
import { useCRQList } from '@modules/change-management/hooks/useCRQ';
import { StatusBadge } from '@shared/ui/StatusBadge';
import { Button } from '@shared/ui/Button';
import { RoleGuard } from '@shared/access/RoleGuard';
import type { CRQFilters, CRQStatus } from '@modules/change-management/types';

const ALL_STATUSES: CRQStatus[] = ['draft','pending_approval','in_implementation','completed','rejected'];

export default function CRQListPage() {
  const [filters, setFilters] = useState<CRQFilters>({ include_archived: false });
  const [search, setSearch] = useState('');
  const { crqs, loading } = useCRQList({ ...filters, search: search || undefined });

  function setStatus(status: CRQStatus, checked: boolean) {
    setFilters((f) => ({
      ...f,
      status: checked
        ? [...(f.status ?? []), status]
        : (f.status ?? []).filter((s) => s !== status),
    }));
  }

  return (
    <div data-testid="crq-list">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Change Requests</h1>
        <RoleGuard allow={['requester', 'admin']}>
          <Link to="/crqs/new">
            <Button><PlusCircle size={15} /> New CRQ</Button>
          </Link>
        </RoleGuard>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-4 flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-48">
          <label className="block text-xs font-medium text-gray-500 mb-1">Search</label>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
            <input
              className="pl-8 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              placeholder="CRQ number or title…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
          <div className="flex flex-wrap gap-2">
            {ALL_STATUSES.map((s) => (
              <label key={s} className="flex items-center gap-1 text-xs cursor-pointer">
                <input type="checkbox" checked={filters.status?.includes(s) ?? false}
                  onChange={(e) => setStatus(s, e.target.checked)} />
                {s.replace(/_/g, ' ')}
              </label>
            ))}
          </div>
        </div>
        <label className="flex items-center gap-1.5 text-sm cursor-pointer">
          <input type="checkbox" checked={!!filters.include_archived}
            onChange={(e) => setFilters((f) => ({ ...f, include_archived: e.target.checked }))} />
          <Archive size={13} /> Include archived
        </label>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading…</div>
        ) : crqs.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No change requests found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['CRQ #', 'Title', 'Project', 'Priority', 'Status', 'SLA Deadline', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {crqs.map((crq) => {
                const overdue = crq.sla_deadline && new Date(crq.sla_deadline) < new Date()
                  && ['pending_approval', 'in_implementation'].includes(crq.status);
                return (
                  <tr key={crq.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{crq.crq_number}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{crq.title}</td>
                    <td className="px-4 py-3 text-gray-500">{crq.project?.name ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                        crq.priority === 'critical' ? 'bg-red-100 text-red-700' :
                        crq.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>{crq.priority}</span>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={crq.status} /></td>
                    <td className={`px-4 py-3 text-xs ${overdue ? 'text-red-600 font-medium' : 'text-gray-400'}`}>
                      {crq.sla_deadline
                        ? new Date(crq.sla_deadline).toLocaleDateString()
                        : '—'}
                      {overdue && ' ⚠ OVERDUE'}
                    </td>
                    <td className="px-4 py-3">
                      <Link to={`/crqs/${crq.id}`} className="text-blue-600 hover:underline text-xs">
                        View →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
