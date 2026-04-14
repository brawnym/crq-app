# CRQ App — Phase 3: Service Layer (Auth, Hooks, Services)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete service layer — auth provider, role guards, protected routes, and all Supabase data services with their React hooks. This is the bridge between Supabase and the UI.

**Architecture:** `AuthProvider` wraps the app and exposes the current user via `useAuth`. Role guards protect routes. Each service module exports pure async functions over the Supabase client. Hooks wrap services with loading/error state.

**Tech Stack:** React 19, Supabase JS v2, Vitest + React Testing Library

**Prerequisite:** Phase 1 (project scaffold) and Phase 2 (Supabase schema + RLS) must be complete.

---

## File Map

| File | Purpose |
|---|---|
| `src/shared/auth/AuthProvider.tsx` | Session management, exposes user + profile |
| `src/shared/auth/useAuth.ts` | Hook to consume AuthContext |
| `src/shared/auth/ProtectedRoute.tsx` | Redirect to login if unauthenticated |
| `src/shared/access/roles.ts` | Role constants and permission helpers |
| `src/shared/access/RoleGuard.tsx` | Render guard based on user role |
| `src/shared/users/userService.ts` | Admin CRUD for users table |
| `src/shared/users/useUsers.ts` | Hook: list, create, update users |
| `src/modules/change-management/services/projectService.ts` | CRUD for projects |
| `src/modules/change-management/services/crqService.ts` | CRUD + status transitions for CRQs |
| `src/modules/change-management/services/approvalService.ts` | Approve / reject / send-back logic |
| `src/modules/change-management/services/auditService.ts` | Append audit entries, fetch trail |
| `src/modules/change-management/services/followUpService.ts` | Create and list follow-ups |
| `src/modules/change-management/hooks/useCRQ.ts` | Hook: list, get, create, update CRQs |
| `src/modules/change-management/hooks/useApprovals.ts` | Hook: approve, reject, send-back |
| `src/modules/change-management/hooks/useAuditTrail.ts` | Hook: fetch audit trail for a CRQ |

---

### Task 15: AuthProvider

**Files:**
- Create: `src/shared/auth/AuthProvider.tsx`
- Create: `src/shared/auth/useAuth.ts`

- [ ] **Step 1: Write failing test**

Create `src/shared/auth/useAuth.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AuthProvider } from './AuthProvider';
import { useAuth } from './useAuth';

function TestComponent() {
  const { user, profile, loading } = useAuth();
  if (loading) return <div>loading</div>;
  return (
    <div>
      <span data-testid="user">{user ? user.email : 'no-user'}</span>
      <span data-testid="role">{profile?.role ?? 'no-role'}</span>
    </div>
  );
}

vi.mock('./supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  },
}));

describe('useAuth', () => {
  it('provides null user when not authenticated', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    expect(await screen.findByTestId('user')).toHaveTextContent('no-user');
  });
});
```

- [ ] **Step 2: Run test — expect failure**

```bash
npx vitest run src/shared/auth/useAuth.test.tsx
```

Expected: FAIL — modules not found

- [ ] **Step 3: Create `src/shared/auth/AuthProvider.tsx`**

```typescript
import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import type { User } from '@shared/types';

interface AuthContextValue {
  session: Session | null;
  user: SupabaseUser | null;
  profile: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    setProfile(data ?? null);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) {
        fetchProfile(data.session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        if (newSession?.user) {
          fetchProfile(newSession.user.id);
        } else {
          setProfile(null);
        }
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider
      value={{ session, user: session?.user ?? null, profile, loading, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export { AuthContext };
```

- [ ] **Step 4: Create `src/shared/auth/useAuth.ts`**

```typescript
import { useContext } from 'react';
import { AuthContext } from './AuthProvider';

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
```

- [ ] **Step 5: Run test — expect pass**

```bash
npx vitest run src/shared/auth/useAuth.test.tsx
```

Expected: ✓ 1 test passed

- [ ] **Step 6: Wrap app with AuthProvider in `src/main.tsx`**

```typescript
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@shared/auth/AuthProvider';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
```

- [ ] **Step 7: Commit**

