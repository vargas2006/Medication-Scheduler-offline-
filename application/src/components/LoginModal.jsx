import React, { useState } from 'react';
import { Lock, Mail, User, AlertCircle, CheckCircle, ArrowLeft, KeyRound, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { callApi } from '../utils/pywebview';

export default function LoginModal({ onLoginSuccess }) {
  // viewMode: 'auth' | 'forgot_request' | 'forgot_verify'
  const [viewMode, setViewMode] = useState('auth');
  const [isRegister, setIsRegister] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Forgot password states
  const [resetIdent, setResetIdent] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [message, setMessage] = useState({ text: '', isError: false });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ text: '', isError: false });
    setLoading(true);

    try {
      if (isRegister) {
        const res = await callApi('register', name, identifier, password);
        if (res.success) {
          setMessage({ text: res.message || 'Account created! Please sign in.', isError: false });
          setIsRegister(false);
        } else {
          setMessage({ text: res.message || 'Registration failed.', isError: true });
        }
      } else {
        const res = await callApi('login', identifier, password);
        if (res.success) {
          if (rememberMe) {
            const expiry = Date.now() + 30 * 24 * 60 * 60 * 1000;
            localStorage.setItem('med_user_session', JSON.stringify({ user: res.user, expiry }));
            try {
              await callApi('save_remember_session', res.user.user_id);
            } catch (e) {
              console.error('Failed saving SQLite remember session:', e);
            }
          } else {
            localStorage.removeItem('med_user_session');
          }
          onLoginSuccess(res.user);
        } else {
          setMessage({ text: res.message || 'Invalid username/password.', isError: true });
        }
      }
    } catch (err) {
      setMessage({ text: 'Error connecting to application service.', isError: true });
    } finally {
      setLoading(false);
    }
  };

  const handleRequestReset = async (e) => {
    e.preventDefault();
    if (!resetIdent.trim()) {
      setMessage({ text: 'Please enter your username or registered email.', isError: true });
      return;
    }
    setMessage({ text: '', isError: false });
    setLoading(true);

    try {
      const res = await callApi('request_password_reset', resetIdent);
      if (res.success) {
        setResetEmail(res.email);
        setViewMode('forgot_verify');
        setMessage({ text: res.message || 'Verification code sent to your email address!', isError: false });
      } else {
        setMessage({ text: res.message || 'Failed to send verification code.', isError: true });
      }
    } catch (err) {
      setMessage({ text: 'Error requesting password reset.', isError: true });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyReset = async (e) => {
    e.preventDefault();
    if (!otpCode || !newPassword || !confirmPassword) {
      setMessage({ text: 'Please fill in all fields.', isError: true });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ text: 'New passwords do not match.', isError: true });
      return;
    }
    if (newPassword.length < 4) {
      setMessage({ text: 'Password must be at least 4 characters long.', isError: true });
      return;
    }

    setMessage({ text: '', isError: false });
    setLoading(true);

    try {
      const res = await callApi('verify_and_reset_password', resetEmail, otpCode, newPassword);
      if (res.success) {
        setViewMode('auth');
        setIsRegister(false);
        setOtpCode('');
        setNewPassword('');
        setConfirmPassword('');
        setMessage({ text: res.message || 'Password updated successfully! Please sign in.', isError: false });
      } else {
        setMessage({ text: res.message || 'Invalid code or password reset failed.', isError: true });
      }
    } catch (err) {
      setMessage({ text: 'Error verifying code.', isError: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0f172a]/60 backdrop-blur-2xs flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-md bg-white dark:bg-[#1e293b] border border-[#d9e0e8] dark:border-[#334155] rounded-lg p-6 shadow-lg space-y-5">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center">
          <img
            src="/app_icon.png"
            alt="MedScheduler Logo"
            className="w-12 h-12 object-contain mb-2"
          />
          <h2 className="text-xl font-bold text-[#172033] dark:text-slate-100 tracking-tight">
            Smart Medication Scheduler
          </h2>
          <p className="text-xs text-[#64748b] dark:text-slate-400 mt-0.5 font-normal">
            Healthcare &amp; Inventory Management System
          </p>
        </div>

        {/* --- VIEW MODE 1: SIGN IN / CREATE ACCOUNT --- */}
        {viewMode === 'auth' && (
          <>
            {/* Tab switch */}
            <div className="grid grid-cols-2 bg-[#f8fafc] dark:bg-[#0f172a] border border-[#d9e0e8] dark:border-[#334155] p-1 rounded-md text-xs">
              <button
                type="button"
                onClick={() => { setIsRegister(false); setMessage({ text: '', isError: false }); }}
                className={`py-1.5 font-medium rounded transition-colors ${
                  !isRegister ? 'bg-[#2563eb] text-white font-semibold' : 'text-[#64748b] dark:text-slate-400 hover:text-[#172033]'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setIsRegister(true); setMessage({ text: '', isError: false }); }}
                className={`py-1.5 font-medium rounded transition-colors ${
                  isRegister ? 'bg-[#2563eb] text-white font-semibold' : 'text-[#64748b] dark:text-slate-400 hover:text-[#172033]'
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Alert message */}
            {message.text && (
              <div className={`p-3 rounded-md flex items-center gap-2 text-xs font-medium ${
                message.isError ? 'bg-[#fee2e2] text-[#b91c1c] border border-rose-200' : 'bg-[#d1fae5] text-[#047857] border border-emerald-200'
              }`}>
                {message.isError ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle className="w-4 h-4 shrink-0" />}
                <span>{message.text}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              {isRegister && (
                <div>
                  <label className="block font-medium text-[#172033] dark:text-slate-200 mb-1">Full Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-[#64748b] dark:text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rene Baterbonia"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-[#f8fafc] dark:bg-[#0f172a] border border-[#d9e0e8] dark:border-[#334155] rounded-md pl-9 pr-3 py-2 text-xs text-[#172033] dark:text-slate-100 focus:outline-none focus:border-[#2563eb]"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block font-medium text-[#172033] dark:text-slate-200 mb-1">
                  Email / Username
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#64748b] dark:text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    placeholder="name@gmail.com"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="w-full bg-[#f8fafc] dark:bg-[#0f172a] border border-[#d9e0e8] dark:border-[#334155] rounded-md pl-9 pr-3 py-2 text-xs text-[#172033] dark:text-slate-100 focus:outline-none focus:border-[#2563eb]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-[#172033] dark:text-slate-200 mb-1">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#64748b] dark:text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#f8fafc] dark:bg-[#0f172a] border border-[#d9e0e8] dark:border-[#334155] rounded-md pl-9 pr-10 py-2 text-xs text-[#172033] dark:text-slate-100 focus:outline-none focus:border-[#2563eb]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-[#64748b] hover:text-[#172033] dark:hover:text-slate-200 focus:outline-none transition-colors"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {!isRegister && (
                <div className="flex items-center justify-between text-xs pt-0.5">
                  <label className="flex items-center gap-1.5 cursor-pointer text-[#64748b] dark:text-slate-400 hover:text-[#172033]">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-[#d9e0e8] text-[#2563eb] focus:ring-0 cursor-pointer accent-[#2563eb]"
                    />
                    <span className="font-normal text-[11px]">Remember me 30 days</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      setViewMode('forgot_request');
                      setResetIdent(identifier);
                      setMessage({ text: '', isError: false });
                    }}
                    className="text-[11px] font-medium text-[#2563eb] dark:text-blue-400 hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-medium text-xs rounded-md shadow-2xs transition-colors disabled:opacity-50 mt-1 cursor-pointer"
              >
                {loading ? 'Processing...' : isRegister ? 'Register Account' : 'Sign In to Dashboard'}
              </button>
            </form>
          </>
        )}

        {/* --- VIEW MODE 2: FORGOT PASSWORD - REQUEST CODE --- */}
        {viewMode === 'forgot_request' && (
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-[#f8fafc] dark:bg-[#0f172a] border border-[#d9e0e8] dark:border-[#334155] rounded-md text-center space-y-1">
              <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#2563eb] mx-auto flex items-center justify-center">
                <KeyRound className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-semibold text-[#172033] dark:text-slate-100">Reset Password</h3>
              <p className="text-[11px] text-[#64748b] dark:text-slate-400">
                Enter registered email address or username for 6-digit verification code.
              </p>
            </div>

            {message.text && (
              <div className={`p-2.5 rounded-md flex items-center gap-2 text-xs font-medium ${
                message.isError ? 'bg-[#fee2e2] text-[#b91c1c] border border-rose-200' : 'bg-[#d1fae5] text-[#047857] border border-emerald-200'
              }`}>
                {message.isError ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle className="w-4 h-4 shrink-0" />}
                <span>{message.text}</span>
              </div>
            )}

            <form onSubmit={handleRequestReset} className="space-y-3">
              <div>
                <label className="block font-medium text-[#172033] dark:text-slate-200 mb-1">Registered Email or Username</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#64748b] dark:text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    placeholder="name@gmail.com"
                    value={resetIdent}
                    onChange={(e) => setResetIdent(e.target.value)}
                    className="w-full bg-[#f8fafc] dark:bg-[#0f172a] border border-[#d9e0e8] dark:border-[#334155] rounded-md pl-9 pr-3 py-2 text-xs text-[#172033] dark:text-slate-100 focus:outline-none focus:border-[#2563eb]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-medium text-xs rounded-md shadow-2xs transition-colors disabled:opacity-50"
              >
                {loading ? 'Sending Code...' : 'Send Verification Code'}
              </button>

              <button
                type="button"
                onClick={() => { setViewMode('auth'); setMessage({ text: '', isError: false }); }}
                className="w-full flex items-center justify-center gap-1.5 text-xs text-[#64748b] hover:text-[#172033] transition-colors pt-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
              </button>
            </form>
          </div>
        )}

        {/* --- VIEW MODE 3: FORGOT PASSWORD - VERIFY CODE & RESET PASSWORD --- */}
        {viewMode === 'forgot_verify' && (
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-[#f8fafc] dark:bg-[#0f172a] border border-[#d9e0e8] dark:border-[#334155] rounded-md text-center space-y-1">
              <div className="w-8 h-8 rounded-full bg-emerald-50 text-[#16a34a] mx-auto flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-semibold text-[#172033] dark:text-slate-100">Verification Code Sent</h3>
              <p className="text-[11px] text-[#64748b] dark:text-slate-400">
                Enter code sent to <span className="font-mono text-[#2563eb]">{resetEmail}</span>
              </p>
            </div>

            {message.text && (
              <div className={`p-2.5 rounded-md flex items-center gap-2 text-xs font-medium ${
                message.isError ? 'bg-[#fee2e2] text-[#b91c1c] border border-rose-200' : 'bg-[#d1fae5] text-[#047857] border border-emerald-200'
              }`}>
                {message.isError ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle className="w-4 h-4 shrink-0" />}
                <span>{message.text}</span>
              </div>
            )}

            <form onSubmit={handleVerifyReset} className="space-y-3">
              <div>
                <label className="block font-medium text-[#172033] dark:text-slate-200 mb-1">6-Digit Verification Code</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="123456"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-[#f8fafc] dark:bg-[#0f172a] border border-[#d9e0e8] dark:border-[#334155] rounded-md px-3 py-2 text-center text-base font-mono tracking-widest text-[#2563eb] focus:outline-none focus:border-[#2563eb]"
                />
              </div>

              <div>
                <label className="block font-medium text-[#172033] dark:text-slate-200 mb-1">New Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#64748b] dark:text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Min 4 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-[#f8fafc] dark:bg-[#0f172a] border border-[#d9e0e8] dark:border-[#334155] rounded-md pl-9 pr-10 py-2 text-xs text-[#172033] dark:text-slate-100 focus:outline-none focus:border-[#2563eb]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-[#64748b] hover:text-[#172033] dark:hover:text-slate-200 focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-medium text-[#172033] dark:text-slate-200 mb-1">Confirm New Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#64748b] dark:text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Confirm password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-[#f8fafc] dark:bg-[#0f172a] border border-[#d9e0e8] dark:border-[#334155] rounded-md pl-9 pr-10 py-2 text-xs text-[#172033] dark:text-slate-100 focus:outline-none focus:border-[#2563eb]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-[#64748b] hover:text-[#172033] dark:hover:text-slate-200 focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 bg-[#16a34a] hover:bg-[#15803d] text-white font-medium text-xs rounded-md shadow-2xs transition-colors disabled:opacity-50 mt-1"
              >
                {loading ? 'Verifying...' : 'Reset & Update Password'}
              </button>

              <button
                type="button"
                onClick={() => { setViewMode('auth'); setMessage({ text: '', isError: false }); }}
                className="w-full flex items-center justify-center gap-1.5 text-xs text-[#64748b] hover:text-[#172033] transition-colors pt-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
