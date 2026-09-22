import React, { useState } from 'react';
import { Moon, Sun, UserCheck, Shield, Sliders } from 'lucide-react';

export default function SettingsView({ user }) {
  const [isDark, setIsDark] = useState(true);

  const displayName = user?.name || user?.username || 'User';
  const emailInfo = user?.email ? ` (${user.email})` : '';

  return (
    <div className="p-5 h-full overflow-hidden">
      <div className="bg-[#161926] border border-[#24293e] rounded-2xl p-6 h-full space-y-6 overflow-y-auto">
        {/* Appearance Section */}
        <div>
          <h3 className="text-base font-bold text-white mb-1">Appearance & Theme</h3>
          <p className="text-xs text-slate-400 mb-4">Toggle between high-contrast dark mode and light theme.</p>
          
          <div className="bg-[#1c2033] border border-[#272e45] rounded-xl p-4 flex items-center justify-between max-w-lg">
            <div className="flex items-center gap-3">
              {isDark ? <Moon className="w-5 h-5 text-purple-400" /> : <Sun className="w-5 h-5 text-amber-400" />}
              <div>
                <span className="text-xs font-bold text-white block">Theme Mode</span>
                <span className="text-[11px] text-slate-400">{isDark ? 'Dark Mode Active' : 'Light Mode Active'}</span>
              </div>
            </div>

            <button
              onClick={() => setIsDark(!isDark)}
              className={`w-12 h-6 rounded-full p-1 transition-colors ${isDark ? 'bg-[#7c3aed]' : 'bg-slate-600'}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${isDark ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>

        <hr className="border-[#24293e]" />

        {/* Account Section */}
        <div>
          <h3 className="text-base font-bold text-white mb-1">Account Information</h3>
          <p className="text-xs text-slate-400 mb-4">Active user credentials and profile details.</p>

          <div className="space-y-3 max-w-lg">
            <div className="bg-[#1c2033] border border-[#272e45] rounded-xl p-3.5 flex items-center gap-3">
              <UserCheck className="w-5 h-5 text-[#38bdf8]" />
              <div className="text-xs">
                <span className="text-slate-400 block text-[10px]">Logged in as</span>
                <span className="font-bold text-white">{displayName}{emailInfo}</span>
              </div>
            </div>

            <div className="bg-[#1c2033] border border-[#272e45] rounded-xl p-3.5 flex items-center gap-3">
              <Shield className="w-5 h-5 text-[#c084fc]" />
              <div className="text-xs">
                <span className="text-slate-400 block text-[10px]">User Role</span>
                <span className="font-bold text-white">Registered Patient Profile</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
