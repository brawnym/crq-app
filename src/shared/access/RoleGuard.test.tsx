import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RoleGuard } from './RoleGuard';

vi.mock('@shared/auth/useAuth', () => ({
  useAuth: vi.fn().mockReturnValue({
    profile: { role: 'requester' },
  }),
}));

describe('RoleGuard', () => {
  it('renders children when role matches', () => {
    render(
      <RoleGuard allow={['requester']}>
        <div>Secret Content</div>
      </RoleGuard>
    );
    expect(screen.getByText('Secret Content')).toBeInTheDocument();
  });

  it('renders nothing when role does not match', () => {
    render(
      <RoleGuard allow={['admin']}>
        <div>Admin Only</div>
      </RoleGuard>
    );
    expect(screen.queryByText('Admin Only')).not.toBeInTheDocument();
  });
});
