import React, { useState } from 'react';
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

  const handleLogout = async () => {
    await callApi('logout');
    setUser(null);
  };

  const handleDataChange = () => {
    setDataRefreshKey((prev) => prev + 1);
  };

  if (appLoading) {
    return <AppLoadingScreen onFinish={() => setAppLoading(false)} />;
  }

  if (!user) {
    return <LoginModal onLoginSuccess={(u) => setUser(u)} />;
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
    </div>
  );
}
