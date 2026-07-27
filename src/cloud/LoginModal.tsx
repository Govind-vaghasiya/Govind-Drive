import React, { useState } from 'react';
import { Lock, Mail, ShieldAlert, UserCheck, KeyRound, ArrowLeft, RefreshCw } from 'lucide-react';
import { UserProfile, pb, hashPassword } from '../lib/pocketbase';

interface LoginModalProps {
  onLoginSuccess: (user: UserProfile) => void;
}

export default function LoginModal({ onLoginSuccess }: LoginModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Forgot-password view state
  const [showForgot, setShowForgot]   = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotPwd, setForgotPwd]     = useState('');
  const [forgotConfirm, setForgotConfirm] = useState('');
  const [forgotMsg, setForgotMsg]     = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // --- Primary auth: PocketBase ---
      const authData = await pb.collection('users').authWithPassword(email, password);
      const record = authData.record;
      const userProfile: UserProfile = {
        id: record.id,
        email: record.email,
        name: record.name || record.email.split('@')[0],
        role: record.role || 'user',
        avatar: record.avatar,
      };
      onLoginSuccess(userProfile);
    } catch {
      // --- Fallback: localStorage invited users (with password hash check) ---
      const savedInvited = localStorage.getItem('govind_drive_invited_users');
      const invitedList: UserProfile[] = savedInvited ? JSON.parse(savedInvited) : [];
      const matchedUser = invitedList.find(
        (u) => u.email.toLowerCase() === email.toLowerCase()
      );

      if (matchedUser) {
        const storedHash = matchedUser.passwordHash;
        if (!storedHash) {
          // No hash stored — account predates hashing; require admin to reset password
          setError('This account needs a password reset. Ask your admin to recreate it.');
          setLoading(false);
          return;
        }
        const inputHash = await hashPassword(password);
        if (inputHash !== storedHash) {
          setError('Invalid credentials. Please check your email and password.');
          setLoading(false);
          return;
        }
        onLoginSuccess(matchedUser);
        return;
      }

      // --- Hardcoded admin fallback (local dev / offline mode) ---
      if (
        email === 'govind@drive.govindvaghasiya.ca' &&
        password === 'Govind@2311'
      ) {
        onLoginSuccess({
          id: 'admin_demo',
          email: 'govind@drive.govindvaghasiya.ca',
          name: 'Govind (Admin)',
          role: 'admin',
        });
      } else {
        setError('Invalid credentials. Please check your email and password.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Forgot-password handler ────────────────────────────────────────────────
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotMsg(null);
    if (forgotPwd !== forgotConfirm) {
      setForgotMsg({ type: 'err', text: 'Passwords do not match.' });
      return;
    }
    if (forgotPwd.length < 6) {
      setForgotMsg({ type: 'err', text: 'Password must be at least 6 characters.' });
      return;
    }
    setForgotLoading(true);

    const savedInvited = localStorage.getItem('govind_drive_invited_users');
    const invitedList: UserProfile[] = savedInvited ? JSON.parse(savedInvited) : [];
    const idx = invitedList.findIndex(
      (u) => u.email.toLowerCase() === forgotEmail.toLowerCase()
    );

    if (idx === -1) {
      setForgotMsg({
        type: 'err',
        text: 'Email not found. Contact your admin to create or reset your account.',
      });
      setForgotLoading(false);
      return;
    }

    const passwordHash = await hashPassword(forgotPwd);
    invitedList[idx] = { ...invitedList[idx], passwordHash };
    localStorage.setItem('govind_drive_invited_users', JSON.stringify(invitedList));
    setForgotMsg({ type: 'ok', text: 'Password updated! You can now sign in with your new password.' });
    setForgotLoading(false);
    setTimeout(() => {
      setShowForgot(false);
      setEmail(forgotEmail);
      setForgotEmail('');
      setForgotPwd('');
      setForgotConfirm('');
      setForgotMsg(null);
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white p-8 shadow-2xl transition-all">

        {/* ── FORGOT PASSWORD VIEW ─────────────────────────────────── */}
        {showForgot ? (
          <>
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={() => { setShowForgot(false); setForgotMsg(null); }}
                className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 transition"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div>
                <h2 className="text-base font-bold text-gray-900">Reset Password</h2>
                <p className="text-xs text-gray-500">Enter your email and choose a new password</p>
              </div>
            </div>

            {forgotMsg && (
              <div className={`mb-4 flex items-center gap-2 rounded-xl p-3 text-xs font-medium ${
                forgotMsg.type === 'ok'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-red-50 text-red-700'
              }`}>
                <ShieldAlert className="h-4 w-4 shrink-0" />
                <span>{forgotMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleForgotSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email" required value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="Your account email"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">New Password</label>
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="password" required value={forgotPwd}
                    onChange={(e) => setForgotPwd(e.target.value)}
                    placeholder="Min. 6 characters"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Confirm Password</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="password" required value={forgotConfirm}
                    onChange={(e) => setForgotConfirm(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <button
                type="submit" disabled={forgotLoading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 text-sm font-semibold text-white shadow-lg shadow-amber-400/30 transition hover:bg-amber-600 active:scale-[0.98] disabled:opacity-50"
              >
                <RefreshCw className="h-4 w-4" />
                {forgotLoading ? 'Updating...' : 'Set New Password'}
              </button>
            </form>
          </>
        ) : (

        /* ── SIGN IN VIEW ──────────────────────────────────────────── */
        <>
          {/* Header */}
          <div className="text-center">
            <div className="mx-auto mb-3 flex items-center justify-center">
              <img src="/Govind%20Drive%20Logo%20Small%202.png" alt="Govind Drive" className="h-12 w-auto object-contain select-none" />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Private Home Server Drive • <span className="font-semibold text-blue-600">Invite Only</span>
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs font-medium text-red-700">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Sign-in Form */}
          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Email Address</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="email" required value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="govind@drive.govindvaghasiya.ca"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Password</label>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="password" required value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50"
            >
              <UserCheck className="h-4 w-4" />
              {loading ? 'Authenticating...' : 'Sign In to Drive'}
            </button>
          </form>

          {/* Forgot Password link */}
          <div className="mt-4 text-center">
            <button
              onClick={() => { setShowForgot(true); setError(''); setForgotEmail(email); }}
              className="text-xs text-gray-400 hover:text-blue-600 transition underline underline-offset-2"
            >
              Forgot password?
            </button>
          </div>
        </>
        )}
      </div>
    </div>
  );
}
