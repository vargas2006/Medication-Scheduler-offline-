import React from 'react';
import { Calendar, Sun, Moon } from 'lucide-react';

export default function Header({ activeTab, user, theme = 'dark', onToggleTheme }) {
  const displayName = user?.name || user?.username || 'User';

  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  });

  const getHeaderMeta = () => {
    switch (activeTab) {
      case 'MedicationFrame':
        return {
          tag: '● INVENTORY & STOCK',
          tagColor: 'text-[#38bdf8]',
          title: 'Medication Stock',
          subtitle: 'Register new drugs, manage inventory levels, and configure refill alert thresholds.'
        };
      case 'IntakeFrame':
        return {
          tag: '● DOSE LOGGING',
          tagColor: 'text-[#10b981]',
          title: 'Intake Medication',
          subtitle: 'Select and log doses for your registered medications in real time.'
        };
      case 'HistoryFrame':
        return {
          tag: '● AUDIT & INTAKE LOGS',
          tagColor: 'text-[#c084fc]',
          title: 'Intake History',
          subtitle: 'Complete historical audit of your medication doses taken and schedule records.'
        };
      case 'SettingsFrame':
        return {
          tag: '● SYSTEM CONFIGURATION',
          tagColor: 'text-[#38bdf8]',
          title: 'Settings & Preferences',
          subtitle: 'Personalize application theme, profile details, and alert notifications.'
        };
      default:
        return {
          tag: '● REALTIME CARE MONITOR',
          tagColor: 'text-[#38bdf8]',
          title: 'Dashboard Overview',
          subtitle: `Welcome back, ${displayName}! Here is your medication schedule today.`
        };
    }
  };

  const meta = getHeaderMeta();

  return (
    <header className="flex items-center justify-between px-6 pt-5 pb-3 shrink-0">
      <div>
        <div className="bg-[#181d2e] border border-[#2f3957] rounded-md px-2.5 py-0.5 mb-1.5 inline-block">
          <span className={`text-[10px] font-bold ${meta.tagColor}`}>{meta.tag}</span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight leading-tight">{meta.title}</h1>
        <p className="text-xs text-slate-400 mt-0.5">{meta.subtitle}</p>
      </div>

      <div className="flex items-center gap-2.5">
        {/* Quick Theme Toggle Button */}
        <button
          type="button"
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="bg-[#161926] hover:bg-[#1c2033] border border-[#24293e] rounded-xl px-3 py-2 flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-white transition-all shadow-sm"
        >
          {theme === 'dark' ? (
            <>
              <Sun className="w-4 h-4 text-amber-400 animate-pulse" />
              <span className="hidden sm:inline text-xs text-slate-300">Light Mode</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-purple-600" />
              <span className="hidden sm:inline text-xs text-slate-700">Dark Mode</span>
            </>
          )}
        </button>

        {/* Date Display Badge */}
        <div className="bg-[#161926] border border-[#24293e] rounded-xl px-3.5 py-2 flex items-center gap-2 text-xs font-semibold text-slate-400 shadow-sm">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span>{dateStr}</span>
        </div>
      </div>
    </header>
  );
}
