import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Users, FolderOpen, List, PlusCircle, LayoutDashboard } from 'lucide-react';
import { useAuth } from '@shared/auth/useAuth';
import { RoleGuard } from '@shared/access/RoleGuard';
import { Button } from './Button';

function NavLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  const { pathname } = useLocation();
  const active = pathname === to || (to !== '/' && pathname.startsWith(to));
  return (
    <Link
      to={to}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
        active
          ? 'bg-blue-50 text-blue-600'
          : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}

export function Navbar() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate('/login');
  }

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-14">
          {/* Logo + nav links */}
          <div className="flex items-center gap-1">
            <Link to="/" className="flex items-center gap-2 mr-4">
              <img src="/logo.png" alt="MSP²" className="h-8 w-auto" />
            </Link>
            <NavLink to="/" icon={<LayoutDashboard size={15} />} label="Dashboard" />
            <NavLink to="/crqs" icon={<List size={15} />} label="Change Requests" />
            <RoleGuard allow={['requester', 'admin']}>
              <NavLink to="/crqs/new" icon={<PlusCircle size={15} />} label="New CRQ" />
            </RoleGuard>
            <RoleGuard allow={['admin']}>
              <NavLink to="/admin/users" icon={<Users size={15} />} label="Users" />
              <NavLink to="/admin/projects" icon={<FolderOpen size={15} />} label="Projects" />
            </RoleGuard>
          </div>

          {/* User + sign out */}
          <div className="flex items-center gap-3">
            <Link to="/profile" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-800">{profile?.full_name}</p>
                <p className="text-xs text-gray-400 capitalize">{profile?.role}</p>
              </div>
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name}
                  className="h-8 w-8 rounded-full object-cover ring-2 ring-blue-100"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-bold">
                  {profile?.full_name?.[0]?.toUpperCase() ?? '?'}
                </div>
              )}
            </Link>
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-gray-500">
              <LogOut size={14} /> Sign out
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
