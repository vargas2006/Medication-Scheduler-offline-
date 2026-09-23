import React, { useState } from 'react';
import { Pill, Lock, Mail, User, AlertCircle, CheckCircle } from 'lucide-react';
import { callApi } from '../utils/pywebview';

export default function LoginModal({ onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
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

  return (
    <div className="fixed inset-0 bg-[#090b12] flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-md bg-[#121520] border border-[#24293e] rounded-2xl p-8 shadow-2xl space-y-6">
        {/* Brand logo */}
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center text-3xl shadow-lg mb-3">
            💊
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Smart Medication Scheduler</h2>
          <p className="text-xs text-slate-400 mt-1">Real-time Care & Medication Management System</p>
        </div>

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
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#161926] border border-[#272e45] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#7c3aed]"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              {isRegister ? 'Email Address' : 'Email or Username'}
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                required
                placeholder="name@example.com"
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
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#161926] border border-[#272e45] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#7c3aed]"
              />
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
                <span className="select-none font-medium">Remember me for 30 days</span>
              </label>
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
      </div>
    </div>
  );
}