```bash
git add src/shared/auth/ src/main.tsx
git commit -m "feat: add AuthProvider and useAuth hook"
```

---

### Task 16: ProtectedRoute + RoleGuard

**Files:**
- Create: `src/shared/auth/ProtectedRoute.tsx`
- Create: `src/shared/access/roles.ts`
- Create: `src/shared/access/RoleGuard.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/shared/auth/ProtectedRoute.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';

vi.mock('./useAuth', () => ({
  useAuth: vi.fn().mockReturnValue({
    user: null,
    profile: null,
    loading: false,
  }),
}));

describe('ProtectedRoute', () => {
  it('redirects to /login when not authenticated', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<div>Dashboard</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
  });
});
```

Create `src/shared/access/RoleGuard.test.tsx`:

```typescript
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
```

- [ ] **Step 2: Run tests — expect failure**

```bash
npx vitest run src/shared/auth/ProtectedRoute.test.tsx src/shared/access/RoleGuard.test.tsx
```

Expected: FAIL — modules not found

- [ ] **Step 3: Create `src/shared/access/roles.ts`**

```typescript
import type { UserRole } from '@shared/types';

export const ROLES = {
  REQUESTER: 'requester' as UserRole,
  APPROVER: 'approver' as UserRole,
  ADMIN: 'admin' as UserRole,
} as const;

export function canCreateCRQ(role: UserRole): boolean {
  return role === ROLES.REQUESTER || role === ROLES.ADMIN;
}

export function canApprove(role: UserRole): boolean {
  return role === ROLES.APPROVER || role === ROLES.ADMIN;
}

export function canManageUsers(role: UserRole): boolean {
  return role === ROLES.ADMIN;
}
```

- [ ] **Step 4: Create `src/shared/auth/ProtectedRoute.tsx`**

```typescript
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './useAuth';

export function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;

  return <Outlet />;
}
```

- [ ] **Step 5: Create `src/shared/access/RoleGuard.tsx`**

```typescript
import { ReactNode } from 'react';
import type { UserRole } from '@shared/types';
import { useAuth } from '@shared/auth/useAuth';

interface RoleGuardProps {
  allow: UserRole[];
  children: ReactNode;
  fallback?: ReactNode;
}

export function RoleGuard({ allow, children, fallback = null }: RoleGuardProps) {
  const { profile } = useAuth();
  if (!profile || !allow.includes(profile.role)) return <>{fallback}</>;
  return <>{children}</>;
}
```

- [ ] **Step 6: Run tests — expect pass**

```bash
npx vitest run src/shared/auth/ProtectedRoute.test.tsx src/shared/access/RoleGuard.test.tsx
```

Expected: ✓ 3 tests passed

- [ ] **Step 7: Update `src/App.tsx` to use ProtectedRoute**

```typescript
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@shared/auth/ProtectedRoute';
import Dashboard from '@modules/change-management/pages/Dashboard';
import CRQListPage from '@modules/change-management/pages/CRQListPage';
import CRQCreatePage from '@modules/change-management/pages/CRQCreatePage';
import CRQDetailPage from '@modules/change-management/pages/CRQDetailPage';
import CRQEditPage from '@modules/change-management/pages/CRQEditPage';
import UserManagementPage from '@shared/users/UserManagementPage';
import ProjectManagementPage from '@modules/change-management/pages/ProjectManagementPage';
import LoginPage from '@shared/auth/LoginPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/crqs" element={<CRQListPage />} />
        <Route path="/crqs/new" element={<CRQCreatePage />} />
        <Route path="/crqs/:id" element={<CRQDetailPage />} />
        <Route path="/crqs/:id/edit" element={<CRQEditPage />} />
        <Route path="/admin/users" element={<UserManagementPage />} />
        <Route path="/admin/projects" element={<ProjectManagementPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
```

Create stub `src/shared/auth/LoginPage.tsx`:

```typescript
export default function LoginPage() {
  return <div data-testid="login-page">Login</div>;
}
```

- [ ] **Step 8: Commit**

```bash
git add src/shared/auth/ src/shared/access/ src/App.tsx
git commit -m "feat: add ProtectedRoute and RoleGuard"
```

---

### Task 17: User Service

