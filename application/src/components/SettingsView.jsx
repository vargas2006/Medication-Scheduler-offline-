import React, { useState, useEffect } from 'react';
import { Moon, Sun, UserCheck, Shield, Bell, Mail, CheckCircle2, AlertCircle, Save, ShieldCheck } from 'lucide-react';
import { callApi } from '../utils/pywebview';

export default function SettingsView({ user, theme = 'dark', onToggleTheme }) {
  const isDark = theme === 'dark';

  const [enableOfflinePopups, setEnableOfflinePopups] = useState(false);
  const [enableGmailNotifications, setEnableGmailNotifications] = useState(false);
  const [boundEmail, setBoundEmail] = useState('');
  const [isEmailVerified, setIsEmailVerified] = useState(false);

  const [inputGmail, setInputGmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);

  const [bindStatus, setBindStatus] = useState({ msg: '', isError: false });
  const [saveStatus, setSaveStatus] = useState('');

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwStatus, setPwStatus] = useState({ msg: '', ok: null });

  const displayName = user?.name || user?.username || 'User';
  const emailInfo = user?.email ? ` (${user.email})` : '';

  const [appVersion, setAppVersion] = useState('1.0.5');

  const loadSettings = async () => {
    try {
      const res = await callApi('get_settings', user?.user_id);
      if (res.success) {
        setEnableOfflinePopups(res.enable_offline_popups === 1);
        setEnableGmailNotifications(res.enable_gmail_notifications === 1);
        setBoundEmail(res.recipient_email || '');
        setIsEmailVerified(res.is_email_verified === 1);
        if (res.recipient_email) {
          setInputGmail(res.recipient_email);
        }
      }
      const verRes = await callApi('get_current_version');
      if (verRes && verRes.version) {
        setAppVersion(verRes.version);
      }
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
  };

  useEffect(() => {
    loadSettings();
  }, [user]);

  const handleSaveSettings = async () => {
    try {
      setSaveStatus('Saving...');
      await callApi(
        'save_settings',
        enableOfflinePopups ? 1 : 0,
        enableGmailNotifications ? 1 : 0,
        boundEmail,
        '',
        '',
        user?.user_id,
        isEmailVerified ? 1 : 0
      );
      setSaveStatus('Saved!');
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (e) {
      console.error('Failed to save settings:', e);
      setSaveStatus('Error saving');
    }
  };

  const handleSendCode = async () => {
    const emailToVerify = inputGmail.trim();
    if (!emailToVerify || !emailToVerify.includes('@')) {
      setBindStatus({ msg: 'Please enter a valid Gmail address.', isError: true });
      return;
    }

    setBindStatus({ msg: 'Sending 6-digit verification code to your Gmail...', isError: false });
    try {
      const res = await callApi('send_gmail_bind_code', user?.user_id, emailToVerify);
      if (res.success) {
        setCodeSent(true);
        setBindStatus({ msg: res.message || `Code sent to ${emailToVerify}! Check your inbox.`, isError: false });
      } else {
        setBindStatus({ msg: res.message || 'Failed to send code.', isError: true });
      }
    } catch (e) {
      setBindStatus({ msg: 'Error sending verification code.', isError: true });
    }
  };

  const handleVerifyAndBind = async () => {
    const code = otpCode.trim();
    if (!code) {
      setBindStatus({ msg: 'Please enter the 6-digit verification code.', isError: true });
      return;
    }
    setBindStatus({ msg: 'Verifying code...', isError: false });
    try {
      const res = await callApi('verify_and_bind_gmail', user?.user_id, inputGmail.trim(), code);
      if (res.success) {
        setBoundEmail(inputGmail.trim());
        setIsEmailVerified(true);
        setEnableGmailNotifications(true);
        setCodeSent(false);
        setOtpCode('');
        setBindStatus({ msg: res.message || 'Gmail verified and bound successfully!', isError: false });
      } else {
        setBindStatus({ msg: res.message || 'Invalid code.', isError: true });
      }
    } catch (e) {
      setBindStatus({ msg: 'Error verifying code.', isError: true });
    }
  };

  const handleUnbind = async () => {
    try {
      await callApi('unbind_gmail', user?.user_id);
      setBoundEmail('');
      setIsEmailVerified(false);
      setInputGmail('');
      setCodeSent(false);
      setOtpCode('');
      setEnableGmailNotifications(false);
      setBindStatus({ msg: 'Gmail unbound.', isError: false });
      setTimeout(() => setBindStatus({ msg: '', isError: false }), 3000);
    } catch (e) {
      setBindStatus({ msg: 'Error unbinding Gmail.', isError: true });
    }
  };

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
        setPwStatus({ msg: 'Password updated successfully.', ok: true });
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
      <div className="bg-[#151926] border border-[#222838] rounded-2xl p-6 h-full space-y-6 overflow-y-auto shadow-sm">

        {/* Section 1: Appearance & Theme */}
        <div>
          <h3 className="text-base font-bold text-white mb-1">Appearance & Theme</h3>
          <p className="text-xs text-slate-400 mb-4">Toggle between high-contrast dark mode and light theme.</p>

          <div className="bg-[#1c2234] border border-[#262f46] rounded-xl p-4 flex items-center justify-between max-w-lg">
            <div className="flex items-center gap-3">
              {isDark ? <Moon className="w-5 h-5 text-indigo-400" /> : <Sun className="w-5 h-5 text-amber-400" />}
              <div>
                <span className="text-xs font-semibold text-white block">Theme Mode</span>
                <span className="text-[11px] text-slate-400">{isDark ? 'Dark Mode Active' : 'Light Mode Active'}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={onToggleTheme}
              className={`w-11 h-6 rounded-full p-1 transition-colors ${isDark ? 'bg-indigo-600' : 'bg-amber-500'}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${isDark ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>

        <hr className="border-[#1e2436]" />

        {/* Section 2: Notifications & Alerts */}
        <div>
          <div className="flex items-center justify-between max-w-lg mb-1">
            <h3 className="text-base font-bold text-white">Notifications & Alerts</h3>
            {saveStatus && (
              <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> {saveStatus}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mb-4">Configure system popups and verify Gmail for online medication alerts.</p>

          <div className="space-y-4 max-w-lg">

            {/* Offline Popups Toggle */}
            <div className="bg-[#1c2234] border border-[#262f46] rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-emerald-400" />
                <div>
                  <span className="text-xs font-semibold text-white block">Local Desktop Notifications (Offline)</span>
                  <span className="text-[11px] text-slate-400">Trigger OS native popups for medication alerts</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEnableOfflinePopups(!enableOfflinePopups)}
                className={`w-11 h-6 rounded-full p-1 transition-colors ${enableOfflinePopups ? 'bg-emerald-600' : 'bg-slate-700'}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${enableOfflinePopups ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>

            {/* Gmail Reminders Toggle */}
            <div className="bg-[#1c2234] border border-[#262f46] rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-sky-400" />
                <div>
                  <span className="text-xs font-semibold text-white block">Gmail Reminders (Requires Internet)</span>
                  <span className="text-[11px] text-slate-400">Receive medication reminders directly to verified Gmail</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEnableGmailNotifications(!enableGmailNotifications)}
                className={`w-11 h-6 rounded-full p-1 transition-colors ${enableGmailNotifications ? 'bg-sky-600' : 'bg-slate-700'}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${enableGmailNotifications ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>

            {/* Gmail Notification Binding Box */}
            <div className="bg-[#151926] border border-[#222838] rounded-xl p-4 space-y-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">Gmail Notification Binding</span>
                  <span className="text-[10px] text-slate-400">Verify your Gmail address using a 6-digit code to enable alerts.</span>
                </div>

                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full shrink-0 ${
                  isEmailVerified && boundEmail
                    ? 'bg-emerald-500/10 border border-emerald-500/20'
                    : 'bg-amber-500/10 border border-amber-500/20'
                }`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    isEmailVerified && boundEmail ? 'bg-emerald-400' : 'bg-amber-400'
                  }`} />
                  <span className={`text-[10px] font-semibold ${
                    isEmailVerified && boundEmail ? 'text-emerald-400' : 'text-amber-400'
                  }`}>
                    {isEmailVerified && boundEmail ? 'Verified & Bound' : 'Not Verified'}
                  </span>
                </div>
              </div>

              {bindStatus.msg && (
                <div className={`p-2.5 rounded-lg flex items-center gap-2 text-xs ${
                  bindStatus.isError ? 'bg-rose-500/15 border border-rose-500/30 text-rose-300' : 'bg-sky-500/15 border border-sky-500/30 text-sky-300'
                }`}>
                  {bindStatus.isError ? <AlertCircle className="w-3.5 h-3.5 shrink-0" /> : <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
                  <span className="text-[11px] font-medium">{bindStatus.msg}</span>
                </div>
              )}

              {isEmailVerified && boundEmail ? (
                <div className="bg-[#1c2234] border border-[#262f46] rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <div>
                      <span className="text-[10px] text-slate-400 block">Bound Gmail Address</span>
                      <span className="text-xs font-mono font-bold text-sky-400">{boundEmail}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleUnbind}
                    className="text-[11px] font-semibold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Unbind Gmail
                  </button>
                </div>
              ) : (

                <div className="space-y-3 border-t border-[#262f46] pt-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Enter Gmail Address for Notifications</label>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        placeholder="yourname@gmail.com"
                        value={inputGmail}
                        onChange={(e) => setInputGmail(e.target.value)}
                        className="flex-1 bg-[#1c2234] border border-[#262f46] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                      />
                      <button
                        type="button"
                        onClick={handleSendCode}
                        className="text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white px-3.5 py-2 rounded-xl transition-colors shrink-0"
                      >
                        {codeSent ? 'Resend Code' : 'Send Code'}
                      </button>
                    </div>
                  </div>

                  {codeSent && (
                    <div className="bg-[#1c2234] border border-[#262f46] rounded-xl p-3 space-y-2.5">
                      <label className="block text-xs font-semibold text-slate-300">Enter 6-Digit Verification Code</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          maxLength={6}
                          placeholder="123456"
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                          className="w-36 bg-[#151926] border border-[#262f46] rounded-xl px-3 py-2 text-center text-sm font-mono tracking-widest text-sky-400 focus:outline-none focus:border-sky-500"
                        />
                        <button
                          type="button"
                          onClick={handleVerifyAndBind}
                          className="flex-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl transition-colors"
                        >
                          Verify & Bind Gmail
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleSaveSettings}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow-sm transition-all"
              >
                <Save className="w-4 h-4" />
                Save Settings
              </button>
            </div>
          </div>
        </div>

        <hr className="border-[#1e2436]" />

        {/* Section 3: Account Information */}
        <div>
          <h3 className="text-base font-bold text-white mb-1">Account Information</h3>
          <p className="text-xs text-slate-400 mb-4">Active user credentials and profile details.</p>

          <div className="space-y-3 max-w-lg">
            <div className="bg-[#1c2234] border border-[#262f46] rounded-xl p-3.5 flex items-center gap-3">
              <UserCheck className="w-5 h-5 text-sky-400" />
              <div className="text-xs">
                <span className="text-slate-400 block text-[10px]">Logged in as</span>
                <span className="font-semibold text-white">{displayName}{emailInfo}</span>
              </div>
            </div>

            <div className="bg-[#1c2234] border border-[#262f46] rounded-xl p-3.5 flex items-center gap-3">
              <Shield className="w-5 h-5 text-purple-400" />
              <div className="text-xs">
                <span className="text-slate-400 block text-[10px]">Password Security</span>
                <span className="font-semibold text-white">PBKDF2-SHA256 Hashed &nbsp;<span className="text-emerald-400 text-[10px] font-normal">Secure</span></span>
              </div>
            </div>

            {/* Change Password Box */}
            <div className="bg-[#151926] border border-[#222838] rounded-xl p-4 space-y-3">
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
                  className="w-full bg-[#1c2234] border border-[#262f46] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                />
                <input
                  type="password"
                  placeholder="New password (min. 6 characters)"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  className="w-full bg-[#1c2234] border border-[#262f46] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                />
                <input
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  className="w-full bg-[#1c2234] border border-[#262f46] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleChangePassword}
                  className="text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white px-4 py-2 rounded-lg transition-colors"
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

            {/* Software Updates Box */}
            <div className="bg-[#151926] border border-[#222838] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">Software Updates</span>
                  <span className="text-[10px] text-slate-400">Current App Version: <strong className="text-purple-400 font-mono">v{appVersion}</strong></span>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    const btn = document.getElementById('chk-update-btn');
                    const statusText = document.getElementById('chk-update-status');
                    if (btn) btn.disabled = true;
                    if (statusText) statusText.innerText = 'Checking remote manifest...';
                    try {
                      const res = await callApi('check_for_updates');
                      if (res.success) {
                        if (res.current_version) {
                          setAppVersion(res.current_version);
                        }
                        if (res.update_available) {
                          if (statusText) statusText.innerText = `New version v${res.remote_version} available! Downloading...`;
                          const upRes = await callApi('download_and_apply_update', res.download_url);
                          if (!upRes.success && statusText) {
                            statusText.innerText = `Update error: ${upRes.message}`;
                          }
                        } else {
                          if (statusText) statusText.innerText = `You are on the latest version (v${res.current_version || appVersion}).`;
                        }
                      } else {
                        if (statusText) statusText.innerText = res.message || 'Unable to check for updates.';
                      }
                    } catch (err) {
                      if (statusText) statusText.innerText = 'Error connecting to update server.';
                    } finally {
                      if (btn) btn.disabled = false;
                    }
                  }}
                  id="chk-update-btn"
                  className="text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                >
                  Check for Updates
                </button>
              </div>
              <div id="chk-update-status" className="text-[11px] font-medium text-slate-400"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
