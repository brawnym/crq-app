# CRQ App — Phase 1: Folder + Architecture

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the CRQ application with correct folder structure, dependencies, Vitest, Supabase client, core TypeScript types, and a working router skeleton.

**Architecture:** New Vite + React + TypeScript app at `crq-app/` inside the workspace. Monorepo-style folder split between `src/shared/` (shared auth, users, roles, components) and `src/modules/change-management/` (CRQ feature). Supabase handles all data and auth.

**Tech Stack:** React 19, TypeScript 5, Vite 6, Supabase JS v2, React Router v7, Lucide React, Vitest, React Testing Library

---

## File Map

| File | Purpose |
|---|---|
| `crq-app/package.json` | Dependencies |
| `crq-app/vite.config.ts` | Vite + Vitest config |
| `crq-app/tsconfig.json` | TypeScript config |
| `crq-app/.env.example` | Env var template |
| `crq-app/src/main.tsx` | App entry point |
| `crq-app/src/App.tsx` | Router root |
| `crq-app/src/shared/auth/supabaseClient.ts` | Supabase client singleton |
| `crq-app/src/shared/types/index.ts` | Shared types: User, Project |
| `crq-app/src/modules/change-management/types/index.ts` | CRQ-specific types |
| `crq-app/src/test/setup.ts` | Vitest global setup |

---

### Task 1: Scaffold Vite Project

**Files:**
- Create: `crq-app/` (new project directory)

- [ ] **Step 1: Create project via Vite**

```bash
cd "D:/antigravity home"
npm create vite@latest crq-app -- --template react-ts
cd crq-app
```

Expected output: `Scaffolding project in .../crq-app/`

- [ ] **Step 2: Verify scaffold**

```bash
ls src/
```

Expected: `App.css  App.tsx  assets/  index.css  main.tsx  vite-env.d.ts`

- [ ] **Step 3: Install core dependencies**

```bash
npm install @supabase/supabase-js react-router-dom lucide-react
```

- [ ] **Step 4: Install dev dependencies**

```bash
npm install -D vitest @vitest/coverage-v8 @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: scaffold crq-app with Vite + React + TypeScript"
```

---

### Task 2: Configure Vite + Vitest

**Files:**
- Modify: `crq-app/vite.config.ts`
- Create: `crq-app/src/test/setup.ts`

- [ ] **Step 1: Write failing test to confirm Vitest not yet configured**

Create `crq-app/src/test/smoke.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';

describe('smoke', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 2: Run test — expect failure (no config yet)**

```bash
cd "D:/antigravity home/crq-app"
npx vitest run
```

Expected: Error about missing config or test environment

- [ ] **Step 3: Write `vite.config.ts`**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
  },
});
```

- [ ] **Step 4: Write `src/test/setup.ts`**

```typescript
import '@testing-library/jest-dom';
```

- [ ] **Step 5: Run test — expect pass**

```bash
npx vitest run
```

Expected: `✓ src/test/smoke.test.ts (1 test) 1ms`

- [ ] **Step 6: Add test script to `package.json`**

In `crq-app/package.json`, add under `"scripts"`:

```json
"test": "vitest run",
"test:watch": "vitest",
"test:coverage": "vitest run --coverage"
```

- [ ] **Step 7: Commit**

```bash
git add vite.config.ts src/test/setup.ts src/test/smoke.test.ts package.json
git commit -m "feat: configure Vitest with jsdom and React Testing Library"
```

---

### Task 3: TypeScript Config

**Files:**
- Modify: `crq-app/tsconfig.json`

- [ ] **Step 1: Update `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@shared/*": ["src/shared/*"],
      "@modules/*": ["src/modules/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 2: Update `vite.config.ts` to resolve path aliases**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared'),
      '@modules': resolve(__dirname, 'src/modules'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
  },
});
```

- [ ] **Step 3: Run type check**

```bash
npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add tsconfig.json vite.config.ts
git commit -m "feat: configure TypeScript path aliases"
```

---

### Task 4: Environment Variables

**Files:**
- Create: `crq-app/.env.example`
- Create: `crq-app/.env.local` (not committed)

