import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listCRQs, updateCRQStatus } from './crqService';
import type { CRQFilters } from '@modules/change-management/types';

const mockFrom = vi.hoisted(() => vi.fn());
vi.mock('@shared/auth/supabaseClient', () => ({ supabase: { from: mockFrom } }));

beforeEach(() => vi.clearAllMocks());

describe('crqService', () => {
  it('listCRQs excludes archived by default', async () => {
    const neqMock = vi.fn().mockReturnThis();
    const orderMock = vi.fn().mockResolvedValue({ data: [], error: null });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      neq: neqMock,
      order: orderMock,
    });
    await listCRQs({} as CRQFilters);
    expect(neqMock).toHaveBeenCalledWith('status', 'archived');
  });

  it('listCRQs includes archived when flag is set', async () => {
    const neqMock = vi.fn().mockReturnThis();
    const orderMock = vi.fn().mockResolvedValue({ data: [], error: null });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      neq: neqMock,
      order: orderMock,
    });
    await listCRQs({ include_archived: true } as CRQFilters);
    expect(neqMock).not.toHaveBeenCalled();
  });

  it('updateCRQStatus updates status and last_updated_at', async () => {
    const updateMock = vi.fn().mockReturnThis();
    const eqMock = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ update: updateMock, eq: eqMock });
    await updateCRQStatus('crq-1', 'completed');
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'completed' })
    );
  });
});
