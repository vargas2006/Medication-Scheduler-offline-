import React, { useState, useEffect } from 'react';
import { Bell, X, Pill, Clock, Check, Droplet } from 'lucide-react';
import AppLoadingScreen from './components/AppLoadingScreen';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import LoginModal from './components/LoginModal';
import DashboardView from './components/DashboardView';
import MedicationsView from './components/MedicationsView';
import IntakeView from './components/IntakeView';
import HistoryView from './components/HistoryView';
import SettingsView from './components/SettingsView';
import { callApi } from './utils/pywebview';
import { User, DueAlert } from './types';

export default function App(): React.JSX.Element {
  const [appLoading, setAppLoading] = useState<boolean>(true);
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<string>('DashboardFrame');
  const [dataRefreshKey, setDataRefreshKey] = useState<number>(0);
  const [activeAlert, setActiveAlert] = useState<DueAlert | null>(null);
  const [theme, setTheme] = useState<string>(() => {
    return localStorage.getItem('med_app_theme') || 'dark';
  });

  const handleToggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    try {
      localStorage.setItem('med_app_theme', nextTheme);
      document.documentElement.setAttribute('data-theme', nextTheme);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    try {
      document.documentElement.setAttribute('data-theme', theme);
    } catch (e) {
      console.error(e);
    }
  }, [theme]);

  useEffect(() => {
    const handleDueAlert = (e: Event) => {
      const customEvent = e as CustomEvent<DueAlert>;
      if (customEvent.detail) {
        setActiveAlert(customEvent.detail);
      }
    };
    window.addEventListener('medication-due-alert', handleDueAlert);
    return () => window.removeEventListener('medication-due-alert', handleDueAlert);
  }, []);

  useEffect(() => {
    async function checkAutoLogin() {
      try {
        const res = await callApi('get_auto_login_user');
        if (res && res.success && res.user) {
          setUser(res.user);
          return;
        }

        const savedSession = localStorage.getItem('med_user_session');
        if (savedSession) {
          const { user: savedUser, expiry } = JSON.parse(savedSession);
          if (savedUser && expiry && expiry > Date.now()) {
            setUser(savedUser);
            callApi('set_active_user', savedUser.user_id);
          } else {
            localStorage.removeItem('med_user_session');
          }
        }
      } catch (e) {
        console.error('Failed to load saved session:', e);
      }
    }
    checkAutoLogin();
  }, []);

  const handleLogout = async () => {
    localStorage.removeItem('med_user_session');
    await callApi('logout');
    setUser(null);
  };

  const handleLoginSuccess = async (u: User) => {
    setUser(u);
    try {
      await callApi('set_active_user', u.user_id);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDataChange = () => {
    setDataRefreshKey((prev) => prev + 1);
  };

  if (appLoading) {
    return <AppLoadingScreen onFinish={() => setAppLoading(false)} />;
  }

  if (!user) {
    return <LoginModal onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex h-screen w-screen bg-slate-100 dark:bg-[#0b0e14] text-slate-900 dark:text-slate-100 overflow-hidden select-none transition-colors duration-150">

      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        onLogout={handleLogout}
      />

      <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-100 dark:bg-[#0b0e14]">

        <Header activeTab={activeTab} user={user} theme={theme} onToggleTheme={handleToggleTheme} />

        <main className="flex-1 overflow-hidden relative">
          {activeTab === 'DashboardFrame' && (
            <DashboardView key={`dash-${dataRefreshKey}`} user={user} onDataChange={handleDataChange} />
          )}
          {activeTab === 'MedicationFrame' && (
            <MedicationsView key={`meds-${dataRefreshKey}`} user={user} onDataChange={handleDataChange} />
          )}
          {activeTab === 'IntakeFrame' && (
            <IntakeView key={`intake-${dataRefreshKey}`} user={user} onDataChange={handleDataChange} />
          )}
          {activeTab === 'HistoryFrame' && (
            <HistoryView key={`hist-${dataRefreshKey}`} user={user} />
          )}
          {activeTab === 'SettingsFrame' && (
            <SettingsView user={user} theme={theme} onToggleTheme={handleToggleTheme} />
          )}
        </main>
      </div>

      {activeAlert && (
        <div className="fixed top-5 right-5 z-[9999] w-[460px] max-w-[94vw] bg-white dark:bg-[#151926] border border-emerald-500/40 rounded-2xl p-5 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-4 duration-200">

          <div className="flex items-start justify-between gap-3 pb-3 mb-3 border-b border-slate-200 dark:border-[#1e2436]">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl dark:text-emerald-400 shrink-0">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900 dark:text-white text-sm tracking-wide">
                    {activeAlert.title || 'Medication Reminder'}
                  </span>
                  <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30">
                    Today
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">
                  {activeAlert.date || 'Scheduled for today'} &bull; {activeAlert.timestamp || 'Due Now'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveAlert(null)}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-[#1c2234] transition-colors"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {activeAlert.medications && activeAlert.medications.length > 0 ? (
            <div className="space-y-2 mb-4 max-h-[220px] overflow-y-auto pr-1">
              {activeAlert.medications.map((m, idx) => (
                <div
                  key={idx}
                  className="bg-slate-50 dark:bg-[#1c2234] border border-slate-200 dark:border-[#262f46] hover:border-emerald-500/40 rounded-xl p-3 flex items-center justify-between transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center dark:text-emerald-400 shrink-0">
                      <Pill className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-semibold text-slate-900 dark:text-white text-xs truncate">{m.name}</h4>
                      <span className="inline-block mt-0.5 text-[10px] font-semibold text-sky-700 bg-sky-50 border border-sky-200 dark:text-sky-400 dark:bg-sky-500/10 dark:border-sky-500/20 px-2 py-0.5 rounded-md">
                        {m.dosage}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-purple-700 bg-purple-50 border border-purple-200 dark:text-purple-400 dark:bg-purple-500/10 dark:border-purple-500/20 px-2.5 py-1 rounded-lg text-[11px] font-semibold shrink-0">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{m.time_value || 'Today'}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-700 dark:text-slate-300 text-xs leading-relaxed mb-4 p-3 bg-slate-50 dark:bg-[#1c2234] border border-slate-200 dark:border-[#262f46] rounded-xl">
              {activeAlert.message}
            </p>
          )}

          <div className="mb-4 px-3 py-2 bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20 rounded-xl flex items-center gap-2 text-[11px] dark:text-emerald-300 font-medium">
            <Droplet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Remember to log your intake after taking your dose.</span>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200 dark:border-[#1e2436]">
            <button
              type="button"
              onClick={() => setActiveAlert(null)}
              className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-[#1c2234] dark:hover:bg-[#222838] border border-slate-200 dark:border-[#262f46] text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-xs transition-colors"
            >
              Dismiss
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveAlert(null);
                setActiveTab('IntakeFrame');
              }}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-sm flex items-center gap-1.5 transition-all"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Take Dose Now</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