- [ ] **Step 1: Create `.env.example`**

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_APP_URL=http://localhost:5173
```

- [ ] **Step 2: Create `.env.local` with real values**

Copy `.env.example` to `.env.local` and fill in your Supabase project URL and anon key from the Supabase dashboard (Settings → API).

- [ ] **Step 3: Ensure `.env.local` is gitignored**

Check `crq-app/.gitignore` contains:
```
.env.local
.env*.local
```

If missing, add those lines.

- [ ] **Step 4: Commit**

```bash
git add .env.example .gitignore
git commit -m "feat: add env var template"
```

---

### Task 5: Supabase Client Singleton

**Files:**
- Create: `crq-app/src/shared/auth/supabaseClient.ts`
- Create: `crq-app/src/shared/auth/supabaseClient.test.ts`

- [ ] **Step 1: Write failing test**

Create `crq-app/src/shared/auth/supabaseClient.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { supabase } from './supabaseClient';

describe('supabaseClient', () => {
  it('exports a supabase client instance', () => {
    expect(supabase).toBeDefined();
    expect(typeof supabase.from).toBe('function');
    expect(typeof supabase.auth.signInWithPassword).toBe('function');
  });
});
```

- [ ] **Step 2: Run test — expect failure**

```bash
npx vitest run src/shared/auth/supabaseClient.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: Create `supabaseClient.ts`**

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

- [ ] **Step 4: Run test — expect pass**

```bash
npx vitest run src/shared/auth/supabaseClient.test.ts
```

Expected: ✓ 1 test passed

- [ ] **Step 5: Commit**

```bash
git add src/shared/auth/supabaseClient.ts src/shared/auth/supabaseClient.test.ts
git commit -m "feat: add Supabase client singleton"
```

---

### Task 6: Core Shared Types

**Files:**
- Create: `crq-app/src/shared/types/index.ts`
- Create: `crq-app/src/shared/types/index.test.ts`

- [ ] **Step 1: Write type shape test**

Create `crq-app/src/shared/types/index.test.ts`:

```typescript
import { describe, it, expectTypeOf } from 'vitest';
import type { User, Project, UserRole } from './index';

describe('core types', () => {
  it('User has required fields', () => {
    expectTypeOf<User>().toHaveProperty('id');
    expectTypeOf<User>().toHaveProperty('role');
    expectTypeOf<User>().toHaveProperty('is_active');
  });

  it('UserRole is a union of valid roles', () => {
    const role: UserRole = 'admin';
    expectTypeOf(role).toEqualTypeOf<UserRole>();
  });

  it('Project has required fields', () => {
    expectTypeOf<Project>().toHaveProperty('id');
    expectTypeOf<Project>().toHaveProperty('name');
    expectTypeOf<Project>().toHaveProperty('owner_id');
  });
});
```

- [ ] **Step 2: Run test — expect failure**

```bash
npx vitest run src/shared/types/index.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: Create `src/shared/types/index.ts`**

```typescript
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
```

- [ ] **Step 4: Run test — expect pass**

```bash
npx vitest run src/shared/types/index.test.ts
```

Expected: ✓ 3 tests passed

- [ ] **Step 5: Commit**

```bash
git add src/shared/types/index.ts src/shared/types/index.test.ts
git commit -m "feat: add core shared types (User, Project)"
```

---

### Task 7: CRQ Module Types

**Files:**
- Create: `crq-app/src/modules/change-management/types/index.ts`
- Create: `crq-app/src/modules/change-management/types/index.test.ts`

- [ ] **Step 1: Write type shape test**

Create `crq-app/src/modules/change-management/types/index.test.ts`:

```typescript
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
});
```

- [ ] **Step 2: Run test — expect failure**

```bash
npx vitest run src/modules/change-management/types/index.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: Create `src/modules/change-management/types/index.ts`**

```typescript
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
  requested_date: string;       // ISO date string
  authorized_by: string;
  changes_effective_from: string; // ISO date string
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
```

- [ ] **Step 4: Run test — expect pass**

```bash
npx vitest run src/modules/change-management/types/index.test.ts
```

Expected: ✓ 3 tests passed

- [ ] **Step 5: Commit**

```bash
git add src/modules/change-management/types/index.ts src/modules/change-management/types/index.test.ts
git commit -m "feat: add CRQ module types"
```

---

### Task 8: App Router Skeleton

