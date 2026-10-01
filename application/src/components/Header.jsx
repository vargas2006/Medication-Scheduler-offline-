import React from 'react';
import { Calendar, Sun, Moon } from 'lucide-react';

export default function Header({ activeTab, user, theme = 'dark', onToggleTheme }) {
  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  });

  const getHeaderMeta = () => {
    switch (activeTab) {
      case 'MedicationFrame':
        return {
          title: 'Medication Inventory',
          subtitle: 'Manage medication stock levels, dosages, and refill thresholds'
        };
      case 'IntakeFrame':
        return {
          title: 'Intake Medication',
          subtitle: 'Record and verify medication doses in real time'
        };
      case 'HistoryFrame':
        return {
          title: 'Intake History',
          subtitle: 'Audit log of completed and missed medication doses'
        };
      case 'SettingsFrame':
        return {
          title: 'Settings & Preferences',
          subtitle: 'Manage notification preferences and application configuration'
        };
      default:
        return {
          title: 'Dashboard',
          subtitle: 'Medication schedule and daily activity overview'
        };
    }
  };

  const meta = getHeaderMeta();

  return (
    <header className="flex items-center justify-between px-6 pt-4 pb-3 border-b border-[#d9e0e8] dark:border-[#1e293b] bg-white dark:bg-[#0f172a] shrink-0 transition-colors">
      <div>
        <h1 className="text-xl font-bold text-[#172033] dark:text-slate-100 tracking-tight">
          {meta.title}
        </h1>
        <p className="text-xs text-[#64748b] dark:text-slate-400 mt-0.5 font-normal">
          {meta.subtitle}
        </p>
      </div>

      <div className="flex items-center gap-3">
        {/* Date Display */}
        <div className="flex items-center gap-1.5 text-xs text-[#64748b] dark:text-slate-400 font-medium px-2.5 py-1.5 rounded-md bg-[#f8fafc] dark:bg-[#1e293b] border border-[#d9e0e8] dark:border-[#334155]">
          <Calendar className="w-3.5 h-3.5 text-[#64748b] dark:text-slate-400" />
          <span>{dateStr}</span>
        </div>

        {/* Desktop Theme Toggle */}
        <button
          type="button"
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md bg-[#f8fafc] dark:bg-[#1e293b] border border-[#d9e0e8] dark:border-[#334155] text-[#172033] dark:text-slate-200 hover:bg-[#e2e8f0] dark:hover:bg-slate-700 transition-colors"
        >
          {theme === 'dark' ? (
            <>
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span>Light</span>
            </>
          ) : (
            <>
              <Moon className="w-3.5 h-3.5 text-blue-600" />
              <span>Dark</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
}
