import React, { useState, useEffect } from 'react';
import { Moon, Sun, UserCheck, Shield, Bell, Mail, CheckCircle2 } from 'lucide-react';
import { callApi } from '../utils/pywebview';

export default function SettingsView({ user, theme = 'dark', onToggleTheme }) {
  const isDark = theme === 'dark';

  // Notification & Alert persistent states
  const [enableOfflinePopups, setEnableOfflinePopups] = useState(false);
  const [enableGmailNotifications, setEnableGmailNotifications] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [senderPassword, setSenderPassword] = useState('');
  const [saveStatus, setSaveStatus] = useState('');

  const displayName = user?.name || user?.username || 'User';
  const emailInfo = user?.email ? ` (${user.email})` : '';

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await callApi('get_settings', user?.user_id);
        if (res.success) {
          setEnableOfflinePopups(res.enable_offline_popups === 1);
          setEnableGmailNotifications(res.enable_gmail_notifications === 1);
          setRecipientEmail(res.recipient_email || user?.email || '');
          setSenderEmail(res.sender_email || '');
          setSenderPassword(res.sender_password || '');
        }
      } catch (e) {
        console.error('Failed to load settings from DB:', e);
      }
    }
    loadSettings();
  }, [user]);

  const persistSettings = async (offlineVal, gmailVal, emailVal, sendEmailVal = senderEmail, sendPassVal = senderPassword) => {
    try {
      setSaveStatus('Saving...');
      await callApi('save_settings', offlineVal ? 1 : 0, gmailVal ? 1 : 0, emailVal, sendEmailVal, sendPassVal, user?.user_id);
      setSaveStatus('Saved');
      setTimeout(() => setSaveStatus(''), 2000);
    } catch (e) {
      console.error('Failed to save settings:', e);
      setSaveStatus('Error saving');
    }
  };

  const handleOfflineToggle = () => {
    const nextVal = !enableOfflinePopups;
    setEnableOfflinePopups(nextVal);
    persistSettings(nextVal, enableGmailNotifications, recipientEmail, senderEmail, senderPassword);
  };

  const handleGmailToggle = () => {
    const nextVal = !enableGmailNotifications;
    setEnableGmailNotifications(nextVal);
    persistSettings(enableOfflinePopups, nextVal, recipientEmail, senderEmail, senderPassword);
  };

  const handleBlurSave = () => {
    persistSettings(enableOfflinePopups, enableGmailNotifications, recipientEmail, senderEmail, senderPassword);
  };

  return (
    <div className="p-5 h-full overflow-hidden">
      <div className="bg-[#161926] border border-[#24293e] rounded-2xl p-6 h-full space-y-6 overflow-y-auto">
        {/* Appearance Section */}
        <div>
          <h3 className="text-base font-bold text-white mb-1">Appearance & Theme</h3>
          <p className="text-xs text-slate-400 mb-4">Toggle between high-contrast dark mode and light theme.</p>
          
          <div className="bg-[#1c2033] border border-[#272e45] rounded-xl p-4 flex items-center justify-between max-w-lg">
            <div className="flex items-center gap-3">
              {isDark ? <Moon className="w-5 h-5 text-purple-400" /> : <Sun className="w-5 h-5 text-amber-400" />}
              <div>
                <span className="text-xs font-bold text-white block">Theme Mode</span>
                <span className="text-[11px] text-slate-400">{isDark ? 'Dark Mode Active' : 'Light Mode Active'}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={onToggleTheme}
              className={`w-12 h-6 rounded-full p-1 transition-colors ${isDark ? 'bg-[#7c3aed]' : 'bg-amber-500'}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${isDark ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>

        <hr className="border-[#24293e]" />

        {/* Notifications & Alert System Section */}
        <div>
          <div className="flex items-center justify-between max-w-lg mb-1">
            <h3 className="text-base font-bold text-white">Notifications & Alerts</h3>
            {saveStatus && (
              <span className="text-[11px] text-[#10b981] font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> {saveStatus}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mb-4">Configure local system popups and automated Gmail notifications.</p>

          <div className="space-y-3 max-w-lg">
            {/* Toggle 1: Local Desktop Notifications (Offline) */}
            <div className="bg-[#1c2033] border border-[#272e45] rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-emerald-400" />
                <div>
                  <span className="text-xs font-bold text-white block">Enable Local Desktop Notifications (Offline)</span>
                  <span className="text-[11px] text-slate-400">Trigger OS native popups for medication alerts</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleOfflineToggle}
                className={`w-12 h-6 rounded-full p-1 transition-colors ${enableOfflinePopups ? 'bg-[#10b981]' : 'bg-slate-700'}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${enableOfflinePopups ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>

            {/* Toggle 2: Gmail Notifications (Requires Internet) */}
            <div className="bg-[#1c2033] border border-[#272e45] rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-sky-400" />
                <div>
                  <span className="text-xs font-bold text-white block">Enable Gmail Notifications (Requires Internet)</span>
                  <span className="text-[11px] text-slate-400">Queue emails offline and send automatically when online</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGmailToggle}
                className={`w-12 h-6 rounded-full p-1 transition-colors ${enableGmailNotifications ? 'bg-[#38bdf8]' : 'bg-slate-700'}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${enableGmailNotifications ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>

            {/* Conditional Input: Recipient & Sender Email Configuration */}
            {enableGmailNotifications && (
              <div className="bg-[#161926] border border-[#2b334c] rounded-xl p-4 space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Recipient Email Address (Where alerts will be sent)</label>
                  <input
                    type="email"
                    placeholder="patient@gmail.com"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    onBlur={handleBlurSave}
                    className="w-full bg-[#1c2033] border border-[#272e45] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#38bdf8]"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Scheduled medication due reminders will be sent directly to this address.
                  </p>
                </div>

                <div className="bg-[#1c2033] border border-[#272e45] rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white block">Email Dispatcher Service</span>
                    <span className="text-[10px] text-slate-400">All alerts are sent to users via verified sender:</span>
                    <span className="text-[11px] text-[#38bdf8] font-mono font-medium block mt-0.5">johnleevargas25@gmail.com</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full shrink-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] text-emerald-400 font-semibold">Connected</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <hr className="border-[#24293e]" />

        {/* Account Section */}
        <div>
          <h3 className="text-base font-bold text-white mb-1">Account Information</h3>
          <p className="text-xs text-slate-400 mb-4">Active user credentials and profile details.</p>

          <div className="space-y-3 max-w-lg">
            <div className="bg-[#1c2033] border border-[#272e45] rounded-xl p-3.5 flex items-center gap-3">
              <UserCheck className="w-5 h-5 text-[#38bdf8]" />
              <div className="text-xs">
                <span className="text-slate-400 block text-[10px]">Logged in as</span>
                <span className="font-bold text-white">{displayName}{emailInfo}</span>
              </div>
            </div>

            <div className="bg-[#1c2033] border border-[#272e45] rounded-xl p-3.5 flex items-center gap-3">
              <Shield className="w-5 h-5 text-[#c084fc]" />
              <div className="text-xs">
                <span className="text-slate-400 block text-[10px]">User Role</span>
                <span className="font-bold text-white">Registered Patient Profile</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
