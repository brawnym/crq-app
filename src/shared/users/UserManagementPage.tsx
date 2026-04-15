import { useState } from 'react';
import { useUsers } from './useUsers';
import type { UserRole } from '@shared/types';
import { Button } from '@shared/ui/Button';
import { Modal } from '@shared/ui/Modal';

export default function UserManagementPage() {
  const { users, loading, error, invite, changeRole, deactivate, reactivate } = useUsers();

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteFullName, setInviteFullName] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('requester');
  const [submitting, setSubmitting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [createdUser, setCreatedUser] = useState<{ email: string; tempPassword: string } | null>(null);

  function closeInviteModal() {
    setShowInviteModal(false);
    setInviteEmail('');
    setInviteFullName('');
    setInviteRole('requester');
    setInviteError(null);
  }

  async function handleInviteSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setInviteError(null);
    try {
      const { tempPassword } = await invite(inviteEmail, inviteFullName, inviteRole);
      setCreatedUser({ email: inviteEmail, tempPassword });
      closeInviteModal();
    } catch (err) {
      setInviteError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <Button variant="primary" onClick={() => setShowInviteModal(true)}>
          Invite User
        </Button>
      </div>

      {loading && <p>Loading...</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!loading && !error && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{user.full_name}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{user.email}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <select
                      value={user.role}
                      onChange={(e) => changeRole(user.id, e.target.value as UserRole)}
                      className="text-sm border border-gray-300 rounded px-2 py-1"
                    >
                      <option value="requester">requester</option>
                      <option value="approver">approver</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    {user.is_active ? (
                      <span className="text-green-700">Active</span>
                    ) : (
                      <span className="text-gray-500">Inactive</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {user.is_active ? (
                      <Button variant="danger" size="sm" onClick={() => deactivate(user.id)}>
                        Deactivate
                      </Button>
                    ) : (
                      <Button variant="secondary" size="sm" onClick={() => reactivate(user.id)}>
                        Reactivate
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showInviteModal && (
        <Modal title="Invite User" onClose={() => setShowInviteModal(false)}>
          <form onSubmit={handleInviteSubmit} className="space-y-4">
            <div>
              <label htmlFor="invite-email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="invite-full-name" className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input
                id="invite-full-name"
                type="text"
                value={inviteFullName}
                onChange={(e) => setInviteFullName(e.target.value)}
                required
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="invite-role" className="block text-sm font-medium text-gray-700 mb-1">
                Role
              </label>
              <select
                id="invite-role"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as UserRole)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              >
                <option value="requester">requester</option>
                <option value="approver">approver</option>
                <option value="admin">admin</option>
              </select>
            </div>
            {inviteError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{inviteError}</p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={closeInviteModal}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={submitting}>
                {submitting ? 'Creating…' : 'Send Invite'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {createdUser && (
        <Modal title="User Created" onClose={() => setCreatedUser(null)}>
          <div className="space-y-4">
            <p className="text-sm text-gray-700">
              The account for <strong>{createdUser.email}</strong> has been created.
              Share the following temporary credentials with the user — they should change their password after first login.
            </p>
            <div className="bg-gray-50 border border-gray-200 rounded-md p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Email</span>
                <span className="font-mono font-medium text-gray-900">{createdUser.email}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Temporary Password</span>
                <span className="font-mono font-medium text-gray-900 select-all">{createdUser.tempPassword}</span>
              </div>
            </div>
            {/* PRODUCTION: uncomment the block below when email confirmation is re-enabled in Supabase
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
              The user will receive a confirmation email. They must click the confirmation link before
              they can log in with the temporary password.
            </p>
            */}
            <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
              The user can log in immediately with these credentials. Ask them to update their password via their Profile page after first login.
            </p>
            <div className="flex justify-end">
              <Button onClick={() => setCreatedUser(null)}>Done</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
