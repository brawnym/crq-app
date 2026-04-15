import { describe, it, expect, vi, beforeEach } from 'vitest';
import { actionApproval, checkAllApproved } from './approvalService';

const mockFrom = vi.hoisted(() => vi.fn());
const mockRpc  = vi.hoisted(() => vi.fn());
vi.mock('@shared/auth/supabaseClient', () => ({ supabase: { from: mockFrom, rpc: mockRpc } }));

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
    mockRpc.mockResolvedValue({ data: true, error: null });
    const result = await checkAllApproved('crq-1');
    expect(result).toBe(true);
    expect(mockRpc).toHaveBeenCalledWith('check_all_approved', { p_crq_id: 'crq-1' });
  });

  it('checkAllApproved returns false when any approver is pending', async () => {
    mockRpc.mockResolvedValue({ data: false, error: null });
    const result = await checkAllApproved('crq-1');
    expect(result).toBe(false);
  });
});
