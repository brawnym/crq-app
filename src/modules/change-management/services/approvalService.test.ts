import { describe, it, expect, vi, beforeEach } from 'vitest';
import { actionApproval, checkAllApproved } from './approvalService';

const mockFrom = vi.hoisted(() => vi.fn());
vi.mock('@shared/auth/supabaseClient', () => ({ supabase: { from: mockFrom } }));

beforeEach(() => vi.clearAllMocks());

describe('approvalService', () => {
  it('actionApproval updates status and sets actioned_at', async () => {
    const updateMock = vi.fn().mockReturnThis();
    const eqMock = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ update: updateMock, eq: eqMock });

    await actionApproval('approver-row-id', 'approved', null);

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'approved', actioned_at: expect.any(String) })
    );
  });

  it('checkAllApproved returns true when all approvers approved', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [
          { status: 'approved' },
          { status: 'approved' },
        ],
        error: null,
      }),
    });
    const result = await checkAllApproved('crq-1');
    expect(result).toBe(true);
  });

  it('checkAllApproved returns false when any approver is pending', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [{ status: 'approved' }, { status: 'pending' }],
        error: null,
      }),
    });
    const result = await checkAllApproved('crq-1');
    expect(result).toBe(false);
  });
});
