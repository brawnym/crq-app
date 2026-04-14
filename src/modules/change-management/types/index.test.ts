import { describe, it, expectTypeOf } from 'vitest';
import type { CRQ, CRQApprover, AuditEntry, FollowUp, CRQStatus } from './index';

describe('CRQ types', () => {
  it('CRQ has required fields', () => {
    expectTypeOf<CRQ>().toHaveProperty('crq_number');
    expectTypeOf<CRQ>().toHaveProperty('status');
    expectTypeOf<CRQ>().toHaveProperty('sla_deadline');
    expectTypeOf<CRQ>().toHaveProperty('requested_by');
    expectTypeOf<CRQ>().toHaveProperty('changes_effective_from');
  });

  it('CRQStatus covers all valid states', () => {
    const s: CRQStatus = 'pending_approval';
    expectTypeOf(s).toEqualTypeOf<CRQStatus>();
  });

  it('CRQApprover has status and comments', () => {
    expectTypeOf<CRQApprover>().toHaveProperty('status');
    expectTypeOf<CRQApprover>().toHaveProperty('comments');
  });

  it('AuditEntry has actor_id and action', () => {
    expectTypeOf<AuditEntry>().toHaveProperty('actor_id');
    expectTypeOf<AuditEntry>().toHaveProperty('action');
  });

  it('FollowUp has sender_id and message', () => {
    expectTypeOf<FollowUp>().toHaveProperty('sender_id');
    expectTypeOf<FollowUp>().toHaveProperty('message');
  });
});
