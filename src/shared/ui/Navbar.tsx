import { Link, useNavigate } from 'react-router-dom';
import { LogOut, Users, FolderOpen, List, PlusCircle, LayoutDashboard } from 'lucide-react';
import { useAuth } from '@shared/auth/useAuth';
import { RoleGuard } from '@shared/access/RoleGuard';
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
