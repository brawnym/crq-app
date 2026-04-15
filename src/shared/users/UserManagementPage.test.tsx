import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// Hoisted mocks
const mockUseUsers = vi.hoisted(() => vi.fn());

vi.mock('@shared/users/useUsers', () => ({
  useUsers: mockUseUsers,
}));

import UserManagementPage from './UserManagementPage';

const makeUser = (overrides: Partial<{
  id: string;
  full_name: string;
  email: string;
  role: 'requester' | 'approver' | 'admin';
  is_active: boolean;
  created_at: string;
}> = {}) => ({
  id: 'user-1',
  full_name: 'Alice Smith',
  email: 'alice@example.com',
  role: 'requester' as const,
  is_active: true,
  created_at: '',
  ...overrides,
});

const makeHook = (overrides: Partial<{
  users: ReturnType<typeof makeUser>[];
  loading: boolean;
  error: string | null;
  invite: ReturnType<typeof vi.fn>;
  changeRole: ReturnType<typeof vi.fn>;
  deactivate: ReturnType<typeof vi.fn>;
  reactivate: ReturnType<typeof vi.fn>;
  reload: ReturnType<typeof vi.fn>;
}> = {}) => ({
  users: [],
  loading: false,
  error: null,
  invite: vi.fn().mockResolvedValue({ tempPassword: 'Tmp1abc123' }),
  changeRole: vi.fn().mockResolvedValue(undefined),
  deactivate: vi.fn().mockResolvedValue(undefined),
  reactivate: vi.fn().mockResolvedValue(undefined),
  reload: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

describe('UserManagementPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page heading "User Management"', () => {
    mockUseUsers.mockReturnValue(makeHook());
    render(<UserManagementPage />);
    expect(screen.getByRole('heading', { name: /user management/i })).toBeInTheDocument();
  });

  it('renders user table with full_name, email, role, status', () => {
    const users = [
      makeUser({ id: 'u1', full_name: 'Alice Smith', email: 'alice@example.com', role: 'requester', is_active: true }),
      makeUser({ id: 'u2', full_name: 'Bob Jones', email: 'bob@example.com', role: 'approver', is_active: false }),
    ];
    mockUseUsers.mockReturnValue(makeHook({ users }));
    render(<UserManagementPage />);

    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
    expect(screen.getByText('Bob Jones')).toBeInTheDocument();
    expect(screen.getByText('bob@example.com')).toBeInTheDocument();
    // Active/Inactive status
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    mockUseUsers.mockReturnValue(makeHook({ loading: true }));
    render(<UserManagementPage />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('shows error state', () => {
    mockUseUsers.mockReturnValue(makeHook({ error: 'Failed to load users' }));
    render(<UserManagementPage />);
    expect(screen.getByText(/failed to load users/i)).toBeInTheDocument();
  });

  it('opens invite modal when "Invite User" button clicked', () => {
    mockUseUsers.mockReturnValue(makeHook());
    render(<UserManagementPage />);

    const inviteBtn = screen.getByRole('button', { name: /invite user/i });
    fireEvent.click(inviteBtn);

    // Modal should be open - check for the modal title heading and form fields
    expect(screen.getAllByText('Invite User').length).toBeGreaterThan(0);
    // Modal fields
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
  });

  it('submits invite form with correct data', async () => {
    const invite = vi.fn().mockResolvedValue({ tempPassword: 'Tmp1abc123' });
    mockUseUsers.mockReturnValue(makeHook({ invite }));
    render(<UserManagementPage />);

    fireEvent.click(screen.getByRole('button', { name: /invite user/i }));

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'new@example.com' } });
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'New User' } });
    // Role select - pick approver
    const roleSelects = screen.getAllByRole('combobox');
    // The modal role select (last one opened, or find by context)
    const modalRoleSelect = roleSelects.find(s => s.closest('[role="dialog"], .fixed'));
    if (modalRoleSelect) {
      fireEvent.change(modalRoleSelect, { target: { value: 'approver' } });
    } else {
      fireEvent.change(roleSelects[roleSelects.length - 1], { target: { value: 'approver' } });
    }

    fireEvent.click(screen.getByRole('button', { name: /send invite/i }));

    await waitFor(() => {
      expect(invite).toHaveBeenCalledWith('new@example.com', 'New User', 'approver');
    });
    // Modal should close after successful invite
    await waitFor(() => {
      expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument();
    });
  });

  it('calls changeRole when role select changes for a user', async () => {
    const changeRole = vi.fn().mockResolvedValue(undefined);
    const users = [makeUser({ id: 'u1', role: 'requester' })];
    mockUseUsers.mockReturnValue(makeHook({ users, changeRole }));
    render(<UserManagementPage />);

    const roleSelect = screen.getByDisplayValue('requester');
    fireEvent.change(roleSelect, { target: { value: 'approver' } });

    await waitFor(() => {
      expect(changeRole).toHaveBeenCalledWith('u1', 'approver');
    });
  });

  it('calls deactivate for active user', async () => {
    const deactivate = vi.fn().mockResolvedValue(undefined);
    const users = [makeUser({ id: 'u1', is_active: true })];
    mockUseUsers.mockReturnValue(makeHook({ users, deactivate }));
    render(<UserManagementPage />);

    const deactivateBtn = screen.getByRole('button', { name: /deactivate/i });
    fireEvent.click(deactivateBtn);

    await waitFor(() => {
      expect(deactivate).toHaveBeenCalledWith('u1');
    });
  });

  it('calls reactivate for inactive user', async () => {
    const reactivate = vi.fn().mockResolvedValue(undefined);
    const users = [makeUser({ id: 'u2', is_active: false })];
    mockUseUsers.mockReturnValue(makeHook({ users, reactivate }));
    render(<UserManagementPage />);

    const reactivateBtn = screen.getByRole('button', { name: /reactivate/i });
    fireEvent.click(reactivateBtn);

    await waitFor(() => {
      expect(reactivate).toHaveBeenCalledWith('u2');
    });
  });
});
