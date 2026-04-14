# CRQ App — Phase 4: UI (Pages + Components)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build all UI — shared components, Login, Dashboard, CRQ List, CRQ Create/Edit, CRQ Detail, Approver Actions, Follow-up, Audit Trail, PDF Print View, and Admin pages for Users and Projects.

**Architecture:** Pages are thin — they wire hooks to components. Components are focused on rendering and local form state. Role-aware rendering uses `RoleGuard`. All status logic is handled by the service layer (Phase 3), not the UI.

**Tech Stack:** React 19, TypeScript, Lucide React (icons), React Router, React Testing Library

**Prerequisite:** Phase 1 (scaffold), Phase 2 (Supabase), Phase 3 (services + hooks) must be complete.

---

## File Map

| File | Purpose |
|---|---|
| `src/shared/ui/Layout.tsx` | App shell with Navbar |
| `src/shared/ui/Navbar.tsx` | Top nav with role-aware links |
| `src/shared/ui/StatusBadge.tsx` | Coloured pill for CRQ status |
| `src/shared/ui/Modal.tsx` | Reusable modal overlay |
| `src/shared/ui/Button.tsx` | Consistent button with variants |
| `src/shared/auth/LoginPage.tsx` | Email + password login form |
| `src/modules/change-management/pages/Dashboard.tsx` | Role-aware dashboard |
| `src/modules/change-management/pages/CRQListPage.tsx` | List + filter CRQs |
| `src/modules/change-management/pages/CRQCreatePage.tsx` | New CRQ form |
| `src/modules/change-management/pages/CRQEditPage.tsx` | Edit draft/sent-back CRQ |
| `src/modules/change-management/pages/CRQDetailPage.tsx` | Full CRQ view |
| `src/modules/change-management/components/CRQForm.tsx` | Shared create/edit form |
| `src/modules/change-management/components/ApproverActions.tsx` | Approve/Reject/Send-back |
| `src/modules/change-management/components/FollowUpForm.tsx` | Follow-up message form |
| `src/modules/change-management/components/AuditTrail.tsx` | Timeline of audit entries |
| `src/modules/change-management/components/CRQPrintView.tsx` | Print-ready PDF layout |
| `src/shared/users/UserManagementPage.tsx` | Admin: invite, role change, deactivate |
| `src/modules/change-management/pages/ProjectManagementPage.tsx` | Admin: create/edit projects |
| `src/index.css` | Global styles + print CSS |

---

### Task 22: Shared Components

**Files:**
- Create: `src/shared/ui/Button.tsx`
- Create: `src/shared/ui/Modal.tsx`
- Create: `src/shared/ui/StatusBadge.tsx`
- Create: `src/shared/ui/Button.test.tsx`
- Create: `src/shared/ui/StatusBadge.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/shared/ui/Button.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Go</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Nope</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

Create `src/shared/ui/StatusBadge.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from './StatusBadge';

