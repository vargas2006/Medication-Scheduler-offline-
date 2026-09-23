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

      {/* Global In-App Medication Due Alert Card (Large, Detailed, Prominent Borders) */}
      {activeAlert && (
        <div className="fixed top-6 right-6 z-[9999] w-[500px] max-w-[94vw] bg-[#121626]/98 border-2 border-emerald-500 rounded-3xl p-5 shadow-[0_12px_45px_rgba(0,0,0,0.85),0_0_30px_rgba(16,185,129,0.35)] backdrop-blur-2xl animate-in fade-in slide-in-from-top-4 duration-300 ring-1 ring-white/10">
          {/* Card Header */}
          <div className="flex items-start justify-between gap-3 pb-3 mb-3 border-b border-[#252d47]">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl text-emerald-400 shrink-0 shadow-inner">
                <Bell className="w-5 h-5 animate-bounce" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-white text-sm tracking-wide">
                    {activeAlert.title || 'Medication Due Reminder'}
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500 text-[#0b0e17]">
                    Today
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium">
                  {activeAlert.date || 'Scheduled for today'} &bull; {activeAlert.timestamp || 'Due Now'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveAlert(null)}
              className="text-slate-400 hover:text-white p-1 rounded-xl hover:bg-[#202740] transition-colors"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Detailed Medications List or Message */}
          {activeAlert.medications && activeAlert.medications.length > 0 ? (
            <div className="space-y-2 mb-4 max-h-[220px] overflow-y-auto pr-1">
              {activeAlert.medications.map((m, idx) => (
                <div
                  key={idx}
                  className="bg-[#171d33] border border-[#2b3558] hover:border-emerald-500/40 rounded-2xl p-3 flex items-center justify-between transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                      <Pill className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-white text-xs truncate">{m.name}</h4>
                      <span className="inline-block mt-0.5 text-[10px] font-semibold text-sky-300 bg-sky-950/70 border border-sky-500/30 px-2 py-0.5 rounded-md">
                        {m.dosage}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-purple-300 bg-purple-950/70 border border-purple-500/30 px-2.5 py-1 rounded-xl text-[11px] font-bold shrink-0">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{m.time_value || 'Today'}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-300 text-xs leading-relaxed mb-4 p-3 bg-[#171d33] border border-[#2b3558] rounded-2xl">
              {activeAlert.message}
            </p>
          )}

          {/* Health Tip / Instruction banner */}
          <div className="mb-4 px-3 py-2 bg-emerald-950/30 border border-emerald-500/20 rounded-xl flex items-center gap-2 text-[11px] text-emerald-300 font-medium">
            <span className="text-sm">💧</span>
            <span>Take dose with water and log intake to update your schedule.</span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#252d47]">
            <button
              type="button"
              onClick={() => setActiveAlert(null)}
              className="px-4 py-2 bg-[#1c2238] hover:bg-[#252c48] border border-[#2e375b] text-slate-300 font-bold rounded-xl text-xs transition-colors"
            >
              Dismiss
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveAlert(null);
                setActiveTab('IntakeFrame');
              }}
              className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-extrabold rounded-xl text-xs shadow-lg shadow-emerald-950/50 flex items-center gap-2 transition-all transform active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>Take Dose Now</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