**Files:**
- Modify: `crq-app/src/App.tsx`
- Modify: `crq-app/src/main.tsx`
- Create: `crq-app/src/modules/change-management/pages/Dashboard.tsx` (stub)
- Create: `crq-app/src/modules/change-management/pages/CRQListPage.tsx` (stub)
- Create: `crq-app/src/modules/change-management/pages/CRQCreatePage.tsx` (stub)
- Create: `crq-app/src/modules/change-management/pages/CRQDetailPage.tsx` (stub)
- Create: `crq-app/src/modules/change-management/pages/CRQEditPage.tsx` (stub)
- Create: `crq-app/src/shared/users/UserManagementPage.tsx` (stub)
- Create: `crq-app/src/modules/change-management/pages/ProjectManagementPage.tsx` (stub)

- [ ] **Step 1: Create stub pages**

Each stub page below follows the same pattern. Create all of them:

`src/modules/change-management/pages/Dashboard.tsx`:
```typescript
export default function Dashboard() {
  return <div data-testid="dashboard">Dashboard</div>;
}
```

`src/modules/change-management/pages/CRQListPage.tsx`:
```typescript
export default function CRQListPage() {
  return <div data-testid="crq-list">CRQ List</div>;
}
```

`src/modules/change-management/pages/CRQCreatePage.tsx`:
```typescript
export default function CRQCreatePage() {
  return <div data-testid="crq-create">Create CRQ</div>;
}
```

`src/modules/change-management/pages/CRQDetailPage.tsx`:
```typescript
export default function CRQDetailPage() {
  return <div data-testid="crq-detail">CRQ Detail</div>;
}
```

`src/modules/change-management/pages/CRQEditPage.tsx`:
```typescript
export default function CRQEditPage() {
  return <div data-testid="crq-edit">Edit CRQ</div>;
}
```

`src/shared/users/UserManagementPage.tsx`:
```typescript
export default function UserManagementPage() {
  return <div data-testid="user-management">User Management</div>;
}
```

`src/modules/change-management/pages/ProjectManagementPage.tsx`:
```typescript
export default function ProjectManagementPage() {
  return <div data-testid="project-management">Project Management</div>;
}
```

- [ ] **Step 2: Write router test**

Create `src/App.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

describe('App router', () => {
  it('renders dashboard at /', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByTestId('dashboard')).toBeInTheDocument();
  });

  it('renders crq list at /crqs', () => {
    render(
      <MemoryRouter initialEntries={['/crqs']}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByTestId('crq-list')).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run test — expect failure**

```bash
npx vitest run src/App.test.tsx
```

Expected: FAIL

- [ ] **Step 4: Write `src/App.tsx`**

```typescript
import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from '@modules/change-management/pages/Dashboard';
import CRQListPage from '@modules/change-management/pages/CRQListPage';
import CRQCreatePage from '@modules/change-management/pages/CRQCreatePage';
import CRQDetailPage from '@modules/change-management/pages/CRQDetailPage';
import CRQEditPage from '@modules/change-management/pages/CRQEditPage';
import UserManagementPage from '@shared/users/UserManagementPage';
import ProjectManagementPage from '@modules/change-management/pages/ProjectManagementPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/crqs" element={<CRQListPage />} />
      <Route path="/crqs/new" element={<CRQCreatePage />} />
      <Route path="/crqs/:id" element={<CRQDetailPage />} />
      <Route path="/crqs/:id/edit" element={<CRQEditPage />} />
      <Route path="/admin/users" element={<UserManagementPage />} />
      <Route path="/admin/projects" element={<ProjectManagementPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
```

- [ ] **Step 5: Write `src/main.tsx`**

```typescript
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
```

- [ ] **Step 6: Run test — expect pass**

```bash
npx vitest run src/App.test.tsx
```

Expected: ✓ 2 tests passed

- [ ] **Step 7: Run dev server and verify**

```bash
npm run dev
```

Open http://localhost:5173 — should render "Dashboard" text.

- [ ] **Step 8: Commit**

```bash
git add src/
git commit -m "feat: add app router skeleton with stub pages"
```

---

**Phase 1 complete.** Proceed to Phase 2: Backend (Supabase schema, RLS, Edge Functions).
