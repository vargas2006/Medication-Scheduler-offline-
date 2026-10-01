import React from 'react';
import { LayoutDashboard, Pill, History, Settings, LogOut, User, CheckSquare } from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, user, onLogout }) {
  const displayName = user?.name || user?.username || 'User';

  const navItems = [
    {
      id: 'DashboardFrame',
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'MedicationFrame',
      label: 'Medication Inventory',
      icon: Pill,
    },
    {
      id: 'IntakeFrame',
      label: 'Intake Medication',
      icon: CheckSquare,
    },
    {
      id: 'HistoryFrame',
      label: 'Intake History',
      icon: History,
    },
    {
      id: 'SettingsFrame',
      label: 'Settings',
      icon: Settings,
    },
  ];

  return (
    <aside className="w-[230px] bg-white dark:bg-[#0f172a] border-r border-[#d9e0e8] dark:border-[#1e293b] flex flex-col h-full shrink-0 select-none transition-colors">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-[#d9e0e8] dark:border-[#1e293b]">
        <img
          src="/app_icon.png"
          alt="MedScheduler Logo"
          className="w-8 h-8 object-contain shrink-0"
        />
        <div className="flex flex-col min-w-0">
          <span className="font-bold text-[#172033] dark:text-slate-100 text-sm leading-tight truncate">
            MedScheduler
          </span>
          <span className="text-[11px] text-[#64748b] dark:text-slate-400 truncate font-medium">
            Healthcare System
          </span>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        <div>
          <div className="px-3 pb-2">
            <span className="text-[10px] font-bold text-[#64748b] dark:text-slate-400 uppercase tracking-wider">
              Main Menu
            </span>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-[#eff6ff] text-[#2563eb] dark:bg-blue-950/60 dark:text-blue-400 font-semibold border-l-2 border-[#2563eb] shadow-2xs'
                      : 'text-[#64748b] dark:text-slate-400 hover:bg-[#f1f5f9] dark:hover:bg-slate-800/80 hover:text-[#172033] dark:hover:text-slate-200'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#2563eb] dark:text-blue-400' : 'text-[#64748b] dark:text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* User / Patient Profile Section */}
      <div className="p-3 border-t border-[#d9e0e8] dark:border-[#1e293b] bg-[#f8fafc] dark:bg-[#1e293b]/50">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#e2e8f0] dark:bg-slate-700 flex items-center justify-center text-[#172033] dark:text-slate-200 shrink-0 font-semibold text-xs">
              <User className="w-4 h-4 text-[#2563eb] dark:text-blue-400" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-[#172033] dark:text-slate-100 text-xs truncate">
                {displayName}
              </span>
              <span className="text-[10px] text-[#64748b] dark:text-slate-400 truncate font-normal">
                Patient Account
              </span>
            </div>
          </div>
          <button
            onClick={onLogout}
            title="Log Out"
            className="w-7 h-7 rounded-md text-[#64748b] hover:text-[#dc2626] hover:bg-[#fee2e2] dark:hover:bg-rose-950/50 dark:hover:text-rose-400 flex items-center justify-center transition-colors shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