describe('StatusBadge', () => {
  it('renders status text', () => {
    render(<StatusBadge status="pending_approval" />);
    expect(screen.getByText('Pending Approval')).toBeInTheDocument();
  });

  it('renders draft status', () => {
    render(<StatusBadge status="draft" />);
    expect(screen.getByText('Draft')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests — expect failure**

```bash
npx vitest run src/shared/ui/
```

- [ ] **Step 3: Create `src/shared/ui/Button.tsx`**

```typescript
import { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md';
  children: ReactNode;
}

const variantStyles: Record<string, string> = {
  primary:   'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300',
  secondary: 'bg-gray-100 text-gray-800 hover:bg-gray-200 disabled:opacity-50',
  danger:    'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300',
  ghost:     'bg-transparent text-blue-600 hover:bg-blue-50 disabled:opacity-50',
};

const sizeStyles: Record<string, string> = {
  sm: 'px-3 py-1 text-sm',
  md: 'px-4 py-2 text-sm',
};

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center gap-1.5 rounded-md font-medium transition-colors
        ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
```

- [ ] **Step 4: Create `src/shared/ui/StatusBadge.tsx`**

```typescript
import type { CRQStatus } from '@modules/change-management/types';

const labels: Record<CRQStatus, string> = {
  draft:             'Draft',
  pending_approval:  'Pending Approval',
  in_implementation: 'In Implementation',
  completed:         'Completed',
  rejected:          'Rejected',
  archived:          'Archived',
};

const colors: Record<CRQStatus, string> = {
  draft:             'bg-gray-100 text-gray-600',
  pending_approval:  'bg-yellow-100 text-yellow-700',
  in_implementation: 'bg-blue-100 text-blue-700',
  completed:         'bg-green-100 text-green-700',
  rejected:          'bg-red-100 text-red-700',
  archived:          'bg-gray-200 text-gray-500',
};

export function StatusBadge({ status }: { status: CRQStatus }) {
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status]}`}>
      {labels[status]}
    </span>
  );
}
```

- [ ] **Step 5: Create `src/shared/ui/Modal.tsx`**

```typescript
import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({ title, onClose, children }: ModalProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
            <X size={16} />
          </Button>
        </div>
        <div className="px-6 py-4">{children}</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Run tests — expect pass**

```bash
npx vitest run src/shared/ui/
```

Expected: ✓ 5 tests passed

- [ ] **Step 7: Commit**

```bash
git add src/shared/ui/
git commit -m "feat: add shared Button, Modal, StatusBadge components"
```

---

### Task 23: Layout + Navbar

**Files:**
- Create: `src/shared/ui/Layout.tsx`
- Create: `src/shared/ui/Navbar.tsx`

- [ ] **Step 1: Create `src/shared/ui/Navbar.tsx`**

```typescript
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, Users, FolderOpen, List, PlusCircle, LayoutDashboard } from 'lucide-react';
import { useAuth } from '@shared/auth/useAuth';
import { RoleGuard } from '@shared/roles/RoleGuard';
import { Button } from './Button';

export function Navbar() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate('/login');
  }

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <Link to="/" className="font-bold text-blue-600 text-lg">CRQ Manager</Link>
        <Link to="/" className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900">
          <LayoutDashboard size={15} /> Dashboard
        </Link>
        <Link to="/crqs" className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900">
          <List size={15} /> Change Requests
        </Link>
        <RoleGuard allow={['requester', 'admin']}>
          <Link to="/crqs/new" className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900">
            <PlusCircle size={15} /> New CRQ
          </Link>
        </RoleGuard>
        <RoleGuard allow={['admin']}>
          <Link to="/admin/users" className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900">
            <Users size={15} /> Users
          </Link>
          <Link to="/admin/projects" className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900">
            <FolderOpen size={15} /> Projects
          </Link>
        </RoleGuard>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500">{profile?.full_name}</span>
        <Button variant="ghost" size="sm" onClick={handleSignOut}>
          <LogOut size={14} /> Sign out
        </Button>
      </div>
    </nav>
  );
}
```

- [ ] **Step 2: Create `src/shared/ui/Layout.tsx`**

```typescript
import { ReactNode } from 'react';
import { Navbar } from './Navbar';

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
```

- [ ] **Step 3: Update `src/App.tsx` to wrap protected routes in Layout**

```typescript
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@shared/auth/ProtectedRoute';
import { Layout } from '@shared/components/Layout';
import LoginPage from '@shared/auth/LoginPage';
import Dashboard from '@modules/change-management/pages/Dashboard';
import CRQListPage from '@modules/change-management/pages/CRQListPage';
import CRQCreatePage from '@modules/change-management/pages/CRQCreatePage';
import CRQDetailPage from '@modules/change-management/pages/CRQDetailPage';
import CRQEditPage from '@modules/change-management/pages/CRQEditPage';
import UserManagementPage from '@shared/users/UserManagementPage';
import ProjectManagementPage from '@modules/change-management/pages/ProjectManagementPage';

function AppShell() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/crqs" element={<CRQListPage />} />
        <Route path="/crqs/new" element={<CRQCreatePage />} />
        <Route path="/crqs/:id" element={<CRQDetailPage />} />
        <Route path="/crqs/:id/edit" element={<CRQEditPage />} />
        <Route path="/admin/users" element={<UserManagementPage />} />
        <Route path="/admin/projects" element={<ProjectManagementPage />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/*" element={<AppShell />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/shared/ui/Layout.tsx src/shared/ui/Navbar.tsx src/App.tsx
git commit -m "feat: add Layout and Navbar with role-aware links"
```

---

### Task 24: Login Page

**Files:**
- Modify: `src/shared/auth/LoginPage.tsx`

- [ ] **Step 1: Write failing test**

Create `src/shared/auth/LoginPage.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from './LoginPage';

const mockSignIn = vi.fn().mockResolvedValue(undefined);
vi.mock('./useAuth', () => ({
  useAuth: () => ({ signIn: mockSignIn, user: null }),
}));
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => vi.fn() };
});

describe('LoginPage', () => {
  it('submits email and password to signIn', async () => {
    render(<MemoryRouter><LoginPage /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'user@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'secret123' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() =>
      expect(mockSignIn).toHaveBeenCalledWith('user@example.com', 'secret123')
    );
  });

  it('shows error when signIn fails', async () => {
    mockSignIn.mockRejectedValueOnce(new Error('Invalid credentials'));
    render(<MemoryRouter><LoginPage /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'bad@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByText('Invalid credentials')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test — expect failure**

```bash
npx vitest run src/shared/auth/LoginPage.test.tsx
```

- [ ] **Step 3: Implement `src/shared/auth/LoginPage.tsx`**

```typescript
import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './useAuth';
import { Button } from '@shared/components/Button';

export default function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signIn(email, password);
      navigate('/');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow p-8 w-full max-w-sm">
        <h1 className="text-xl font-bold text-gray-900 mb-6">CRQ Manager</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full justify-center" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test — expect pass**

```bash
npx vitest run src/shared/auth/LoginPage.test.tsx
```

Expected: ✓ 2 tests passed

- [ ] **Step 5: Commit**

```bash
git add src/shared/auth/LoginPage.tsx src/shared/auth/LoginPage.test.tsx
git commit -m "feat: add Login page"
```

---

### Task 25: CRQ Form Component

**Files:**
- Create: `src/modules/change-management/components/CRQForm.tsx`
- Create: `src/modules/change-management/components/CRQForm.test.tsx`

- [ ] **Step 1: Write failing test**

Create `src/modules/change-management/components/CRQForm.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CRQForm } from './CRQForm';

const mockProjects = [{ id: 'p1', name: 'Project Alpha', is_active: true, description: null, owner_id: null, created_at: '' }];
const mockApprovers = [{ id: 'u1', full_name: 'Alice', email: 'alice@example.com', role: 'approver' as const, is_active: true, created_at: '' }];

describe('CRQForm', () => {
  it('renders all required fields', () => {
    render(
      <CRQForm
        projects={mockProjects}
        approvers={mockApprovers}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/requested by/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/authorized by/i)).toBeInTheDocument();
  });

  it('calls onSubmit with form data', () => {
    const onSubmit = vi.fn();
    render(
      <CRQForm
        projects={mockProjects}
        approvers={mockApprovers}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />
    );
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'My CRQ' } });
    fireEvent.submit(screen.getByRole('form'));
    expect(onSubmit).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test — expect failure**

```bash
npx vitest run src/modules/change-management/components/CRQForm.test.tsx
```

- [ ] **Step 3: Create `src/modules/change-management/components/CRQForm.tsx`**

```typescript
import { FormEvent, useState } from 'react';
import type { CRQ, CRQPriority } from '@modules/change-management/types';
import type { User, Project } from '@shared/types';
import { Button } from '@shared/components/Button';

interface CRQFormData {
  title: string;
  description: string;
  priority: CRQPriority;
  project_id: string | null;
  requested_by: string;
  requested_date: string;
  authorized_by: string;
  changes_effective_from: string;
  due_date: string;
  approver_ids: string[];
}

interface CRQFormProps {
  projects: Project[];
  approvers: User[];
  initialValues?: Partial<CRQ>;
  onSubmit: (data: CRQFormData) => Promise<void>;
  onCancel: () => void;
}

export function CRQForm({ projects, approvers, initialValues, onSubmit, onCancel }: CRQFormProps) {
  const [form, setForm] = useState<CRQFormData>({
    title:                  initialValues?.title ?? '',
    description:            initialValues?.description ?? '',
    priority:               initialValues?.priority ?? 'medium',
    project_id:             initialValues?.project_id ?? null,
    requested_by:           initialValues?.requested_by ?? '',
    requested_date:         initialValues?.requested_date ?? '',
    authorized_by:          initialValues?.authorized_by ?? '',
    changes_effective_from: initialValues?.changes_effective_from ?? '',
    due_date:               initialValues?.due_date ?? '',
    approver_ids:           initialValues?.approvers?.map((a) => a.approver_id) ?? [],
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof CRQFormData>(key: K, value: CRQFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleApprover(id: string) {
    setForm((prev) => ({
      ...prev,
      approver_ids: prev.approver_ids.includes(id)
        ? prev.approver_ids.filter((x) => x !== id)
        : [...prev.approver_ids, id],
    }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (form.approver_ids.length === 0) {
      setError('At least one approver is required');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit(form);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass = 'w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1';

  return (
    <form onSubmit={handleSubmit} aria-label="CRQ form" className="space-y-6">
      {/* Basic Info */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Details</h3>
        <div>
          <label htmlFor="crq-title" className={labelClass}>Title *</label>
          <input id="crq-title" className={inputClass} value={form.title}
            onChange={(e) => set('title', e.target.value)} required />
        </div>
        <div>
          <label htmlFor="crq-description" className={labelClass}>Description *</label>
          <textarea id="crq-description" rows={4} className={inputClass} value={form.description}
            onChange={(e) => set('description', e.target.value)} required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="crq-priority" className={labelClass}>Priority</label>
            <select id="crq-priority" className={inputClass} value={form.priority}
              onChange={(e) => set('priority', e.target.value as CRQPriority)}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <div>
            <label htmlFor="crq-project" className={labelClass}>Project</label>
            <select id="crq-project" className={inputClass} value={form.project_id ?? ''}
              onChange={(e) => set('project_id', e.target.value || null)}>
              <option value="">— Select project —</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>
      </section>

      {/* Request Info */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Request Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="requested-by" className={labelClass}>Requested By *</label>
            <input id="requested-by" className={inputClass} value={form.requested_by}
              onChange={(e) => set('requested_by', e.target.value)} required />
          </div>
          <div>
            <label htmlFor="requested-date" className={labelClass}>Requested Date *</label>
            <input id="requested-date" type="date" className={inputClass} value={form.requested_date}
              onChange={(e) => set('requested_date', e.target.value)} required />
          </div>
          <div>
            <label htmlFor="authorized-by" className={labelClass}>Authorized By *</label>
            <input id="authorized-by" className={inputClass} value={form.authorized_by}
              onChange={(e) => set('authorized_by', e.target.value)} required />
          </div>
          <div>
            <label htmlFor="effective-from" className={labelClass}>Changes Effective From *</label>
            <input id="effective-from" type="date" className={inputClass} value={form.changes_effective_from}
              onChange={(e) => set('changes_effective_from', e.target.value)} required />
          </div>
        </div>
        <div>
          <label htmlFor="due-date" className={labelClass}>SLA Due Date (optional — overrides 24hr default)</label>
          <input id="due-date" type="datetime-local" className={inputClass} value={form.due_date}
            onChange={(e) => set('due_date', e.target.value)} />
        </div>
      </section>

      {/* Approvers */}
      <section>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Approvers *</h3>
        <div className="space-y-2">
          {approvers.map((a) => (
            <label key={a.id} className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.approver_ids.includes(a.id)}
                onChange={() => toggleApprover(a.id)} />
              {a.full_name} <span className="text-gray-400">{a.email}</span>
            </label>
          ))}
        </div>
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3 justify-end">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 4: Run test — expect pass**

```bash
npx vitest run src/modules/change-management/components/CRQForm.test.tsx
```

Expected: ✓ 2 tests passed

- [ ] **Step 5: Commit**

```bash
git add src/modules/change-management/components/CRQForm.tsx src/modules/change-management/components/CRQForm.test.tsx
git commit -m "feat: add CRQForm component"
```

---

### Task 26: CRQ Create + Edit Pages

**Files:**
- Modify: `src/modules/change-management/pages/CRQCreatePage.tsx`
- Modify: `src/modules/change-management/pages/CRQEditPage.tsx`

- [ ] **Step 1: Implement `src/modules/change-management/pages/CRQCreatePage.tsx`**

```typescript
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@shared/auth/useAuth';
import { useUsers } from '@shared/users/useUsers';
import { useCRQActions } from '@modules/change-management/hooks/useCRQ';
import { CRQForm } from '@modules/change-management/components/CRQForm';
import { appendAudit } from '@modules/change-management/services/auditService';
import { Layout } from '@shared/components/Layout';
import { listProjects } from '@modules/change-management/services/projectService';
import { useEffect, useState } from 'react';
import type { Project } from '@shared/types';

export default function CRQCreatePage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { users } = useUsers();
  const { createCRQ } = useCRQActions();
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => { listProjects().then(setProjects); }, []);

  const approvers = users.filter((u) => u.role === 'approver' && u.is_active);

  async function handleSubmit(data: Parameters<typeof createCRQ>[0] extends { approver_ids: string[] } ? Parameters<typeof createCRQ>[0] : never) {
    const crq = await createCRQ({ ...data, requester_id: profile!.id });
    await appendAudit({ crq_id: crq.id, actor_id: profile!.id, action: 'created', new_value: { title: crq.title, status: crq.status } });
    navigate(`/crqs/${crq.id}`);
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">New Change Request</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <CRQForm
          projects={projects}
          approvers={approvers}
          onSubmit={handleSubmit as never}
          onCancel={() => navigate('/crqs')}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Implement `src/modules/change-management/pages/CRQEditPage.tsx`**

```typescript
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@shared/auth/useAuth';
import { useUsers } from '@shared/users/useUsers';
import { useCRQDetail, useCRQActions } from '@modules/change-management/hooks/useCRQ';
import { CRQForm } from '@modules/change-management/components/CRQForm';
import { appendAudit } from '@modules/change-management/services/auditService';
import { resetApproversForResubmit } from '@modules/change-management/services/approvalService';
import { listProjects } from '@modules/change-management/services/projectService';
import { useEffect, useState } from 'react';
import type { Project } from '@shared/types';

export default function CRQEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { crq, loading } = useCRQDetail(id!);
  const { users } = useUsers();
  const { updateCRQ, updateCRQStatus } = useCRQActions();
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => { listProjects().then(setProjects); }, []);

  const approvers = users.filter((u) => u.role === 'approver' && u.is_active);

  if (loading) return <div>Loading…</div>;
  if (!crq) return <div>CRQ not found.</div>;
  if (crq.status !== 'draft') {
    return <div className="text-red-600">Only draft CRQs can be edited.</div>;
  }

  async function handleSubmit(data: Record<string, unknown>) {
    const prev = { title: crq!.title, description: crq!.description, status: crq!.status };
    await updateCRQ(id!, data as never);
    await resetApproversForResubmit(id!);
    await updateCRQStatus(id!, 'pending_approval');
    await appendAudit({
      crq_id: id!,
      actor_id: profile!.id,
      action: 'resubmitted',
      previous_value: prev,
      new_value: { title: data.title, status: 'pending_approval' },
    });
    navigate(`/crqs/${id}`);
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">Edit {crq.crq_number}</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <CRQForm
          projects={projects}
          approvers={approvers}
          initialValues={crq}
          onSubmit={handleSubmit as never}
          onCancel={() => navigate(`/crqs/${id}`)}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/modules/change-management/pages/CRQCreatePage.tsx src/modules/change-management/pages/CRQEditPage.tsx
git commit -m "feat: add CRQ Create and Edit pages"
```

---

### Task 27: CRQ List Page

**Files:**
- Modify: `src/modules/change-management/pages/CRQListPage.tsx`

- [ ] **Step 1: Implement `src/modules/change-management/pages/CRQListPage.tsx`**

```typescript
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, Search, Archive } from 'lucide-react';
import { useCRQList } from '@modules/change-management/hooks/useCRQ';
import { StatusBadge } from '@shared/components/StatusBadge';
import { Button } from '@shared/components/Button';
import { RoleGuard } from '@shared/roles/RoleGuard';
import type { CRQFilters, CRQStatus, CRQPriority } from '@modules/change-management/types';

const ALL_STATUSES: CRQStatus[] = ['draft','pending_approval','in_implementation','completed','rejected'];

export default function CRQListPage() {
  const [filters, setFilters] = useState<CRQFilters>({ include_archived: false });
  const [search, setSearch] = useState('');
  const { crqs, loading } = useCRQList({ ...filters, search: search || undefined });

  function setStatus(status: CRQStatus, checked: boolean) {
    setFilters((f) => ({
      ...f,
      status: checked
        ? [...(f.status ?? []), status]
        : (f.status ?? []).filter((s) => s !== status),
    }));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Change Requests</h1>
        <RoleGuard allow={['requester', 'admin']}>
          <Link to="/crqs/new">
            <Button><PlusCircle size={15} /> New CRQ</Button>
          </Link>
        </RoleGuard>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-4 flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-48">
          <label className="block text-xs font-medium text-gray-500 mb-1">Search</label>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
            <input
              className="pl-8 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              placeholder="CRQ number or title…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
          <div className="flex flex-wrap gap-2">
            {ALL_STATUSES.map((s) => (
              <label key={s} className="flex items-center gap-1 text-xs cursor-pointer">
                <input type="checkbox" checked={filters.status?.includes(s) ?? false}
                  onChange={(e) => setStatus(s, e.target.checked)} />
                {s.replace('_', ' ')}
              </label>
            ))}
          </div>
        </div>
        <label className="flex items-center gap-1.5 text-sm cursor-pointer">
          <input type="checkbox" checked={!!filters.include_archived}
            onChange={(e) => setFilters((f) => ({ ...f, include_archived: e.target.checked }))} />
          <Archive size={13} /> Include archived
        </label>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading…</div>
        ) : crqs.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No change requests found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['CRQ #', 'Title', 'Project', 'Priority', 'Status', 'SLA Deadline', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {crqs.map((crq) => {
                const overdue = crq.sla_deadline && new Date(crq.sla_deadline) < new Date()
                  && ['pending_approval', 'in_implementation'].includes(crq.status);
                return (
                  <tr key={crq.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{crq.crq_number}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{crq.title}</td>
                    <td className="px-4 py-3 text-gray-500">{crq.project?.name ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                        crq.priority === 'critical' ? 'bg-red-100 text-red-700' :
                        crq.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>{crq.priority}</span>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={crq.status} /></td>
                    <td className={`px-4 py-3 text-xs ${overdue ? 'text-red-600 font-medium' : 'text-gray-400'}`}>
                      {crq.sla_deadline
                        ? new Date(crq.sla_deadline).toLocaleDateString()
                        : '—'}
                      {overdue && ' ⚠ OVERDUE'}
                    </td>
                    <td className="px-4 py-3">
                      <Link to={`/crqs/${crq.id}`} className="text-blue-600 hover:underline text-xs">
                        View →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/change-management/pages/CRQListPage.tsx
git commit -m "feat: add CRQ List page with filters and SLA indicator"
```

---

### Task 28: Approver Actions + Follow-up Components

**Files:**
- Create: `src/modules/change-management/components/ApproverActions.tsx`
- Create: `src/modules/change-management/components/FollowUpForm.tsx`

- [ ] **Step 1: Create `src/modules/change-management/components/ApproverActions.tsx`**

```typescript
import { useState } from 'react';
import { CheckCircle, XCircle, RotateCcw } from 'lucide-react';
import { Button } from '@shared/components/Button';
import { Modal } from '@shared/components/Modal';
import { useApprovals } from '@modules/change-management/hooks/useApprovals';
import type { CRQApprover } from '@modules/change-management/types';
import { useAuth } from '@shared/auth/useAuth';

interface ApproverActionsProps {
  crqId: string;
  approvers: CRQApprover[];
  onUpdate: () => void;
}

export function ApproverActions({ crqId, approvers, onUpdate }: ApproverActionsProps) {
  const { profile } = useAuth();
  const { approve, reject, sendBack } = useApprovals(crqId, onUpdate);
  const [modal, setModal] = useState<'reject' | 'send_back' | null>(null);
  const [comments, setComments] = useState('');
  const [loading, setLoading] = useState(false);

  const myRow = approvers.find((a) => a.approver_id === profile?.id && a.status === 'pending');
  if (!myRow) return null;

  async function handleApprove() {
    setLoading(true);
    try { await approve(myRow!.id); } finally { setLoading(false); }
  }

  async function handleConfirmModal() {
    if (!comments.trim()) return;
    setLoading(true);
    try {
      if (modal === 'reject') await reject(myRow!.id, comments);
      else await sendBack(myRow!.id, comments);
      setModal(null);
      setComments('');
    } finally { setLoading(false); }
  }

  return (
    <div className="flex gap-2 items-center">
      <Button onClick={handleApprove} disabled={loading}>
        <CheckCircle size={14} /> Approve
      </Button>
      <Button variant="secondary" onClick={() => setModal('send_back')} disabled={loading}>
        <RotateCcw size={14} /> Send Back
      </Button>
      <Button variant="danger" onClick={() => setModal('reject')} disabled={loading}>
        <XCircle size={14} /> Reject
      </Button>

      {modal && (
        <Modal
          title={modal === 'reject' ? 'Reject CRQ' : 'Send Back for Changes'}
          onClose={() => { setModal(null); setComments(''); }}
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              {modal === 'reject'
                ? 'Please provide a reason for rejection.'
                : 'Please describe what changes are needed.'}
            </p>
            <textarea
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              rows={4}
              placeholder="Comments (required)…"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => { setModal(null); setComments(''); }}>
                Cancel
              </Button>
              <Button
                variant={modal === 'reject' ? 'danger' : 'primary'}
                onClick={handleConfirmModal}
                disabled={!comments.trim() || loading}
              >
                {modal === 'reject' ? 'Reject' : 'Send Back'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create `src/modules/change-management/components/FollowUpForm.tsx`**

```typescript
import { useState } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@shared/components/Button';
import { createFollowUp } from '@modules/change-management/services/followUpService';
import { appendAudit } from '@modules/change-management/services/auditService';
import { useAuth } from '@shared/auth/useAuth';
import type { CRQApprover } from '@modules/change-management/types';

interface FollowUpFormProps {
  crqId: string;
  approvers: CRQApprover[];
  onSent: () => void;
}

export function FollowUpForm({ crqId, approvers, onSent }: FollowUpFormProps) {
  const { profile } = useAuth();
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const pendingApprovers = approvers.filter((a) => a.status === 'pending');

  async function handleSend() {
    if (!message.trim() || pendingApprovers.length === 0) return;
    setLoading(true);
    try {
      for (const a of pendingApprovers) {
        await createFollowUp({
          crq_id: crqId,
          sender_id: profile!.id,
          recipient_id: a.approver_id,
          message,
        });
      }
      await appendAudit({ crq_id: crqId, actor_id: profile!.id, action: 'followed_up', note: message });
      setMessage('');
      onSent();
    } finally {
      setLoading(false);
    }
  }

  if (pendingApprovers.length === 0) return null;

  return (
    <div className="border border-gray-200 rounded-lg p-4 space-y-3">
      <h3 className="text-sm font-medium text-gray-700">Follow up with approvers</h3>
      <textarea
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
        rows={2}
        placeholder="Add a message to nudge approvers…"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      <Button size="sm" onClick={handleSend} disabled={!message.trim() || loading}>
        <Send size={13} /> Send Follow-up
      </Button>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/modules/change-management/components/ApproverActions.tsx src/modules/change-management/components/FollowUpForm.tsx
git commit -m "feat: add ApproverActions and FollowUpForm components"
```

---

### Task 29: Audit Trail + CRQ Detail Page

**Files:**
- Create: `src/modules/change-management/components/AuditTrail.tsx`
- Modify: `src/modules/change-management/pages/CRQDetailPage.tsx`

- [ ] **Step 1: Create `src/modules/change-management/components/AuditTrail.tsx`**

```typescript
import { Clock } from 'lucide-react';
import type { AuditEntry } from '@modules/change-management/types';

const ACTION_LABELS: Record<string, string> = {
  created:            'Created CRQ',
  edited:             'Edited CRQ',
  submitted:          'Submitted for approval',
  approved:           'Approved',
  rejected:           'Rejected',
  sent_back:          'Sent back for changes',
  resubmitted:        'Resubmitted for approval',
  followed_up:        'Sent follow-up',
  completed:          'Marked as complete',
  archived:           'Archived',
  in_implementation:  'Moved to implementation',
  sla_reminder_sent:  'SLA reminder sent',
  sla_breached_notified: 'SLA breach notification sent',
};

interface AuditTrailProps {
  entries: AuditEntry[];
}

export function AuditTrail({ entries }: AuditTrailProps) {
  if (entries.length === 0) {
    return <p className="text-sm text-gray-400">No audit history yet.</p>;
  }

  return (
    <ol className="relative border-l border-gray-200 space-y-6 ml-3">
      {entries.map((entry) => (
        <li key={entry.id} className="ml-6">
          <span className="absolute -left-3 flex items-center justify-center w-6 h-6 rounded-full bg-blue-50 ring-4 ring-white">
            <Clock size={12} className="text-blue-500" />
          </span>
          <div className="p-3 bg-white border border-gray-100 rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-gray-900">
                {ACTION_LABELS[entry.action] ?? entry.action}
              </span>
              <time className="text-xs text-gray-400">
                {new Date(entry.created_at).toLocaleString()}
              </time>
            </div>
            <p className="text-xs text-gray-500">
              by <strong>{entry.actor?.full_name ?? 'System'}</strong>
            </p>
            {entry.note && (
              <p className="mt-1 text-xs text-gray-600 bg-gray-50 rounded p-2">{entry.note}</p>
            )}
            {entry.previous_value && entry.new_value && (
              <details className="mt-1">
                <summary className="text-xs text-blue-500 cursor-pointer">View changes</summary>
                <div className="text-xs mt-1 space-y-1">
                  {Object.keys(entry.new_value).map((key) => (
                    <div key={key} className="flex gap-2">
                      <span className="font-medium w-24 shrink-0">{key}:</span>
                      <span className="text-red-500 line-through">{String(entry.previous_value![key] ?? '')}</span>
                      <span className="text-green-600">{String(entry.new_value![key] ?? '')}</span>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
```

- [ ] **Step 2: Implement `src/modules/change-management/pages/CRQDetailPage.tsx`**

```typescript
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Pencil, Archive, Printer } from 'lucide-react';
import { useCRQDetail, useCRQActions } from '@modules/change-management/hooks/useCRQ';
import { useAuditTrail } from '@modules/change-management/hooks/useAuditTrail';
import { StatusBadge } from '@shared/components/StatusBadge';
import { Button } from '@shared/components/Button';
import { RoleGuard } from '@shared/roles/RoleGuard';
import { ApproverActions } from '@modules/change-management/components/ApproverActions';
import { FollowUpForm } from '@modules/change-management/components/FollowUpForm';
import { AuditTrail } from '@modules/change-management/components/AuditTrail';
import { CRQPrintView } from '@modules/change-management/components/CRQPrintView';
import { appendAudit } from '@modules/change-management/services/auditService';
import { useAuth } from '@shared/auth/useAuth';
import { useState } from 'react';

export default function CRQDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const { crq, loading, reload } = useCRQDetail(id!);
  const { entries } = useAuditTrail(id!);
  const { updateCRQStatus, archiveCRQ } = useCRQActions();
  const navigate = useNavigate();
  const [printMode, setPrintMode] = useState(false);

  if (loading) return <div className="p-8 text-center text-gray-400">Loading…</div>;
  if (!crq) return <div className="p-8 text-center text-red-500">CRQ not found.</div>;

  const canEdit = crq.status === 'draft' && crq.requester_id === profile?.id;
  const canComplete = crq.status === 'in_implementation' && crq.requester_id === profile?.id;
  const canArchive = ['completed', 'rejected', 'draft'].includes(crq.status);
  const showPDF = ['in_implementation', 'completed', 'archived'].includes(crq.status);

  async function handleComplete() {
    await updateCRQStatus(id!, 'completed');
    await appendAudit({ crq_id: id!, actor_id: profile!.id, action: 'completed' });
    reload();
  }

  async function handleArchive() {
    await archiveCRQ(id!);
    await appendAudit({ crq_id: id!, actor_id: profile!.id, action: 'archived' });
    reload();
  }

  if (printMode) {
    return <CRQPrintView crq={crq} auditEntries={entries} onClose={() => setPrintMode(false)} />;
  }

  const dl = (label: string, value: string | undefined | null) => (
    <div>
      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-900">{value ?? '—'}</dd>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-mono text-gray-400">{crq.crq_number}</p>
          <h1 className="text-xl font-bold text-gray-900 mt-1">{crq.title}</h1>
          <div className="flex items-center gap-2 mt-2">
            <StatusBadge status={crq.status} />
            <span className={`text-xs px-2 py-0.5 rounded font-medium ${
              crq.priority === 'critical' ? 'bg-red-100 text-red-700' :
              crq.priority === 'high' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'
            }`}>{crq.priority}</span>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          {canEdit && (
            <Link to={`/crqs/${id}/edit`}>
              <Button variant="secondary" size="sm"><Pencil size={13} /> Edit</Button>
            </Link>
          )}
          {canComplete && (
            <Button size="sm" onClick={handleComplete}>Mark Complete</Button>
          )}
          {canArchive && (
            <RoleGuard allow={['requester', 'admin']}>
              <Button variant="secondary" size="sm" onClick={handleArchive}>
                <Archive size={13} /> Archive
              </Button>
            </RoleGuard>
          )}
          {showPDF && (
            <Button variant="secondary" size="sm" onClick={() => setPrintMode(true)}>
              <Printer size={13} /> Export PDF
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left: Main details */}
        <div className="col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Description</h2>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{crq.description}</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Request Information</h2>
            <dl className="grid grid-cols-2 gap-4">
              {dl('Project', crq.project?.name)}
              {dl('Requested By', crq.requested_by)}
              {dl('Requested Date', crq.requested_date)}
              {dl('Authorized By', crq.authorized_by)}
              {dl('Changes Effective From', crq.changes_effective_from)}
              {dl('SLA Deadline', crq.sla_deadline ? new Date(crq.sla_deadline).toLocaleString() : undefined)}
            </dl>
          </div>

          {/* Approver actions */}
          <RoleGuard allow={['approver', 'admin']}>
            {crq.status === 'pending_approval' && crq.approvers && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-sm font-semibold text-gray-700 mb-4">Your Action</h2>
                <ApproverActions crqId={id!} approvers={crq.approvers} onUpdate={reload} />
              </div>
            )}
          </RoleGuard>

          {/* Follow-up */}
          <RoleGuard allow={['requester', 'admin']}>
            {crq.status === 'pending_approval' && crq.approvers && (
              <FollowUpForm crqId={id!} approvers={crq.approvers} onSent={reload} />
            )}
          </RoleGuard>
        </div>

        {/* Right: Sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Approvers</h2>
            {crq.approvers?.length ? (
              <ul className="space-y-3">
                {crq.approvers.map((a) => (
                  <li key={a.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-800">{a.approver?.full_name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      a.status === 'approved' ? 'bg-green-100 text-green-700' :
                      a.status === 'rejected' ? 'bg-red-100 text-red-700' :
                      a.status === 'sent_back' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-500'
                    }`}>{a.status}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-gray-400">No approvers assigned.</p>}

            {crq.approvers?.some((a) => a.comments) && (
              <div className="mt-4 space-y-2">
                <h3 className="text-xs font-medium text-gray-500 uppercase">Comments</h3>
                {crq.approvers.filter((a) => a.comments).map((a) => (
                  <div key={a.id} className="bg-yellow-50 rounded p-2 text-xs text-gray-700">
                    <strong>{a.approver?.full_name}:</strong> {a.comments}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Audit Trail</h2>
            <AuditTrail entries={entries} />
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/modules/change-management/components/AuditTrail.tsx src/modules/change-management/pages/CRQDetailPage.tsx
git commit -m "feat: add AuditTrail component and full CRQ Detail page"
```

---

### Task 30: PDF Print View

**Files:**
- Create: `src/modules/change-management/components/CRQPrintView.tsx`
- Modify: `src/index.css`

- [ ] **Step 1: Create `src/modules/change-management/components/CRQPrintView.tsx`**

```typescript
import { useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@shared/components/Button';
import type { CRQ, AuditEntry } from '@modules/change-management/types';

const KEY_ACTIONS = ['created','submitted','approved','in_implementation','completed'];

interface CRQPrintViewProps {
  crq: CRQ;
  auditEntries: AuditEntry[];
  onClose: () => void;
}

export function CRQPrintView({ crq, auditEntries, onClose }: CRQPrintViewProps) {
  useEffect(() => {
    document.title = `${crq.crq_number} - CRQ Export`;
    return () => { document.title = 'CRQ Manager'; };
  }, [crq.crq_number]);

  const milestones = auditEntries.filter((e) => KEY_ACTIONS.includes(e.action));
  const generatedDate = new Date().toLocaleString();

  return (
    <div>
      {/* Screen-only close button */}
      <div className="no-print fixed top-4 right-4 z-50 flex gap-2">
        <Button onClick={() => window.print()}>Print / Save PDF</Button>
        <Button variant="secondary" onClick={onClose}><X size={14} /> Close</Button>
      </div>

      <div className="print-area max-w-3xl mx-auto p-10 font-sans text-sm text-gray-900">
        {/* 1. Header */}
        <div className="flex items-start justify-between border-b-2 border-gray-900 pb-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Change Request</h1>
            <p className="text-gray-500 text-xs mt-1">Generated: {generatedDate}</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-mono font-bold">{crq.crq_number}</p>
          </div>
        </div>

        {/* 2. Project */}
        <section className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Project</h2>
          <p className="font-semibold">{crq.project?.name ?? '—'}</p>
          {crq.project?.owner && (
            <p className="text-gray-500 text-xs">Owner: {crq.project.owner.full_name} ({crq.project.owner.email})</p>
          )}
        </section>

        {/* 3. CRQ Details */}
        <section className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Change Request Details</h2>
          <table className="w-full border-collapse text-sm">
            <tbody>
              {[
                ['Title', crq.title],
                ['Status', crq.status.replace('_', ' ')],
                ['Priority', crq.priority],
                ['Description', crq.description],
              ].map(([label, value]) => (
                <tr key={label} className="border-t border-gray-200">
                  <td className="py-2 pr-4 font-medium text-gray-600 w-40 align-top">{label}</td>
                  <td className="py-2 text-gray-900 whitespace-pre-wrap">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* 4. Requestor Info */}
        <section className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Requestor Information</h2>
          <table className="w-full border-collapse text-sm">
            <tbody>
              {[
                ['Requested By', crq.requested_by],
                ['Requested Date', crq.requested_date],
                ['Authorized By', crq.authorized_by],
                ['Changes Effective From', crq.changes_effective_from],
              ].map(([label, value]) => (
                <tr key={label} className="border-t border-gray-200">
                  <td className="py-2 pr-4 font-medium text-gray-600 w-40">{label}</td>
                  <td className="py-2 text-gray-900">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* 5. Approvers */}
        <section className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Approvers</h2>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="py-2 px-3 text-left font-medium">Name</th>
                <th className="py-2 px-3 text-left font-medium">Decision</th>
                <th className="py-2 px-3 text-left font-medium">Date</th>
                <th className="py-2 px-3 text-left font-medium">Comments</th>
              </tr>
            </thead>
            <tbody>
              {(crq.approvers ?? []).map((a) => (
                <tr key={a.id} className="border-t border-gray-200">
                  <td className="py-2 px-3">{a.approver?.full_name ?? '—'}</td>
                  <td className="py-2 px-3 capitalize">{a.status}</td>
                  <td className="py-2 px-3">{a.actioned_at ? new Date(a.actioned_at).toLocaleDateString() : '—'}</td>
                  <td className="py-2 px-3 text-gray-600">{a.comments ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* 6. Audit Summary */}
        <section className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Key Milestones</h2>
          <table className="w-full border-collapse text-sm">
            <tbody>
              {milestones.map((e) => (
                <tr key={e.id} className="border-t border-gray-200">
                  <td className="py-2 pr-4 font-medium text-gray-600 w-40 capitalize">{e.action.replace('_', ' ')}</td>
                  <td className="py-2 text-gray-500">{new Date(e.created_at).toLocaleString()}</td>
                  <td className="py-2 text-gray-700">{e.actor?.full_name ?? 'System'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* 7. Footer */}
        <footer className="border-t border-gray-300 pt-4 mt-8 text-xs text-gray-400 text-center">
          This document was generated from CRQ Manager on {generatedDate}.
          Document reference: {crq.crq_number}
        </footer>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add print CSS to `src/index.css`**

Append to `src/index.css`:

```css
@media print {
  .no-print {
    display: none !important;
  }

  body {
    background: white;
    color: black;
    font-size: 12px;
  }

  .print-area {
    max-width: 100%;
    padding: 0;
  }

  @page {
    margin: 20mm;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/modules/change-management/components/CRQPrintView.tsx src/index.css
git commit -m "feat: add PDF print view with print CSS"
```

---

### Task 31: Dashboard Page

**Files:**
- Modify: `src/modules/change-management/pages/Dashboard.tsx`

- [ ] **Step 1: Implement role-aware dashboard**

```typescript
import { Link } from 'react-router-dom';
import { useAuth } from '@shared/auth/useAuth';
import { useCRQList } from '@modules/change-management/hooks/useCRQ';
import { StatusBadge } from '@shared/components/StatusBadge';
import { RoleGuard } from '@shared/roles/RoleGuard';

function SLACountdown({ deadline }: { deadline: string | null }) {
  if (!deadline) return <span className="text-gray-400 text-xs">No SLA</span>;
  const diff = new Date(deadline).getTime() - Date.now();
  const overdue = diff < 0;
  const hours = Math.abs(Math.floor(diff / 3600000));
  const minutes = Math.abs(Math.floor((diff % 3600000) / 60000));
  return (
    <span className={`text-xs font-medium ${overdue ? 'text-red-600' : hours < 4 ? 'text-orange-500' : 'text-gray-500'}`}>
      {overdue ? `${hours}h ${minutes}m overdue` : `${hours}h ${minutes}m left`}
    </span>
  );
}

export default function Dashboard() {
  const { profile } = useAuth();
  const { crqs: pendingApproval } = useCRQList({ status: ['pending_approval'] });
  const { crqs: inImpl } = useCRQList({ status: ['in_implementation'] });
  const { crqs: myDrafts } = useCRQList({ status: ['draft'] });

  const myPendingApproval = pendingApproval.filter((c) =>
    profile?.role === 'approver'
      ? c.approvers?.some((a) => a.approver_id === profile.id && a.status === 'pending')
      : c.requester_id === profile?.id
  );

  const myInImpl = inImpl.filter((c) => c.requester_id === profile?.id);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Welcome back, {profile?.full_name}</p>
      </div>

      {/* Requester: my drafts */}
      <RoleGuard allow={['requester', 'admin']}>
        {myDrafts.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">My Drafts</h2>
            <DashboardTable crqs={myDrafts} />
          </section>
        )}
      </RoleGuard>

      {/* Approver: pending my approval */}
      <RoleGuard allow={['approver', 'admin']}>
        {myPendingApproval.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Pending My Approval</h2>
            <DashboardTable crqs={myPendingApproval} showSLA />
          </section>
        )}
      </RoleGuard>

      {/* Requester: in implementation */}
      <RoleGuard allow={['requester', 'admin']}>
        {myInImpl.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">In Implementation</h2>
            <DashboardTable crqs={myInImpl} showSLA />
          </section>
        )}
      </RoleGuard>

      {/* Admin: all active */}
      <RoleGuard allow={['admin']}>
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">All Active CRQs</h2>
          <DashboardTable crqs={[...pendingApproval, ...inImpl]} showSLA />
        </section>
      </RoleGuard>
    </div>
  );
}

function DashboardTable({ crqs, showSLA = false }: { crqs: ReturnType<typeof useCRQList>['crqs']; showSLA?: boolean }) {
  if (crqs.length === 0) return <p className="text-sm text-gray-400">None.</p>;
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b">
          <tr>
            {['CRQ #', 'Title', 'Project', 'Status', ...(showSLA ? ['SLA'] : []), ''].map((h) => (
              <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {crqs.map((crq) => (
            <tr key={crq.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-mono text-xs text-gray-400">{crq.crq_number}</td>
              <td className="px-4 py-3 font-medium text-gray-900">{crq.title}</td>
              <td className="px-4 py-3 text-gray-500">{crq.project?.name ?? '—'}</td>
              <td className="px-4 py-3"><StatusBadge status={crq.status} /></td>
              {showSLA && <td className="px-4 py-3"><SLACountdown deadline={crq.sla_deadline} /></td>}
              <td className="px-4 py-3">
                <Link to={`/crqs/${crq.id}`} className="text-blue-600 hover:underline text-xs">View →</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/change-management/pages/Dashboard.tsx
git commit -m "feat: add role-aware Dashboard with SLA countdown"
```

---

### Task 32: Admin Pages

**Files:**
- Modify: `src/shared/users/UserManagementPage.tsx`
- Modify: `src/modules/change-management/pages/ProjectManagementPage.tsx`

- [ ] **Step 1: Implement `src/shared/users/UserManagementPage.tsx`**

```typescript
import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { useUsers } from './useUsers';
import { Button } from '@shared/components/Button';
import { Modal } from '@shared/components/Modal';
import type { UserRole } from '@shared/types';

export default function UserManagementPage() {
  const { users, loading, invite, changeRole, deactivate, reactivate } = useUsers();
  const [showInvite, setShowInvite] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('requester');
  const [saving, setSaving] = useState(false);

  async function handleInvite() {
    setSaving(true);
    try {
      await invite(email, name, role);
      setShowInvite(false);
      setEmail(''); setName(''); setRole('requester');
    } finally { setSaving(false); }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">User Management</h1>
        <Button onClick={() => setShowInvite(true)}><UserPlus size={14} /> Invite User</Button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? <div className="p-8 text-center text-gray-400">Loading…</div> : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Name', 'Email', 'Role', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.id} className={u.is_active ? '' : 'opacity-50'}>
                  <td className="px-4 py-3 font-medium">{u.full_name}</td>
                  <td className="px-4 py-3 text-gray-500">{u.email}</td>
                  <td className="px-4 py-3">
                    <select className="border border-gray-200 rounded px-2 py-1 text-xs"
                      value={u.role}
                      onChange={(e) => changeRole(u.id, e.target.value as UserRole)}>
                      <option value="requester">Requester</option>
                      <option value="approver">Approver</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {u.is_active
                      ? <Button variant="secondary" size="sm" onClick={() => deactivate(u.id)}>Deactivate</Button>
                      : <Button variant="ghost" size="sm" onClick={() => reactivate(u.id)}>Reactivate</Button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showInvite && (
        <Modal title="Invite User" onClose={() => setShowInvite(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
                <option value="requester">Requester</option>
                <option value="approver">Approver</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => setShowInvite(false)}>Cancel</Button>
              <Button onClick={handleInvite} disabled={!email || !name || saving}>
                {saving ? 'Sending…' : 'Send Invite'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Implement `src/modules/change-management/pages/ProjectManagementPage.tsx`**

```typescript
import { useState, useEffect } from 'react';
import { FolderPlus } from 'lucide-react';
import { Button } from '@shared/components/Button';
import { Modal } from '@shared/components/Modal';
import { listProjects, createProject, updateProject } from '@modules/change-management/services/projectService';
import type { Project } from '@shared/types';

export default function ProjectManagementPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try { setProjects(await listProjects(true)); } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate() {
    setSaving(true);
    try {
      await createProject({ name, description: description || null, owner_id: null });
      setShowCreate(false); setName(''); setDescription('');
      await load();
    } finally { setSaving(false); }
  }

  async function toggleActive(p: Project) {
    await updateProject(p.id, { is_active: !p.is_active });
    await load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Projects</h1>
        <Button onClick={() => setShowCreate(true)}><FolderPlus size={14} /> New Project</Button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? <div className="p-8 text-center text-gray-400">Loading…</div> : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Name', 'Description', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {projects.map((p) => (
                <tr key={p.id} className={p.is_active ? '' : 'opacity-50'}>
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-gray-500">{p.description ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {p.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Button variant="secondary" size="sm" onClick={() => toggleActive(p)}>
                      {p.is_active ? 'Deactivate' : 'Reactivate'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showCreate && (
        <Modal title="New Project" onClose={() => setShowCreate(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Project Name *</label>
              <input className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea rows={2} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={!name || saving}>
                {saving ? 'Creating…' : 'Create'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/shared/users/UserManagementPage.tsx src/modules/change-management/pages/ProjectManagementPage.tsx
git commit -m "feat: add User Management and Project Management admin pages"
```

---

**Phase 4 complete.** All UI pages and components are implemented. Proceed to Phase 5: Testing + Deployment.
