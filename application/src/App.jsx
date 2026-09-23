import React, { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
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
    try {
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
    <div className="flex h-screen w-screen bg-[#0d0f17] text-slate-100 overflow-hidden select-none">
      {/* Permanent Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        onLogout={handleLogout}
      />

      {/* Main Right Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0d0f17]">
        {/* Permanent Top Header */}
        <Header activeTab={activeTab} user={user} />

        {/* Dynamic Body Content */}
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
            <SettingsView user={user} />
          )}
        </main>
      </div>

      {/* Global In-App Medication Due Alert Banner */}
      {activeAlert && (
        <div className="fixed top-5 right-5 z-[9999] max-w-sm bg-[#161926] border-2 border-emerald-500/80 rounded-2xl p-4 shadow-2xl shadow-black/80 flex items-start gap-3 backdrop-blur-md">
          <div className="p-2 bg-emerald-500/20 rounded-xl text-emerald-400 shrink-0">
            <Bell className="w-5 h-5 animate-pulse" />
          </div>
          <div className="flex-1 text-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-white text-xs">{activeAlert.title}</span>
              <button
                type="button"
                onClick={() => setActiveAlert(null)}
                className="text-slate-400 hover:text-white p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-slate-300 leading-snug mb-3 text-[11px]">{activeAlert.message}</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setActiveAlert(null);
                  setActiveTab('IntakeFrame');
                }}
                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg text-[11px] transition-colors"
              >
                Take Dose Now
              </button>
              <button
                type="button"
                onClick={() => setActiveAlert(null)}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
