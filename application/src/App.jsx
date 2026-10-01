import React, { useState, useEffect } from 'react';
import { Bell, X, Pill, Clock, Check, AlertCircle } from 'lucide-react';
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

export default function App() {
  const [appLoading, setAppLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('DashboardFrame');
  const [dataRefreshKey, setDataRefreshKey] = useState(0);
  const [activeAlert, setActiveAlert] = useState(null);
  const [theme, setTheme] = useState(() => {
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
    const handleDueAlert = (e) => {
      if (e.detail) {
        setActiveAlert(e.detail);
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

  const handleLoginSuccess = async (u) => {
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
    <div className="flex h-screen w-screen bg-[#f5f7fa] dark:bg-[#0f172a] text-[#172033] dark:text-slate-100 overflow-hidden select-none transition-colors">
      {/* Permanent Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        onLogout={handleLogout}
      />

      {/* Main Right Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#f5f7fa] dark:bg-[#0f172a]">
        {/* Permanent Top Header */}
        <Header activeTab={activeTab} user={user} theme={theme} onToggleTheme={handleToggleTheme} />

        {/* Dynamic Body Content */}
        <main className="flex-1 overflow-hidden relative bg-[#f5f7fa] dark:bg-[#0f172a]">
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

      {/* Global In-App Medication Due Alert Dialog */}
      {activeAlert && (
        <div className="fixed top-5 right-5 z-[9999] w-[460px] max-w-[94vw] bg-white dark:bg-[#1e293b] border border-[#d9e0e8] dark:border-[#334155] rounded-lg p-5 shadow-lg animate-fadeIn">
          {/* Card Header */}
          <div className="flex items-start justify-between gap-3 pb-3 mb-3 border-b border-[#d9e0e8] dark:border-[#334155]">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-[#d1fae5] dark:bg-emerald-950/60 text-[#047857] dark:text-emerald-300 rounded-md shrink-0">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-[#172033] dark:text-slate-100 text-sm">
                    {activeAlert.title || 'Medication Due Reminder'}
                  </h3>
                </div>
                <p className="text-xs text-[#64748b] dark:text-slate-400 font-normal">
                  {activeAlert.date || 'Today'} &bull; {activeAlert.timestamp || 'Due Now'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveAlert(null)}
              className="text-[#64748b] hover:text-[#172033] dark:hover:text-slate-200 p-1 rounded-md transition-colors"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Detailed Medications List or Message */}
          {activeAlert.medications && activeAlert.medications.length > 0 ? (
            <div className="space-y-2 mb-4 max-h-[200px] overflow-y-auto">
              {activeAlert.medications.map((m, idx) => (
                <div
                  key={idx}
                  className="bg-[#f8fafc] dark:bg-[#0f172a] border border-[#d9e0e8] dark:border-[#334155] rounded-md p-2.5 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Pill className="w-4 h-4 text-[#2563eb] dark:text-blue-400 shrink-0" />
                    <div className="min-w-0">
                      <h4 className="font-semibold text-[#172033] dark:text-slate-100 truncate">{m.name}</h4>
                      <span className="text-[11px] text-[#64748b] dark:text-slate-400">{m.dosage}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-[#2563eb] dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded text-[11px] font-medium shrink-0">
                    <Clock className="w-3 h-3" />
                    <span>{m.time_value || 'Today'}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[#64748b] dark:text-slate-300 text-xs mb-4 p-2.5 bg-[#f8fafc] dark:bg-[#0f172a] border border-[#d9e0e8] dark:border-[#334155] rounded-md">
              {activeAlert.message}
            </p>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#d9e0e8] dark:border-[#334155]">
            <button
              type="button"
              onClick={() => setActiveAlert(null)}
              className="px-3 py-1.5 border border-[#d9e0e8] dark:border-[#334155] text-[#64748b] hover:text-[#172033] font-medium rounded-md text-xs transition-colors"
            >
              Dismiss
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveAlert(null);
                setActiveTab('IntakeFrame');
              }}
              className="px-4 py-1.5 bg-[#16a34a] hover:bg-[#15803d] text-white font-medium rounded-md text-xs flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
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