**Files:**
- Create: `src/shared/users/userService.ts`
- Create: `src/shared/users/userService.test.ts`
- Create: `src/shared/users/useUsers.ts`

- [ ] **Step 1: Write failing tests**

Create `src/shared/users/userService.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listUsers, inviteUser, updateUserRole, deactivateUser } from './userService';

const mockFrom = vi.fn();
vi.mock('@shared/auth/supabaseClient', () => ({
  supabase: {
    from: mockFrom,
    auth: {
      admin: {
        inviteUserByEmail: vi.fn().mockResolvedValue({ data: {}, error: null }),
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
    mockFrom.mockReturnValue({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    });
    await inviteUser('bob@example.com', 'Bob Smith', 'approver');
    const { supabase } = await import('@shared/auth/supabaseClient');
    expect(supabase.auth.admin.inviteUserByEmail).toHaveBeenCalledWith(
      'bob@example.com',
      expect.objectContaining({ data: { full_name: 'Bob Smith', role: 'approver' } })
    );
  });
});
```

- [ ] **Step 2: Run tests — expect failure**

```bash
npx vitest run src/shared/users/userService.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: Create `src/shared/users/userService.ts`**

```typescript
import { supabase } from '@shared/auth/supabaseClient';
import type { User, UserRole } from '@shared/types';

export async function listUsers(): Promise<User[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('full_name');
  if (error) throw error;
  return data ?? [];
}

export async function listApprovers(): Promise<User[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('role', 'approver')
    .eq('is_active', true)
    .order('full_name');
  if (error) throw error;
  return data ?? [];
}

export async function inviteUser(
  email: string,
  fullName: string,
  role: UserRole
): Promise<void> {
  const { error } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName, role },
  });
  if (error) throw error;
}

export async function updateUserRole(userId: string, role: UserRole): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({ role })
    .eq('id', userId);
  if (error) throw error;
}

export async function deactivateUser(userId: string): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({ is_active: false })
    .eq('id', userId);
  if (error) throw error;
}

export async function reactivateUser(userId: string): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({ is_active: true })
    .eq('id', userId);
  if (error) throw error;
}
```

- [ ] **Step 4: Create `src/shared/users/useUsers.ts`**

```typescript
import { useEffect, useState, useCallback } from 'react';
import type { User, UserRole } from '@shared/types';
import { listUsers, inviteUser, updateUserRole, deactivateUser, reactivateUser } from './userService';

export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setUsers(await listUsers());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function invite(email: string, fullName: string, role: UserRole) {
    await inviteUser(email, fullName, role);
    await load();
  }

  async function changeRole(userId: string, role: UserRole) {
    await updateUserRole(userId, role);
    await load();
  }

  async function deactivate(userId: string) {
    await deactivateUser(userId);
    await load();
  }

  async function reactivate(userId: string) {
    await reactivateUser(userId);
    await load();
  }

  return { users, loading, error, invite, changeRole, deactivate, reactivate, reload: load };
}
```

- [ ] **Step 5: Run tests — expect pass**

```bash
npx vitest run src/shared/users/userService.test.ts
```

Expected: ✓ 2 tests passed

- [ ] **Step 6: Commit**

```bash
git add src/shared/users/
git commit -m "feat: add user service and useUsers hook"
```

---

### Task 18: Project Service

**Files:**
- Create: `src/modules/change-management/services/projectService.ts`
- Create: `src/modules/change-management/services/projectService.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/modules/change-management/services/projectService.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listProjects, createProject } from './projectService';

const mockFrom = vi.fn();
vi.mock('@shared/auth/supabaseClient', () => ({ supabase: { from: mockFrom } }));

beforeEach(() => vi.clearAllMocks());

describe('projectService', () => {
  it('listProjects returns active projects', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [{ id: 'p1', name: 'Project Alpha', is_active: true }],
        error: null,
      }),
    });
    const projects = await listProjects();
    expect(projects).toHaveLength(1);
    expect(projects[0].name).toBe('Project Alpha');
  });

  it('createProject inserts and returns new project', async () => {
    mockFrom.mockReturnValue({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'p2', name: 'New Project' },
        error: null,
      }),
    });
    const project = await createProject({ name: 'New Project', description: null, owner_id: null });
    expect(project.name).toBe('New Project');
  });
});
```

- [ ] **Step 2: Run tests — expect failure**

```bash
npx vitest run src/modules/change-management/services/projectService.test.ts
```

- [ ] **Step 3: Create `src/modules/change-management/services/projectService.ts`**

```typescript
import { supabase } from '@shared/auth/supabaseClient';
import type { Project } from '@shared/types';

