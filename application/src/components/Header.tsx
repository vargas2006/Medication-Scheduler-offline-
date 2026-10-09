import React from 'react';
import { Calendar, Sun, Moon } from 'lucide-react';
import { User } from '../types';

interface HeaderProps {
  activeTab: string;
  user: User | null;
  theme?: 'dark' | 'light' | string;
  onToggleTheme: () => void;
}

interface HeaderMeta {
  tag: string;
  title: string;
  subtitle: string;
}

export default function Header({ activeTab, user, theme = 'dark', onToggleTheme }: HeaderProps): React.JSX.Element {
  const displayName = user?.name || user?.username || 'User';

  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  });

  const getHeaderMeta = (): HeaderMeta => {
    switch (activeTab) {
      case 'MedicationFrame':
        return {
          tag: 'INVENTORY & STOCK',
          title: 'Medication Stock',
          subtitle: 'Register new drugs, manage inventory levels, and configure refill alert thresholds.'
        };
      case 'IntakeFrame':
        return {
          tag: 'DOSE LOGGING',
          title: 'Intake Medication',
          subtitle: 'Select and log doses for your registered medications in real time.'
        };
      case 'HistoryFrame':
        return {
          tag: 'AUDIT & INTAKE LOGS',
          title: 'Intake History',
          subtitle: 'Complete historical audit of your medication doses taken and schedule records.'
        };
      case 'SettingsFrame':
        return {
          tag: 'SYSTEM CONFIGURATION',
          title: 'Settings & Preferences',
          subtitle: 'Personalize application theme, profile details, and alert notifications.'
        };
      default:
        return {
          tag: 'REALTIME CARE MONITOR',
          title: 'Dashboard Overview',
          subtitle: `Welcome back, ${displayName}! Here is your medication schedule today.`
        };
    }
  };

  const meta = getHeaderMeta();

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-[#1e2436] bg-white dark:bg-[#0f131d] shrink-0 transition-colors duration-150">
      <div>
        <div className="inline-flex items-center px-2 py-0.5 mb-1 rounded border text-[10px] font-bold tracking-wider text-purple-700 bg-purple-50 border-purple-200 dark:text-purple-300 dark:bg-purple-500/10 dark:border-purple-500/20">
          <span>{meta.tag}</span>
        </div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight">{meta.title}</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-normal">{meta.subtitle}</p>
      </div>

      <div className="flex items-center gap-3">
        {/* Theme Toggle Button */}
        <button
          type="button"
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="bg-slate-100 hover:bg-slate-200 dark:bg-[#151926] dark:hover:bg-[#1c2234] border border-slate-200 dark:border-[#222838] rounded-xl px-3 py-1.5 flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all shadow-sm"
        >
          {theme === 'dark' ? (
            <>
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline text-xs text-slate-300">Light Mode</span>
            </>
          ) : (
            <>
              <Moon className="w-3.5 h-3.5 text-purple-600" />
              <span className="hidden sm:inline text-xs text-slate-700">Dark Mode</span>
            </>
          )}
        </button>

        {/* Date Display */}
        <div className="bg-slate-100 dark:bg-[#151926] border border-slate-200 dark:border-[#222838] rounded-xl px-3.5 py-1.5 flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 shadow-sm">
          <Calendar className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          <span>{dateStr}</span>
        </div>
      </div>
    </header>
  );
}
