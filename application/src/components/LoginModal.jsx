import React, { useState } from 'react';
import { Pill, Lock, Mail, User, AlertCircle, CheckCircle, ArrowLeft, KeyRound, ShieldCheck, Eye, EyeOff } from 'lucide-react';
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
    if (!resetIdent.strip?.() && !resetIdent) {
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
    if (newPassword.length < 6) {
      setMessage({ text: 'Password must be at least 6 characters long.', isError: true });
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
    <div className="fixed inset-0 bg-[#090b12] flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-md bg-[#121520] border border-[#24293e] rounded-2xl p-8 shadow-2xl space-y-6">
        {/* Brand logo */}
        <div className="flex flex-col items-center text-center">
          <img
            src="/app_icon.png"
            alt="MedScheduler Logo"
            className="w-16 h-16 object-contain drop-shadow-xl mb-3"
          />
          <h2 className="text-2xl font-bold text-white tracking-tight">Smart Medication Scheduler</h2>
          <p className="text-xs text-slate-400 mt-1">Real-time Care & Medication Management System</p>
        </div>

        {/* --- VIEW MODE 1: SIGN IN / CREATE ACCOUNT --- */}
        {viewMode === 'auth' && (
          <>
            {/* Tab switch */}
            <div className="grid grid-cols-2 bg-[#171b29] border border-[#252b42] p-1 rounded-xl">
              <button
                type="button"
                onClick={() => { setIsRegister(false); setMessage({ text: '', isError: false }); }}
                className={`py-2 text-xs font-bold rounded-lg transition-all ${
                  !isRegister ? 'bg-[#7c3aed] text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setIsRegister(true); setMessage({ text: '', isError: false }); }}
                className={`py-2 text-xs font-bold rounded-lg transition-all ${
                  isRegister ? 'bg-[#7c3aed] text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Alert message */}
            {message.text && (
              <div className={`p-3 rounded-xl flex items-center gap-2.5 text-xs font-medium ${
                message.isError ? 'bg-rose-950/60 border border-rose-800/80 text-rose-300' : 'bg-emerald-950/60 border border-emerald-800/80 text-emerald-300'
              }`}>
                {message.isError ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle className="w-4 h-4 shrink-0" />}
                <span>{message.text}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {isRegister && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Full Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      placeholder="Rene Baterbonia"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-[#161926] border border-[#272e45] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#7c3aed]"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {isRegister ? 'Email / Username' : 'Email / Username'}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="name@gmail.com"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="w-full bg-[#161926] border border-[#272e45] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#7c3aed]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#161926] border border-[#272e45] rounded-xl pl-9 pr-10 py-2.5 text-sm text-white focus:outline-none focus:border-[#7c3aed]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-200 focus:outline-none transition-colors"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {!isRegister && (
                <div className="flex items-center justify-between text-xs pt-0.5">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white transition-colors">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-[#272e45] bg-[#161926] text-[#7c3aed] focus:ring-0 focus:ring-offset-0 cursor-pointer accent-[#7c3aed]"
                    />
                    <span className="select-none font-medium text-[11px]">Remember me 30d</span>
                  </label>

                  {/* Forgot Password Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode('forgot_request');
                      setResetIdent(identifier);
                      setMessage({ text: '', isError: false });
                    }}
                    className="text-[11px] font-semibold text-[#38bdf8] hover:text-sky-300 transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-bold text-sm rounded-xl shadow-lg shadow-purple-900/30 transition-all disabled:opacity-50"
              >
                {loading ? 'Processing...' : isRegister ? 'Register Account' : 'Sign In to Dashboard'}
              </button>
            </form>
          </>
        )}

        {/* --- VIEW MODE 2: FORGOT PASSWORD - REQUEST CODE --- */}
        {viewMode === 'forgot_request' && (
          <div className="space-y-4">
            <div className="bg-[#171b29] border border-[#252b42] p-4 rounded-xl text-center space-y-1">
              <div className="w-10 h-10 rounded-full bg-sky-500/10 border border-sky-500/20 text-[#38bdf8] mx-auto flex items-center justify-center">
                <KeyRound className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white pt-1">Reset Password</h3>
              <p className="text-[11px] text-slate-400">
                Enter your registered email address or username. We will send a 6-digit verification code to your Gmail.
              </p>
            </div>

            {/* Alert message */}
            {message.text && (
              <div className={`p-3 rounded-xl flex items-center gap-2.5 text-xs font-medium ${
                message.isError ? 'bg-rose-950/60 border border-rose-800/80 text-rose-300' : 'bg-emerald-950/60 border border-emerald-800/80 text-emerald-300'
              }`}>
                {message.isError ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle className="w-4 h-4 shrink-0" />}
                <span>{message.text}</span>
              </div>
            )}

            <form onSubmit={handleRequestReset} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Registered Email or Username</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="name@gmail.com"
                    value={resetIdent}
                    onChange={(e) => setResetIdent(e.target.value)}
                    className="w-full bg-[#161926] border border-[#272e45] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#38bdf8]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#38bdf8] hover:bg-[#0ea5e9] text-[#0b0e17] font-bold text-sm rounded-xl shadow-lg shadow-sky-900/30 transition-all disabled:opacity-50"
              >
                {loading ? 'Sending Code...' : 'Send Verification Code'}
              </button>

              <button
                type="button"
                onClick={() => { setViewMode('auth'); setMessage({ text: '', isError: false }); }}
                className="w-full flex items-center justify-center gap-2 text-xs text-slate-400 hover:text-white transition-colors pt-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
              </button>
            </form>
          </div>
        )}

        {/* --- VIEW MODE 3: FORGOT PASSWORD - VERIFY CODE & SET NEW PASSWORD --- */}
        {viewMode === 'forgot_verify' && (
          <div className="space-y-4">
            <div className="bg-[#171b29] border border-[#252b42] p-4 rounded-xl text-center space-y-1">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white pt-1">Enter Verification Code</h3>
              <p className="text-[11px] text-slate-400">
                A 6-digit verification code was sent to <span className="text-sky-400 font-mono">{resetEmail}</span>.
              </p>
            </div>

            {/* Alert message */}
            {message.text && (
              <div className={`p-3 rounded-xl flex items-center gap-2.5 text-xs font-medium ${
                message.isError ? 'bg-rose-950/60 border border-rose-800/80 text-rose-300' : 'bg-emerald-950/60 border border-emerald-800/80 text-emerald-300'
              }`}>
                {message.isError ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle className="w-4 h-4 shrink-0" />}
                <span>{message.text}</span>
              </div>
            )}

            <form onSubmit={handleVerifyReset} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">6-Digit Verification Code</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="123456"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-[#161926] border border-[#272e45] rounded-xl px-4 py-2.5 text-center text-lg font-mono tracking-widest text-[#38bdf8] focus:outline-none focus:border-[#38bdf8]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">New Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Min 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-[#161926] border border-[#272e45] rounded-xl pl-9 pr-10 py-2 text-sm text-white focus:outline-none focus:border-[#7c3aed]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200 focus:outline-none transition-colors"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Confirm New Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Confirm password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-[#161926] border border-[#272e45] rounded-xl pl-9 pr-10 py-2 text-sm text-white focus:outline-none focus:border-[#7c3aed]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200 focus:outline-none transition-colors"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#10b981] hover:bg-[#059669] text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-900/30 transition-all disabled:opacity-50 mt-2"
              >
                {loading ? 'Verifying & Updating...' : 'Reset & Update Password'}
              </button>

              <button
                type="button"
                onClick={() => { setViewMode('auth'); setMessage({ text: '', isError: false }); }}
                className="w-full flex items-center justify-center gap-2 text-xs text-slate-400 hover:text-white transition-colors pt-1"
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
