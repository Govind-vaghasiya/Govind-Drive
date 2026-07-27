import React, { useState, useEffect } from 'react';
import { UserPlus, X, Check, Copy, Shield, Trash2, KeyRound, RefreshCw } from 'lucide-react';
import { UserProfile, pb, hashPassword } from '../lib/pocketbase';
import { createUserDiskFolder } from '../lib/serverApi';

interface AdminUserModalProps {
  onClose: () => void;
  currentUser: UserProfile;
}

export default function AdminUserModal({ onClose, currentUser }: AdminUserModalProps) {
  // ── Create-user form state
  const [email, setEmail]       = useState('');
  const [name, setName]         = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole]         = useState<'user' | 'admin'>('user');
  const [successMsg, setSuccessMsg] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  // ── Reset-password inline state
  const [resetUserId, setResetUserId]   = useState<string | null>(null);
  const [resetPwd, setResetPwd]         = useState('');
  const [resetError, setResetError]     = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  // ── User list — auto-purge dummy/demo users on first load
  const DUMMY_IDS = new Set(['u1', 'u2']);
  const isDummyUser = (u: UserProfile) =>
    DUMMY_IDS.has(u.id) || u.email.endsWith('@example.com');

  const [invitedUsers, setInvitedUsers] = useState<UserProfile[]>(() => {
    const saved = localStorage.getItem('govind_drive_invited_users');
    if (saved) {
      try {
        const parsed: UserProfile[] = JSON.parse(saved);
        return parsed.filter((u) => !isDummyUser(u)); // strip legacy dummy users
      } catch {}
    }
    return []; // start clean
  });

  // Save to localStorage on change
  useEffect(() => {
    localStorage.setItem('govind_drive_invited_users', JSON.stringify(invitedUsers));
  }, [invitedUsers]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    // Validate minimum password length
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      setLoading(false);
      return;
    }

    // Generate a stable, immutable user ID
    const userId = `u_${Date.now()}`;
    const folderId = userId.replace(/[^a-z0-9_-]/g, '_').replace(/_+/g, '_');

    // Hash the password before storing — never store plain text passwords
    const passwordHash = await hashPassword(password);

    const newUser: UserProfile = {
      id: userId,
      email: email.trim(),
      name: name.trim(),
      role,
      created: 'Just now',
      folderId,
      passwordHash, // Stored hashed — compared on login via hashPassword()
    };

    // Pass admin's own userId so server can verify admin privileges
    const adminUserId = currentUser.folderId || currentUser.email.toLowerCase().replace(/[^a-z0-9]/g, '_');
    await createUserDiskFolder(email.trim(), folderId, adminUserId);

    try {
      await pb.collection('users').create({
        email: email.trim(),
        password,
        passwordConfirm: password,
        name: name.trim(),
        role,
      });
    } catch (err) {
      console.warn('PocketBase offline demo fallback:', err);
    } finally {
    setInvitedUsers((prev) => [newUser, ...prev.filter((u) => u.email !== newUser.email)]);
      setSuccessMsg(`✓ Account created — ${email.trim()} / ${password}`);
      setEmail('');
      setName('');
      setPassword('');
      setLoading(false);
    }
  };

  const handleDeleteUser = (id: string) => {
    setInvitedUsers((prev) => prev.filter((u) => u.id !== id));
    if (resetUserId === id) setResetUserId(null);
  };

  const handleToggleRole = (id: string) => {
    setInvitedUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, role: u.role === 'admin' ? 'user' : 'admin' } : u))
    );
  };

  // ── Reset password
  const openReset = (id: string) => {
    setResetUserId(id);
    setResetPwd('');
    setResetError('');
    setResetSuccess('');
  };

  const handleResetPassword = async (userId: string) => {
    setResetError('');
    if (resetPwd.length < 6) { setResetError('Password must be at least 6 characters.'); return; }
    setResetLoading(true);
    const passwordHash = await hashPassword(resetPwd);
    setInvitedUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, passwordHash } : u))
    );
    setResetSuccess('Password updated!');
    setResetLoading(false);
    setTimeout(() => { setResetUserId(null); setResetPwd(''); setResetSuccess(''); }, 1400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm px-4 select-none">
      <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl transition-all border border-gray-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Invite & Manage Users</h3>
              <p className="text-xs text-gray-500">Create accounts, assign roles & control access</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* User Creation Form */}
        <div className="mt-4">
          {successMsg && (
            <div className="mb-4 flex items-center justify-between rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-800 border border-emerald-200">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 shrink-0 text-emerald-600" />
                <span className="break-all">{successMsg}</span>
              </div>
              <button
                onClick={() => navigator.clipboard.writeText(successMsg)}
                className="flex items-center gap-1 rounded-lg bg-emerald-100 px-2 py-1 text-[10px] text-emerald-900 hover:bg-emerald-200 shrink-0 ml-2"
              >
                <Copy className="h-3 w-3" /> Copy
              </button>
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleCreateUser} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jasmin Vaghasiya"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2 text-xs text-gray-900 outline-none transition focus:border-blue-500 focus:bg-white font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'user' | 'admin')}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2 text-xs text-gray-900 outline-none transition focus:border-blue-500 focus:bg-white font-medium"
                >
                  <option value="user">User (Standard)</option>
                  <option value="admin">Admin (Full Access)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2 text-xs text-gray-900 outline-none transition focus:border-blue-500 focus:bg-white font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 chars"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2 text-xs text-gray-900 outline-none transition focus:border-blue-500 focus:bg-white font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-xs font-semibold text-white shadow-md shadow-blue-500/20 transition hover:bg-blue-700 active:scale-95"
            >
              <UserPlus className="h-4 w-4" />
              {loading ? 'Creating Account...' : 'Create Account & Grant Access'}
            </button>
          </form>

          {/* Active Accounts & User Management List */}
          <div className="mt-5 border-t border-gray-100 pt-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
            User Accounts ({invitedUsers.length + 1})
            </h4>
            <div className="max-h-48 overflow-y-auto divide-y divide-gray-50">
              {/* Logged in Admin */}
              <div className="flex items-center justify-between py-2 px-1">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white shadow-xs shrink-0">
                    {currentUser.avatar ? (
                      <img src={currentUser.avatar} alt={currentUser.name} className="h-full w-full object-cover rounded-full" />
                    ) : (
                      currentUser.name.substring(0, 2).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-900 truncate">{currentUser.name} (You)</p>
                    <p className="text-[10px] text-gray-500 truncate">{currentUser.email}</p>
                  </div>
                </div>
                <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-blue-700 shrink-0">
                  Admin
                </span>
              </div>

              {/* Invited Users */}
              {invitedUsers.length === 0 && (
                <p className="py-6 text-center text-xs text-gray-400">No other users yet. Create one above.</p>
              )}

              {invitedUsers.map((u) => (
                <div key={u.id} className="py-2 px-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-xs font-bold text-gray-700 shrink-0">
                        {u.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-gray-900 truncate">{u.name}</p>
                        <p className="text-[10px] text-gray-500 truncate">{u.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleToggleRole(u.id)}
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold transition ${
                          u.role === 'admin'
                            ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                        title="Click to toggle role"
                      >
                        {u.role === 'admin' ? 'Admin' : 'User'}
                      </button>

                      {/* Reset password button */}
                      <button
                        onClick={() => resetUserId === u.id ? setResetUserId(null) : openReset(u.id)}
                        className={`rounded-full p-1 transition ${
                          resetUserId === u.id
                            ? 'bg-amber-100 text-amber-600'
                            : 'text-gray-400 hover:bg-amber-50 hover:text-amber-500'
                        }`}
                        title="Reset password"
                      >
                        <KeyRound className="h-3.5 w-3.5" />
                      </button>

                      <button
                        onClick={() => handleDeleteUser(u.id)}
                        className="rounded-full p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 transition"
                        title="Revoke access"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Inline reset-password panel */}
                  {resetUserId === u.id && (
                    <div className="mt-2 ml-10 rounded-xl bg-amber-50 border border-amber-200 p-3">
                      <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider mb-2">
                        🔑 Reset Password for {u.name}
                      </p>
                      {resetError && <p className="text-[10px] text-red-600 mb-1.5">{resetError}</p>}
                      {resetSuccess && (
                        <p className="text-[10px] text-emerald-600 font-bold mb-1.5 flex items-center gap-1">
                          <Check className="h-3 w-3" /> {resetSuccess}
                        </p>
                      )}
                      <div className="flex gap-2">
                        <input
                          type="password"
                          value={resetPwd}
                          onChange={(e) => setResetPwd(e.target.value)}
                          placeholder="New password (min. 6 chars)"
                          className="flex-1 rounded-lg border border-amber-200 bg-white px-2.5 py-1.5 text-xs text-gray-900 outline-none focus:border-amber-400"
                          onKeyDown={(e) => e.key === 'Enter' && handleResetPassword(u.id)}
                          autoFocus
                        />
                        <button
                          onClick={() => handleResetPassword(u.id)}
                          disabled={resetLoading}
                          className="flex items-center gap-1 rounded-lg bg-amber-500 px-3 py-1.5 text-[10px] font-bold text-white hover:bg-amber-600 transition disabled:opacity-50"
                        >
                          <RefreshCw className="h-3 w-3" /> Set
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
