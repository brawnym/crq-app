import type { User, Project } from '@shared/types';

export type CRQStatus =
  | 'draft'
  | 'pending_approval'
  | 'in_implementation'
  | 'completed'
  | 'rejected'
  | 'archived';

export type CRQPriority = 'low' | 'medium' | 'high' | 'critical';

export type ApproverStatus = 'pending' | 'approved' | 'rejected' | 'sent_back';

export interface CRQ {
  id: string;
  crq_number: string;
  title: string;
  description: string;
  status: CRQStatus;
  priority: CRQPriority;
  project_id: string | null;
  requester_id: string;
  requested_by: string;
  requested_date: string;
  authorized_by: string;
  changes_effective_from: string;
  due_date: string | null;
  sla_deadline: string | null;
  last_updated_at: string;
  archived_at: string | null;
  created_at: string;
  // Joined
  project?: Project;
  requester?: User;
  approvers?: CRQApprover[];
}

export interface CRQApprover {
  id: string;
  crq_id: string;
  approver_id: string;
  status: ApproverStatus;
  comments: string | null;
  actioned_at: string | null;
  approver?: User;
}

export interface AuditEntry {
  id: string;
  crq_id: string;
  actor_id: string;
  action: string;
  previous_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  note: string | null;
  created_at: string;
  actor?: User;
}

export interface FollowUp {
  id: string;
  crq_id: string;
  sender_id: string;
  recipient_id: string;
  message: string;
  created_at: string;
  sender?: User;
  recipient?: User;
}

export interface CRQFilters {
  status?: CRQStatus[];
  project_id?: string;
  priority?: CRQPriority;
  approver_id?: string;
  date_from?: string;
  date_to?: string;
  include_archived?: boolean;
  search?: string;
}
