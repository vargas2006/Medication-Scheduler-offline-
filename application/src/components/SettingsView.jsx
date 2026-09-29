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

  // Gmail rotation state
  const [rotateStatus, setRotateStatus] = useState('');

  // Change password state
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwStatus, setPwStatus] = useState({ msg: '', ok: null });

  const displayName = user?.name || user?.username || 'User';
  const emailInfo = user?.email ? ` (${user.email})` : '';

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await callApi('get_settings', user?.user_id);
        if (res.success) {
          setEnableOfflinePopups(res.enable_offline_popups === 1);
          setEnableGmailNotifications(res.enable_gmail_notifications === 1);
          setRecipientEmail(res.recipient_email || '');
          setSenderEmail(res.sender_email || '');
          setSenderPassword(res.sender_password || '');
        }
      } catch (e) {
        console.error('Failed to load settings from DB:', e);
      }
    }
    loadSettings();
  }, [user]);

  const persistSettings = async (offlineVal, gmailVal, sendEmailVal = senderEmail, sendPassVal = senderPassword) => {
    try {
      setSaveStatus('Saving...');
      // recipient_email left empty — backend uses user's registered email automatically
      await callApi('save_settings', offlineVal ? 1 : 0, gmailVal ? 1 : 0, '', sendEmailVal, sendPassVal, user?.user_id);
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
    persistSettings(nextVal, enableGmailNotifications, senderEmail, senderPassword);
  };

  const handleGmailToggle = () => {
    const nextVal = !enableGmailNotifications;
    setEnableGmailNotifications(nextVal);
    persistSettings(enableOfflinePopups, nextVal, senderEmail, senderPassword);
  };

  const handleBlurSave = () => {
    persistSettings(enableOfflinePopups, enableGmailNotifications, senderEmail, senderPassword);
  };

  // Gmail credential rotation — clears saved sender and resets fields
  const handleRotateGmailCredentials = async () => {
    setRotateStatus('Clearing...');
    try {
      await callApi('save_settings',
        enableOfflinePopups ? 1 : 0,
        enableGmailNotifications ? 1 : 0,
        '', '', '', user?.user_id
      );
      setSenderEmail('');
      setSenderPassword('');
      setRotateStatus('Credentials cleared — enter new ones above and click away to save.');
      setTimeout(() => setRotateStatus(''), 5000);
    } catch (e) {
      setRotateStatus('Error clearing credentials.');
    }
  };

  // Change password handler
  const handleChangePassword = async () => {
    if (!currentPw || !newPw || !confirmPw) {
      setPwStatus({ msg: 'Please fill in all password fields.', ok: false }); return;
    }
    if (newPw !== confirmPw) {
      setPwStatus({ msg: 'New passwords do not match.', ok: false }); return;
    }
    if (newPw.length < 6) {
      setPwStatus({ msg: 'New password must be at least 6 characters.', ok: false }); return;
    }
    try {
      setPwStatus({ msg: 'Updating...', ok: null });
      const res = await callApi('change_password', user?.user_id, currentPw, newPw);
      if (res.success) {
        setPwStatus({ msg: '✓ Password updated successfully.', ok: true });
        setCurrentPw(''); setNewPw(''); setConfirmPw('');
      } else {
        setPwStatus({ msg: res.message || 'Failed to update password.', ok: false });
      }
    } catch (e) {
      setPwStatus({ msg: 'Error updating password.', ok: false });
    }
    setTimeout(() => setPwStatus({ msg: '', ok: null }), 4000);
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

            {/* Conditional Input: Sender Email Configuration */}
            {enableGmailNotifications && (
              <div className="bg-[#161926] border border-[#2b334c] rounded-xl p-4 space-y-3.5">

                {/* Auto-recipient info badge */}
                <div className="flex items-center gap-2.5 bg-sky-500/8 border border-sky-500/20 rounded-xl px-3.5 py-2.5">
                  <Mail className="w-4 h-4 text-sky-400 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[11px] font-semibold text-sky-300 block">Notification Recipient</span>
                    <span className="text-[10px] text-slate-400 block truncate">
                      Alerts will be sent automatically to your registered email:
                      <span className="text-sky-400 font-mono ml-1">{user?.email || 'your registered email'}</span>
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Sender Gmail Account <span className="text-slate-500">(Gmail address used to send alerts)</span></label>
                    <input
                      type="email"
                      placeholder="yourapp@gmail.com"
                      value={senderEmail}
                      onChange={(e) => setSenderEmail(e.target.value)}
                      onBlur={handleBlurSave}
                      className="w-full bg-[#1c2033] border border-[#272e45] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#38bdf8]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Gmail App Password <span className="text-slate-500">(16-char Google App Password)</span></label>
                    <input
                      type="password"
                      placeholder="xxxx xxxx xxxx xxxx"
                      value={senderPassword}
                      onChange={(e) => setSenderPassword(e.target.value)}
                      onBlur={handleBlurSave}
                      className="w-full bg-[#1c2033] border border-[#272e45] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#38bdf8]"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Generate this in Google Account → Security → 2-Step Verification → App passwords.
                    </p>
                  </div>

                  {/* Status badge + Rotate button */}
                  <div className="bg-[#1c2033] border border-[#272e45] rounded-xl p-3 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-white block">Email Dispatcher Service</span>
                        {senderEmail ? (
                          <span className="text-[11px] text-[#38bdf8] font-mono font-medium block mt-0.5">{senderEmail}</span>
                        ) : (
                          <span className="text-[11px] text-amber-400 font-medium block mt-0.5">⚠ Not configured — enter sender Gmail above</span>
                        )}
                      </div>
                      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full shrink-0 ${
                        senderEmail && senderPassword
                          ? 'bg-emerald-500/10 border border-emerald-500/20'
                          : 'bg-amber-500/10 border border-amber-500/20'
                      }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          senderEmail && senderPassword ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                        }`} />
                        <span className={`text-[10px] font-semibold ${
                          senderEmail && senderPassword ? 'text-emerald-400' : 'text-amber-400'
                        }`}>
                          {senderEmail && senderPassword ? 'Configured' : 'Not Set'}
                        </span>
                      </div>
                    </div>

                    {/* Rotate credentials button */}
                    {senderEmail && senderPassword && (
                      <div className="border-t border-[#272e45] pt-2.5">
                        <button
                          type="button"
                          onClick={handleRotateGmailCredentials}
                          className="flex items-center gap-2 text-[11px] font-semibold text-rose-400 hover:text-rose-300 transition-colors bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/20 rounded-lg px-3 py-1.5"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Rotate / Reset Gmail Credentials
                        </button>
                        {rotateStatus && (
                          <p className="text-[10px] text-amber-400 mt-1.5">{rotateStatus}</p>
                        )}
                      </div>
                    )}
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
                <span className="text-slate-400 block text-[10px]">Password Security</span>
                <span className="font-bold text-white">PBKDF2-SHA256 Hashed &nbsp;<span className="text-emerald-400 text-[10px] font-normal">✓ Secure</span></span>
              </div>
            </div>

            {/* Change Password */}
            <div className="bg-[#161926] border border-[#2b334c] rounded-xl p-4 space-y-3">
              <div>
                <span className="text-xs font-bold text-white block mb-0.5">Change Password</span>
                <span className="text-[10px] text-slate-400">Your password is securely hashed and never stored in plain text.</span>
              </div>
              <div className="space-y-2">
                <input
                  type="password"
                  placeholder="Current password"
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  className="w-full bg-[#1c2033] border border-[#272e45] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#38bdf8]"
                />
                <input
                  type="password"
                  placeholder="New password (min. 6 characters)"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  className="w-full bg-[#1c2033] border border-[#272e45] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#38bdf8]"
                />
                <input
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  className="w-full bg-[#1c2033] border border-[#272e45] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#38bdf8]"
                />
              </div>
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleChangePassword}
                  className="text-xs font-semibold bg-[#38bdf8] hover:bg-[#0ea5e9] text-[#0b0e17] px-4 py-1.5 rounded-lg transition-colors"
                >
                  Update Password
                </button>
                {pwStatus.msg && (
                  <span className={`text-[11px] font-semibold ${
                    pwStatus.ok === true ? 'text-emerald-400' :
                    pwStatus.ok === false ? 'text-rose-400' : 'text-slate-400'
                  }`}>{pwStatus.msg}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
