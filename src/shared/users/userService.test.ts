import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listUsers, inviteUser } from './userService';

const mockFrom = vi.hoisted(() => vi.fn());
const mockInviteUserByEmail = vi.hoisted(() => vi.fn().mockResolvedValue({ data: {}, error: null }));

vi.mock('@shared/auth/supabaseClient', () => ({
  supabase: {
    from: mockFrom,
    auth: {
      admin: {
        inviteUserByEmail: mockInviteUserByEmail,
      },
    },
  },
}));

beforeEach(() => vi.clearAllMocks());

describe('userService', () => {
  it('listUsers returns array of users', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [{ id: '1', full_name: 'Alice', role: 'requester' }],
        error: null,
      }),
    });
    const users = await listUsers();
    expect(users).toHaveLength(1);
    expect(users[0].full_name).toBe('Alice');
  });

  it('inviteUser calls supabase admin invite', async () => {
    await inviteUser('bob@example.com', 'Bob Smith', 'approver');
    expect(mockInviteUserByEmail).toHaveBeenCalledWith(
      'bob@example.com',
      expect.objectContaining({ data: { full_name: 'Bob Smith', role: 'approver' } })
    );
  });
});
