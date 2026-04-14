export type UserRole = 'requester' | 'approver' | 'admin';

export interface User {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  owner_id: string | null;
  is_active: boolean;
  created_at: string;
  owner?: User;
}
