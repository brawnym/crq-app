import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@shared/auth/ProtectedRoute';
import { Layout } from '@shared/ui/Layout';
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
        <Route path="*" element={<Navigate to="/" replace />} />
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
