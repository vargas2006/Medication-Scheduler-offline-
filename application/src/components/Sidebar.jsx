import React from 'react';
import { LayoutDashboard, Pill, History, Settings, LogOut, User, CheckCircle } from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, user, onLogout }) {
  const displayName = user?.name || user?.username || 'User';

  return (
    <aside className="w-[240px] bg-[#121520] border-r border-[#1e2235] flex flex-col h-full shrink-0 select-none">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-[#1a1e2e]">
        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-xl shadow-sm shrink-0">
          💊
        </div>
        <div className="flex flex-col min-w-0">
          <span className="font-bold text-white text-base leading-tight truncate">MedScheduler</span>
          <span className="text-[11px] text-slate-400 truncate">Smart Care Monitor</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
        {/* Section 1: OVERVIEW & CARE */}
        <div>
          <div className="bg-[#171b29] border border-[#2b3149] rounded-md px-3 py-1 mb-2 inline-flex items-center">
            <span className="text-[10px] font-bold text-[#c084fc] tracking-wide">● OVERVIEW & CARE</span>
          </div>

          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('DashboardFrame')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'DashboardFrame'
                  ? 'bg-[#2b2046] text-[#e9d5ff] border border-[#a855f7] shadow-sm'
                  : 'text-slate-400 hover:bg-[#1a1e2e] hover:text-slate-200'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 text-[#c084fc]" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab('MedicationFrame')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'MedicationFrame'
                  ? 'bg-[#2b2046] text-[#e9d5ff] border border-[#a855f7] shadow-sm'
                  : 'text-slate-400 hover:bg-[#1a1e2e] hover:text-slate-200'
              }`}
            >
              <Pill className="w-4 h-4 text-[#38bdf8]" />
              <span>Medication Stock</span>
            </button>

            <button
              onClick={() => setActiveTab('IntakeFrame')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'IntakeFrame'
                  ? 'bg-[#2b2046] text-[#e9d5ff] border border-[#a855f7] shadow-sm'
                  : 'text-slate-400 hover:bg-[#1a1e2e] hover:text-slate-200'
              }`}
            >
              <CheckCircle className="w-4 h-4 text-[#10b981]" />
              <span>Intake Medication</span>
            </button>
          </nav>
        </div>

        {/* Section 2: RECORDS & SETTINGS */}
        <div>
          <div className="bg-[#171b29] border border-[#2b3149] rounded-md px-3 py-1 mb-2 inline-flex items-center">
            <span className="text-[10px] font-bold text-[#38bdf8] tracking-wide">● RECORDS & SETTINGS</span>
          </div>

          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('HistoryFrame')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'HistoryFrame'
                  ? 'bg-[#2b2046] text-[#e9d5ff] border border-[#a855f7] shadow-sm'
                  : 'text-slate-400 hover:bg-[#1a1e2e] hover:text-slate-200'
              }`}
            >
              <History className="w-4 h-4 text-[#c084fc]" />
              <span>Intake History</span>
            </button>

            <button
              onClick={() => setActiveTab('SettingsFrame')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'SettingsFrame'
                  ? 'bg-[#2b2046] text-[#e9d5ff] border border-[#a855f7] shadow-sm'
                  : 'text-slate-400 hover:bg-[#1a1e2e] hover:text-slate-200'
              }`}
            >
              <Settings className="w-4 h-4 text-[#38bdf8]" />
              <span>Settings</span>
            </button>
          </nav>
        </div>
      </div>

      {/* User Profile Footer Card */}
      <div className="p-3 border-t border-[#1a1e2e]">
        <div className="bg-[#161a29] border border-[#252b42] rounded-xl p-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#262d45] flex items-center justify-center text-slate-200 shrink-0">
              <User className="w-4 h-4" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-white text-xs truncate">{displayName}</span>
              <span className="text-[10px] text-slate-400 truncate">Patient Profile</span>
            </div>
          </div>
          <button
            onClick={onLogout}
            title="Log Out"
            className="w-8 h-8 rounded-lg hover:bg-[#2a1622] text-rose-500 flex items-center justify-center transition-colors shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
