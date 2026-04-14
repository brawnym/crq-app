import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Hoisted mocks
const mockUseAuth = vi.hoisted(() => vi.fn());
const mockUseCRQList = vi.hoisted(() => vi.fn());

vi.mock('@shared/auth/useAuth', () => ({
  useAuth: mockUseAuth,
}));

vi.mock('@modules/change-management/hooks/useCRQ', () => ({
  useCRQList: mockUseCRQList,
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
      <a href={to}>{children}</a>
    ),
  };
});

vi.mock('@shared/ui/StatusBadge', () => ({
  StatusBadge: ({ status }: { status: string }) => (
    <span data-testid="status-badge">{status}</span>
  ),
}));

import Dashboard from './Dashboard';

const makeUser = (role: 'requester' | 'approver' | 'admin') => ({
  user: { id: 'user-1' },
  profile: { id: 'user-1', full_name: 'Test User', email: 'test@example.com', role, is_active: true, created_at: '' },
  signIn: vi.fn(),
  signOut: vi.fn(),
});

const makeCRQ = (overrides: Partial<{
  id: string;
  crq_number: string;
  title: string;
  status: string;
  requester_id: string;
  sla_deadline: string | null;
  approvers: Array<{ approver_id: string; status: string }>;
  project: { id: string; name: string };
}> = {}) => ({
  id: 'crq-1',
  crq_number: 'CRQ-001',
  title: 'Test CRQ',
  description: '',
  status: 'draft',
  priority: 'medium',
  project_id: 'proj-1',
  requester_id: 'user-1',
  requested_by: 'Test User',
  requested_date: '',
  authorized_by: '',
  changes_effective_from: '',
  due_date: null,
  sla_deadline: null,
  last_updated_at: '',
  archived_at: null,
  created_at: '',
  project: { id: 'proj-1', name: 'Alpha Project', description: null, owner_id: null, is_active: true, created_at: '' },
  approvers: [],
  ...overrides,
});

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state while data loads', () => {
    mockUseAuth.mockReturnValue(makeUser('requester'));
    mockUseCRQList.mockReturnValue({ crqs: [], loading: true, error: null });
    render(<Dashboard />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('shows error state when data fails to load', () => {
    mockUseAuth.mockReturnValue(makeUser('requester'));
    mockUseCRQList.mockReturnValue({ crqs: [], loading: false, error: 'Failed to fetch' });
    render(<Dashboard />);
    expect(screen.getByText(/failed to fetch/i)).toBeInTheDocument();
  });

  it('shows page heading "Dashboard"', () => {
    mockUseAuth.mockReturnValue(makeUser('requester'));
    mockUseCRQList.mockReturnValue({ crqs: [], loading: false, error: null });
    render(<Dashboard />);
    expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument();
  });

  // Test 1: Shows "My Drafts" section with a CRQ card for requester role
  it('shows "My Drafts" section with a CRQ card for requester role', () => {
    mockUseAuth.mockReturnValue(makeUser('requester'));
    const draftCRQ = makeCRQ({ status: 'draft', requester_id: 'user-1' });
    mockUseCRQList.mockReturnValue({ crqs: [draftCRQ], loading: false, error: null });

    render(<Dashboard />);

    expect(screen.getByText('My Drafts')).toBeInTheDocument();
    expect(screen.getByText('CRQ-001')).toBeInTheDocument();
    expect(screen.getByText('Test CRQ')).toBeInTheDocument();
    expect(screen.getByText('Alpha Project')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view/i })).toHaveAttribute('href', '/crqs/crq-1');
  });

  it('shows "Pending Approval" section for requester role', () => {
    mockUseAuth.mockReturnValue(makeUser('requester'));
    const pendingCRQ = makeCRQ({ id: 'crq-2', crq_number: 'CRQ-002', status: 'pending_approval', requester_id: 'user-1' });
    mockUseCRQList.mockReturnValue({ crqs: [pendingCRQ], loading: false, error: null });

    render(<Dashboard />);

    expect(screen.getByText('Pending Approval')).toBeInTheDocument();
    expect(screen.getByText('CRQ-002')).toBeInTheDocument();
  });

  // Test 2: Shows "Awaiting My Action" section for approver role
  it('shows "Awaiting My Action" section for approver role', () => {
    mockUseAuth.mockReturnValue(makeUser('approver'));
    const pendingCRQ = makeCRQ({
      id: 'crq-3',
      crq_number: 'CRQ-003',
      title: 'Approver CRQ',
      status: 'pending_approval',
      requester_id: 'other-user',
      approvers: [{ approver_id: 'user-1', status: 'pending' }],
    });
    // For approver, useCRQList is called with approver_id filter
    mockUseCRQList.mockReturnValue({ crqs: [pendingCRQ], loading: false, error: null });

    render(<Dashboard />);

    expect(screen.getByText('Awaiting My Action')).toBeInTheDocument();
    expect(screen.getByText('CRQ-003')).toBeInTheDocument();
  });

  // Test 3: Shows SLA overdue badge (red) when sla_deadline is in the past
  it('shows SLA overdue badge (red) when sla_deadline is in the past', () => {
    mockUseAuth.mockReturnValue(makeUser('requester'));
    const pastDeadline = new Date();
    pastDeadline.setDate(pastDeadline.getDate() - 2);
    const overdueCRQ = makeCRQ({
      status: 'pending_approval',
      requester_id: 'user-1',
      sla_deadline: pastDeadline.toISOString(),
    });
    mockUseCRQList.mockReturnValue({ crqs: [overdueCRQ], loading: false, error: null });

    render(<Dashboard />);

    const badge = screen.getByText(/sla:.*overdue/i);
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('text-red-700');
  });

  it('shows orange SLA badge when <= 3 days remaining', () => {
    mockUseAuth.mockReturnValue(makeUser('requester'));
    const soonDeadline = new Date();
    soonDeadline.setHours(soonDeadline.getHours() + 36); // 1.5 days from now
    const soonCRQ = makeCRQ({
      status: 'pending_approval',
      requester_id: 'user-1',
      sla_deadline: soonDeadline.toISOString(),
    });
    mockUseCRQList.mockReturnValue({ crqs: [soonCRQ], loading: false, error: null });

    render(<Dashboard />);

    const badge = screen.getByText(/sla:/i);
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('text-orange-700');
  });

  it('shows gray SLA badge when > 3 days remaining', () => {
    mockUseAuth.mockReturnValue(makeUser('requester'));
    const farDeadline = new Date();
    farDeadline.setDate(farDeadline.getDate() + 10);
    const farCRQ = makeCRQ({
      status: 'pending_approval',
      requester_id: 'user-1',
      sla_deadline: farDeadline.toISOString(),
    });
    mockUseCRQList.mockReturnValue({ crqs: [farCRQ], loading: false, error: null });

    render(<Dashboard />);

    const badge = screen.getByText(/sla:/i);
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('text-gray-600');
  });

  // Test 4: Shows "None" when a section is empty
  it('shows "None" when a section is empty', () => {
    mockUseAuth.mockReturnValue(makeUser('requester'));
    mockUseCRQList.mockReturnValue({ crqs: [], loading: false, error: null });

    render(<Dashboard />);

    // Multiple "None" messages for empty sections
    const noneMessages = screen.getAllByText('None');
    expect(noneMessages.length).toBeGreaterThan(0);
  });

  it('shows "In Implementation" section for requester', () => {
    mockUseAuth.mockReturnValue(makeUser('requester'));
    const implCRQ = makeCRQ({
      id: 'crq-4',
      crq_number: 'CRQ-004',
      title: 'In Impl CRQ',
      status: 'in_implementation',
      requester_id: 'user-1',
    });
    mockUseCRQList.mockReturnValue({ crqs: [implCRQ], loading: false, error: null });

    render(<Dashboard />);

    expect(screen.getByText('In Implementation')).toBeInTheDocument();
    expect(screen.getByText('CRQ-004')).toBeInTheDocument();
  });

  it('shows both requester and approver sections for admin role', () => {
    mockUseAuth.mockReturnValue(makeUser('admin'));
    const draftCRQ = makeCRQ({ status: 'draft', requester_id: 'user-1' });
    const pendingCRQ = makeCRQ({
      id: 'crq-5',
      crq_number: 'CRQ-005',
      status: 'pending_approval',
      requester_id: 'other-user',
      approvers: [{ approver_id: 'user-1', status: 'pending' }],
    });
    mockUseCRQList.mockReturnValue({ crqs: [draftCRQ, pendingCRQ], loading: false, error: null });

    render(<Dashboard />);

    expect(screen.getByText('My Drafts')).toBeInTheDocument();
    expect(screen.getByText('Awaiting My Action')).toBeInTheDocument();
  });
});
