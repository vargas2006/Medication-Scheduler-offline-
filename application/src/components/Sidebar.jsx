import React from 'react';
import { LayoutDashboard, Pill, History, Settings, LogOut, User, CheckCircle } from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, user, onLogout }) {
  const displayName = user?.name || user?.username || 'User';

  return (
    <aside className="w-[230px] bg-slate-50 dark:bg-[#0f131d] border-r border-slate-200 dark:border-[#1e2436] flex flex-col h-full shrink-0 select-none transition-colors duration-150">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-200 dark:border-[#1a1f2e]">
        <img
          src="/app_icon.png"
          alt="MedScheduler Logo"
          className="w-9 h-9 object-contain drop-shadow-sm shrink-0"
        />
        <div className="flex flex-col min-w-0">
          <span className="font-semibold text-slate-900 dark:text-white text-sm tracking-tight truncate">MedScheduler</span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate font-normal">Smart Care Monitor</span>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        <div>
          <div className="px-2 mb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Overview & Care</span>
          </div>

          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('DashboardFrame')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'DashboardFrame'
                  ? 'bg-purple-50 text-purple-700 dark:bg-purple-600/15 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#171c2b] hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <LayoutDashboard className={`w-4 h-4 ${activeTab === 'DashboardFrame' ? 'text-purple-600 dark:text-purple-400' : 'text-slate-400'}`} />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab('MedicationFrame')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'MedicationFrame'
                  ? 'bg-purple-50 text-purple-700 dark:bg-purple-600/15 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#171c2b] hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Pill className={`w-4 h-4 ${activeTab === 'MedicationFrame' ? 'text-purple-600 dark:text-purple-400' : 'text-slate-400'}`} />
              <span>Medication Stock</span>
            </button>

            <button
              onClick={() => setActiveTab('IntakeFrame')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'IntakeFrame'
                  ? 'bg-purple-50 text-purple-700 dark:bg-purple-600/15 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#171c2b] hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <CheckCircle className={`w-4 h-4 ${activeTab === 'IntakeFrame' ? 'text-purple-600 dark:text-purple-400' : 'text-slate-400'}`} />
              <span>Intake Medication</span>
            </button>
          </nav>
        </div>

        <div>
          <div className="px-2 mb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Records & Settings</span>
          </div>

          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('HistoryFrame')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'HistoryFrame'
                  ? 'bg-purple-50 text-purple-700 dark:bg-purple-600/15 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#171c2b] hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <History className={`w-4 h-4 ${activeTab === 'HistoryFrame' ? 'text-purple-600 dark:text-purple-400' : 'text-slate-400'}`} />
              <span>Intake History</span>
            </button>

            <button
              onClick={() => setActiveTab('SettingsFrame')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'SettingsFrame'
                  ? 'bg-purple-50 text-purple-700 dark:bg-purple-600/15 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#171c2b] hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Settings className={`w-4 h-4 ${activeTab === 'SettingsFrame' ? 'text-purple-600 dark:text-purple-400' : 'text-slate-400'}`} />
              <span>Settings</span>
            </button>
          </nav>
        </div>
      </div>

      {/* User Footer */}
      <div className="p-3 border-t border-slate-200 dark:border-[#1a1f2e]">
        <div className="bg-white dark:bg-[#151926] border border-slate-200 dark:border-[#222838] rounded-xl p-2.5 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-[#222838] flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0">
              <User className="w-3.5 h-3.5" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-slate-900 dark:text-white text-xs truncate">{displayName}</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Patient Profile</span>
            </div>
          </div>
          <button
            onClick={onLogout}
            title="Log Out"
            className="w-7 h-7 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center transition-colors shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