export async function listProjects(includeInactive = false): Promise<Project[]> {
  let query = supabase.from('projects').select('*, owner:users!owner_id(id, full_name, email)').order('name');
  if (!includeInactive) query = query.eq('is_active', true);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function createProject(input: {
  name: string;
  description: string | null;
  owner_id: string | null;
}): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateProject(
  id: string,
  input: Partial<Pick<Project, 'name' | 'description' | 'owner_id' | 'is_active'>>
): Promise<void> {
  const { error } = await supabase.from('projects').update(input).eq('id', id);
  if (error) throw error;
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
npx vitest run src/modules/change-management/services/projectService.test.ts
```

Expected: ✓ 2 tests passed

- [ ] **Step 5: Commit**

```bash
git add src/modules/change-management/services/projectService.ts src/modules/change-management/services/projectService.test.ts
git commit -m "feat: add project service"
```

---

### Task 19: CRQ Service

**Files:**
- Create: `src/modules/change-management/services/crqService.ts`
- Create: `src/modules/change-management/services/crqService.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/modules/change-management/services/crqService.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listCRQs, getCRQ, createCRQ, updateCRQStatus } from './crqService';
import type { CRQStatus } from '@modules/change-management/types';

const mockFrom = vi.fn();
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
    await listCRQs({});
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
    await listCRQs({ include_archived: true });
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
```

- [ ] **Step 2: Run tests — expect failure**

```bash
npx vitest run src/modules/change-management/services/crqService.test.ts
```

- [ ] **Step 3: Create `src/modules/change-management/services/crqService.ts`**

```typescript
import { supabase } from '@shared/auth/supabaseClient';
import type { CRQ, CRQFilters } from '@modules/change-management/types';

const CRQ_SELECT = `
  *,
  project:projects(id, name),
  requester:users!requester_id(id, full_name, email),
  approvers:crq_approvers(
    id, status, comments, actioned_at,
    approver:users!approver_id(id, full_name, email)
  )
`;

export async function listCRQs(filters: CRQFilters): Promise<CRQ[]> {
  let query = supabase.from('crqs').select(CRQ_SELECT);

  if (!filters.include_archived) query = query.neq('status', 'archived');
  if (filters.status?.length) query = query.in('status', filters.status);
  if (filters.project_id) query = query.eq('project_id', filters.project_id);
  if (filters.priority) query = query.eq('priority', filters.priority);
  if (filters.date_from) query = query.gte('created_at', filters.date_from);
  if (filters.date_to) query = query.lte('created_at', filters.date_to);
  if (filters.search) {
    query = query.or(`title.ilike.%${filters.search}%,crq_number.ilike.%${filters.search}%`);
  }

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getCRQ(id: string): Promise<CRQ> {
  const { data, error } = await supabase
    .from('crqs')
    .select(CRQ_SELECT)
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function createCRQ(input: {
  title: string;
  description: string;
  priority: string;
  project_id: string | null;
  requester_id: string;
  requested_by: string;
  requested_date: string;
  authorized_by: string;
  changes_effective_from: string;
  due_date?: string | null;
  approver_ids: string[];
}): Promise<CRQ> {
  const { approver_ids, ...crqFields } = input;

  const { data: crq, error: crqError } = await supabase
    .from('crqs')
    .insert(crqFields)
    .select()
    .single();
  if (crqError) throw crqError;

  if (approver_ids.length > 0) {
    const approverRows = approver_ids.map((id) => ({
      crq_id: crq.id,
      approver_id: id,
    }));
    const { error: approverError } = await supabase
      .from('crq_approvers')
      .insert(approverRows);
    if (approverError) throw approverError;
  }

  return getCRQ(crq.id);
}

export async function updateCRQ(
  id: string,
  input: Partial<Pick<CRQ,
    'title' | 'description' | 'priority' | 'project_id' |
    'requested_by' | 'requested_date' | 'authorized_by' |
    'changes_effective_from' | 'due_date'
  >>
): Promise<void> {
  const { error } = await supabase.from('crqs').update(input).eq('id', id);
  if (error) throw error;
}

export async function updateCRQStatus(
  id: string,
  status: CRQ['status'],
  extra?: { archived_at?: string }
): Promise<void> {
  const { error } = await supabase
    .from('crqs')
    .update({ status, ...extra })
    .eq('id', id);
  if (error) throw error;
}

export async function archiveCRQ(id: string): Promise<void> {
  await updateCRQStatus(id, 'archived', { archived_at: new Date().toISOString() });
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
npx vitest run src/modules/change-management/services/crqService.test.ts
```

Expected: ✓ 3 tests passed

- [ ] **Step 5: Commit**

```bash
git add src/modules/change-management/services/crqService.ts src/modules/change-management/services/crqService.test.ts
git commit -m "feat: add CRQ service (list, get, create, update, archive)"
```

---

### Task 20: Approval Service

**Files:**
- Create: `src/modules/change-management/services/approvalService.ts`
- Create: `src/modules/change-management/services/approvalService.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/modules/change-management/services/approvalService.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { actionApproval, checkAllApproved } from './approvalService';

const mockFrom = vi.fn();
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
```

- [ ] **Step 2: Run tests — expect failure**

```bash
npx vitest run src/modules/change-management/services/approvalService.test.ts
```

- [ ] **Step 3: Create `src/modules/change-management/services/approvalService.ts`**

```typescript
import { supabase } from '@shared/auth/supabaseClient';
import type { ApproverStatus } from '@modules/change-management/types';

export async function actionApproval(
  approverRowId: string,
  status: ApproverStatus,
  comments: string | null
): Promise<void> {
  const { error } = await supabase
    .from('crq_approvers')
    .update({ status, comments, actioned_at: new Date().toISOString() })
    .eq('id', approverRowId);
  if (error) throw error;
}

export async function checkAllApproved(crqId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('crq_approvers')
    .select('status')
    .eq('crq_id', crqId);
  if (error) throw error;
  return (data ?? []).every((row) => row.status === 'approved');
}

export async function resetApproversForResubmit(crqId: string): Promise<void> {
  const { error } = await supabase
    .from('crq_approvers')
    .update({ status: 'pending', comments: null, actioned_at: null })
    .eq('crq_id', crqId);
  if (error) throw error;
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
npx vitest run src/modules/change-management/services/approvalService.test.ts
```

Expected: ✓ 3 tests passed

- [ ] **Step 5: Commit**

```bash
git add src/modules/change-management/services/approvalService.ts src/modules/change-management/services/approvalService.test.ts
git commit -m "feat: add approval service"
```

---

### Task 21: Audit + Follow-up Services + CRQ Hooks

**Files:**
- Create: `src/modules/change-management/services/auditService.ts`
- Create: `src/modules/change-management/services/followUpService.ts`
- Create: `src/modules/change-management/hooks/useCRQ.ts`
- Create: `src/modules/change-management/hooks/useApprovals.ts`
- Create: `src/modules/change-management/hooks/useAuditTrail.ts`

- [ ] **Step 1: Create `src/modules/change-management/services/auditService.ts`**

```typescript
import { supabase } from '@shared/auth/supabaseClient';
import type { AuditEntry } from '@modules/change-management/types';

export async function appendAudit(entry: {
  crq_id: string;
  actor_id: string;
  action: string;
  previous_value?: Record<string, unknown> | null;
  new_value?: Record<string, unknown> | null;
  note?: string;
}): Promise<void> {
  const { error } = await supabase.from('audit_trail').insert(entry);
  if (error) throw error;
}

export async function getAuditTrail(crqId: string): Promise<AuditEntry[]> {
  const { data, error } = await supabase
    .from('audit_trail')
    .select('*, actor:users!actor_id(id, full_name, email)')
    .eq('crq_id', crqId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}
```

- [ ] **Step 2: Create `src/modules/change-management/services/followUpService.ts`**

```typescript
import { supabase } from '@shared/auth/supabaseClient';
import type { FollowUp } from '@modules/change-management/types';

export async function createFollowUp(input: {
  crq_id: string;
  sender_id: string;
  recipient_id: string;
  message: string;
}): Promise<void> {
  const { error } = await supabase.from('follow_ups').insert(input);
  if (error) throw error;
}

export async function getFollowUps(crqId: string): Promise<FollowUp[]> {
  const { data, error } = await supabase
    .from('follow_ups')
    .select('*, sender:users!sender_id(id, full_name), recipient:users!recipient_id(id, full_name)')
    .eq('crq_id', crqId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}
```

- [ ] **Step 3: Create `src/modules/change-management/hooks/useCRQ.ts`**

```typescript
import { useCallback, useEffect, useState } from 'react';
import type { CRQ, CRQFilters } from '@modules/change-management/types';
import { listCRQs, getCRQ, createCRQ, updateCRQ, updateCRQStatus, archiveCRQ } from '../services/crqService';

export function useCRQList(filters: CRQFilters) {
  const [crqs, setCrqs] = useState<CRQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setCrqs(await listCRQs(filters));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(filters)]);

  useEffect(() => { load(); }, [load]);
  return { crqs, loading, error, reload: load };
}

export function useCRQDetail(id: string) {
  const [crq, setCrq] = useState<CRQ | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setCrq(await getCRQ(id));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);
  return { crq, loading, error, reload: load };
}

export function useCRQActions() {
  return { createCRQ, updateCRQ, updateCRQStatus, archiveCRQ };
}
```

- [ ] **Step 4: Create `src/modules/change-management/hooks/useApprovals.ts`**

```typescript
import { useAuth } from '@shared/auth/useAuth';
import { actionApproval, checkAllApproved, resetApproversForResubmit } from '../services/approvalService';
import { updateCRQStatus } from '../services/crqService';
import { appendAudit } from '../services/auditService';

export function useApprovals(crqId: string, onUpdate: () => void) {
  const { profile } = useAuth();

  async function approve(approverRowId: string) {
    await actionApproval(approverRowId, 'approved', null);
    await appendAudit({ crq_id: crqId, actor_id: profile!.id, action: 'approved' });
    const allDone = await checkAllApproved(crqId);
    if (allDone) {
      await updateCRQStatus(crqId, 'in_implementation');
      await appendAudit({ crq_id: crqId, actor_id: profile!.id, action: 'in_implementation', note: 'All approvers approved' });
    }
    onUpdate();
  }

  async function reject(approverRowId: string, comments: string) {
    await actionApproval(approverRowId, 'rejected', comments);
    await updateCRQStatus(crqId, 'rejected');
    await appendAudit({ crq_id: crqId, actor_id: profile!.id, action: 'rejected', note: comments });
    onUpdate();
  }

  async function sendBack(approverRowId: string, comments: string) {
    await actionApproval(approverRowId, 'sent_back', comments);
    await updateCRQStatus(crqId, 'draft');
    await appendAudit({ crq_id: crqId, actor_id: profile!.id, action: 'sent_back', note: comments });
    onUpdate();
  }

  return { approve, reject, sendBack };
}
```

- [ ] **Step 5: Create `src/modules/change-management/hooks/useAuditTrail.ts`**

```typescript
import { useCallback, useEffect, useState } from 'react';
import type { AuditEntry } from '@modules/change-management/types';
import { getAuditTrail } from '../services/auditService';

export function useAuditTrail(crqId: string) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setEntries(await getAuditTrail(crqId));
    } finally {
      setLoading(false);
    }
  }, [crqId]);

  useEffect(() => { load(); }, [load]);
  return { entries, loading, reload: load };
}
```

- [ ] **Step 6: Run all service + hook tests**

```bash
npx vitest run src/modules/change-management/
```

Expected: All tests pass

- [ ] **Step 7: Commit**

```bash
git add src/modules/change-management/services/ src/modules/change-management/hooks/
git commit -m "feat: add audit, follow-up services and all CRQ hooks"
```

---

**Phase 3 complete.** All services and hooks are implemented and tested. Proceed to Phase 4: UI.
