import { Link } from 'react-router-dom';
import { useAuth } from '@shared/auth/useAuth';
import { useCRQList } from '@modules/change-management/hooks/useCRQ';
import { StatusBadge } from '@shared/ui/StatusBadge';
import { canCreateCRQ, canApprove } from '@shared/access/roles';
import type { CRQ } from '@modules/change-management/types';

// ── SLA Countdown Badge ──────────────────────────────────────────────────────

function SlaBadge({ deadline }: { deadline: string }) {
  const now = new Date();
  const end = new Date(deadline);
  const diffMs = end.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = Math.floor(diffHours / 24);
  const remainingHours = Math.floor(diffHours % 24);

  if (diffMs < 0) {
    const overdueDays = Math.ceil(Math.abs(diffHours) / 24);
    return (
      <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
        SLA: {overdueDays} day{overdueDays !== 1 ? 's' : ''} overdue
      </span>
    );
  }

  if (diffHours <= 72) {
    return (
      <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700">
        SLA: {diffDays}d {remainingHours}h
      </span>
    );
  }

  return (
    <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
      SLA: {diffDays}d
    </span>
  );
}

// ── CRQ Card ─────────────────────────────────────────────────────────────────

function CRQCard({ crq }: { crq: CRQ }) {
  return (
    <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono text-gray-500">{crq.crq_number}</span>
          <StatusBadge status={crq.status} />
          {crq.sla_deadline && <SlaBadge deadline={crq.sla_deadline} />}
        </div>
        <span className="font-medium text-gray-900">{crq.title}</span>
        {crq.project && (
          <span className="text-sm text-gray-500">{crq.project.name}</span>
        )}
      </div>
      <Link
        to={`/crqs/${crq.id}`}
        className="ml-4 text-sm text-blue-600 hover:text-blue-800 font-medium shrink-0"
      >
        View
      </Link>
    </div>
  );
}

// ── Section ───────────────────────────────────────────────────────────────────

function Section({ title, crqs }: { title: string; crqs: CRQ[] }) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-gray-700 mb-3">{title}</h2>
      {crqs.length === 0 ? (
        <p className="text-sm italic text-gray-400">None</p>
      ) : (
        <div className="flex flex-col gap-3">
          {crqs.map((crq) => (
            <CRQCard key={crq.id} crq={crq} />
          ))}
        </div>
      )}
    </section>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user, profile } = useAuth();
  const role = profile?.role;
  const userId = user?.id ?? '';

  const isRequester = role === 'requester' || role === 'admin';
  const isApprover = role === 'approver' || role === 'admin';

  // Fetch all CRQs the user can see (RLS-filtered). We call useCRQList once per
  // logical query set. For the approver section we pass approver_id so the
  // server-side filter gives us CRQs where user is listed as an approver.
  const { crqs: allCRQs, loading, error } = useCRQList(
    isApprover && !isRequester
      ? { approver_id: userId }
      : {}
  );

  // For admin we need both requester view and approver view so we do a second
  // fetch scoped to the approver filter.
  const { crqs: approverCRQs } = useCRQList(
    role === 'admin' ? { approver_id: userId } : {}
  );

  if (loading) {
    return (
      <div data-testid="dashboard" className="p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h1>
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div data-testid="dashboard" className="p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h1>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  // ── Derive sections ────────────────────────────────────────────────────────

  // For admins, requester sections use allCRQs; approver sections use approverCRQs.
  // For plain requesters, use allCRQs.
  // For plain approvers, allCRQs was fetched with approver_id so it contains the right set.

  const requesterSource = allCRQs;
  const approverSource = role === 'admin' ? approverCRQs : allCRQs;

  const myDrafts = isRequester
    ? requesterSource.filter(
        (c) => c.status === 'draft' && c.requester_id === userId
      )
    : [];

  const myPending = isRequester
    ? requesterSource.filter(
        (c) => c.status === 'pending_approval' && c.requester_id === userId
      )
    : [];

  const awaitingAction = isApprover
    ? approverSource.filter(
        (c) =>
          c.status === 'pending_approval' &&
          c.approvers?.some(
            (a) => a.approver_id === userId && a.status === 'pending'
          )
      )
    : [];

  const inImplementation = (() => {
    if (role === 'admin') {
      return allCRQs.filter((c) => c.status === 'in_implementation');
    }
    if (role === 'approver') {
      return allCRQs.filter(
        (c) =>
          c.status === 'in_implementation' &&
          c.approvers?.some((a) => a.approver_id === userId)
      );
    }
    // requester
    return allCRQs.filter(
      (c) => c.status === 'in_implementation' && c.requester_id === userId
    );
  })();

  return (
    <div data-testid="dashboard" className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-8">Dashboard</h1>

      {isRequester && <Section title="My Drafts" crqs={myDrafts} />}
      {isRequester && <Section title="Pending Approval" crqs={myPending} />}
      {isApprover && <Section title="Awaiting My Action" crqs={awaitingAction} />}
      <Section title="In Implementation" crqs={inImplementation} />
    </div>
  );
}
