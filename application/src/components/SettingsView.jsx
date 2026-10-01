import React, { useState, useEffect } from 'react';
import { Moon, Sun, UserCheck, Shield, Bell, Mail, CheckCircle2, AlertCircle, Save, ShieldCheck, RefreshCw } from 'lucide-react';
import { callApi } from '../utils/pywebview';

export default function SettingsView({ user, theme = 'dark', onToggleTheme }) {
  const isDark = theme === 'dark';

  // Persistent Settings
  const [enableOfflinePopups, setEnableOfflinePopups] = useState(false);
  const [enableGmailNotifications, setEnableGmailNotifications] = useState(false);
  const [boundEmail, setBoundEmail] = useState('');
  const [isEmailVerified, setIsEmailVerified] = useState(false);

  // Binding OTP flow states
  const [inputGmail, setInputGmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);

  // Status messages
  const [bindStatus, setBindStatus] = useState({ msg: '', isError: false });
  const [saveStatus, setSaveStatus] = useState('');

  // Password change state
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwStatus, setPwStatus] = useState({ msg: '', ok: null });

  // Software Update State
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateStatus, setUpdateStatus] = useState({ msg: '', isError: false });

  const displayName = user?.name || user?.username || 'User';
  const emailInfo = user?.email ? ` (${user.email})` : '';

  const [appVersion, setAppVersion] = useState('1.0.15');

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

  const handleCheckForUpdates = async () => {
    setCheckingUpdate(true);
    setUpdateStatus({ msg: 'Checking remote manifest...', isError: false });
    try {
      const res = await callApi('check_for_updates');
      if (res && res.success) {
        if (res.current_version) {
          setAppVersion(res.current_version);
        }
        if (res.update_available) {
          setUpdateStatus({
            msg: `New version v${res.remote_version} available! Downloading update...`,
            isError: false
          });
          const upRes = await callApi('download_and_apply_update', res.download_url);
          if (upRes && !upRes.success) {
            setUpdateStatus({
              msg: `Update error: ${upRes.message || 'Failed to apply update.'}`,
              isError: true
            });
          } else {
            setUpdateStatus({
              msg: `Update v${res.remote_version} applied successfully! Please restart application.`,
              isError: false
            });
          }
        } else {
          setUpdateStatus({
            msg: `You are on the latest version (v${res.current_version || appVersion}).`,
            isError: false
          });
        }
      } else {
        setUpdateStatus({
          msg: res?.message || 'Unable to check for updates.',
          isError: true
        });
      }
    } catch (err) {
      setUpdateStatus({
        msg: 'Error connecting to update server.',
        isError: true
      });
    } finally {
      setCheckingUpdate(false);
    }
  };

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
      setSaveStatus('Settings Saved!');
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (e) {
      console.error('Failed to save settings:', e);
      setSaveStatus('Error saving settings');
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
        setBindStatus({ msg: res.message || 'Invalid verification code.', isError: true });
      }
    } catch (e) {
      setBindStatus({ msg: 'Error verifying code.', isError: true });
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwStatus({ msg: '', ok: null });

    if (!currentPw || !newPw || !confirmPw) {
      setPwStatus({ msg: 'Please fill in all password fields.', ok: false });
      return;
    }

    if (newPw !== confirmPw) {
      setPwStatus({ msg: 'New passwords do not match.', ok: false });
      return;
    }

    if (newPw.length < 4) {
      setPwStatus({ msg: 'New password must be at least 4 characters long.', ok: false });
      return;
    }

    try {
      const res = await callApi('change_password', user?.user_id, currentPw, newPw);
      if (res.success) {
        setPwStatus({ msg: res.message || 'Password changed successfully!', ok: true });
        setCurrentPw('');
        setNewPw('');
        setConfirmPw('');
      } else {
        setPwStatus({ msg: res.message || 'Failed to change password.', ok: false });
      }
    } catch (err) {
      setPwStatus({ msg: 'Error changing password.', ok: false });
    }
  };

  return (
    <div className="p-6 space-y-5 overflow-y-auto h-full bg-[#f5f7fa] dark:bg-[#0f172a] transition-colors">
      {/* Save Status Banner */}
      {saveStatus && (
        <div className="p-3 bg-[#d1fae5] dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-[#047857] dark:text-emerald-300 text-xs font-semibold rounded-md flex items-center gap-2 shadow-2xs">
          <CheckCircle2 className="w-4 h-4" />
          <span>{saveStatus}</span>
        </div>
      )}

      {/* Section 1: Notification Preferences */}
      <div className="bg-white dark:bg-[#1e293b] border border-[#d9e0e8] dark:border-[#334155] rounded-lg p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#d9e0e8] dark:border-[#334155] pb-3">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#2563eb] dark:text-blue-400" />
            <h2 className="font-semibold text-[#172033] dark:text-slate-100 text-sm">Notification Preferences</h2>
          </div>
          <button
            onClick={handleSaveSettings}
            className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-medium px-3.5 py-1.5 rounded-md flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Preferences</span>
          </button>
        </div>

        {/* Offline Desktop Popups Checkbox */}
        <div className="flex items-start justify-between gap-4 p-3 bg-[#f8fafc] dark:bg-[#0f172a] border border-[#d9e0e8] dark:border-[#334155] rounded-md">
          <div className="space-y-0.5">
            <span className="font-semibold text-xs text-[#172033] dark:text-slate-200">
              Offline Desktop Popups &amp; Audio Alerts
            </span>
            <p className="text-[11px] text-[#64748b] dark:text-slate-400">
              Receive desktop windows notifications when scheduled medication doses become due.
            </p>
          </div>
          <input
            type="checkbox"
            checked={enableOfflinePopups}
            onChange={(e) => setEnableOfflinePopups(e.target.checked)}
            className="w-4 h-4 rounded border-[#d9e0e8] text-[#2563eb] focus:ring-0 cursor-pointer accent-[#2563eb] mt-1"
          />
        </div>

        {/* Gmail Notification Checkbox & Binding Box */}
        <div className="p-3 bg-[#f8fafc] dark:bg-[#0f172a] border border-[#d9e0e8] dark:border-[#334155] rounded-md space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-0.5">
              <span className="font-semibold text-xs text-[#172033] dark:text-slate-200 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#2563eb] dark:text-blue-400" />
                <span>Automated Gmail Medication Alerts</span>
              </span>
              <p className="text-[11px] text-[#64748b] dark:text-slate-400">
                Receive HTML medication schedule notifications sent to your verified Gmail address.
              </p>
            </div>
            <input
              type="checkbox"
              checked={enableGmailNotifications}
              onChange={(e) => setEnableGmailNotifications(e.target.checked)}
              className="w-4 h-4 rounded border-[#d9e0e8] text-[#2563eb] focus:ring-0 cursor-pointer accent-[#2563eb] mt-1"
            />
          </div>

          {/* Bound Status */}
          {boundEmail && isEmailVerified ? (
            <div className="p-2.5 bg-[#d1fae5] dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded text-xs text-[#047857] dark:text-emerald-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-4 h-4 text-[#16a34a]" />
                Bound Gmail: <strong className="font-semibold">{boundEmail}</strong>
              </span>
              <span className="text-[10px] bg-[#16a34a] text-white px-2 py-0.5 rounded font-semibold">Verified</span>
            </div>
          ) : (
            <div className="space-y-2 pt-1 border-t border-[#d9e0e8] dark:border-[#334155]">
              <span className="text-xs font-medium text-[#172033] dark:text-slate-200">
                Bind &amp; Verify Gmail Address:
              </span>

              {bindStatus.msg && (
                <div className={`p-2 rounded text-xs font-medium ${
                  bindStatus.isError ? 'bg-[#fee2e2] text-[#b91c1c] border border-rose-200' : 'bg-[#d1fae5] text-[#047857] border border-emerald-200'
                }`}>
                  {bindStatus.msg}
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="email"
                  placeholder="Enter your Gmail address"
                  value={inputGmail}
                  onChange={(e) => setInputGmail(e.target.value)}
                  className="flex-1 bg-white dark:bg-[#1e293b] border border-[#d9e0e8] dark:border-[#334155] rounded-md px-3 py-1.5 text-xs text-[#172033] dark:text-slate-100 focus:outline-none focus:border-[#2563eb]"
                />
                <button
                  type="button"
                  onClick={handleSendCode}
                  className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-medium text-xs px-3.5 py-1.5 rounded-md transition-colors shadow-2xs"
                >
                  Send OTP Code
                </button>
              </div>

              {codeSent && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="Enter 6-digit code"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    className="w-36 bg-white dark:bg-[#1e293b] border border-[#d9e0e8] dark:border-[#334155] rounded-md px-3 py-1.5 text-xs text-[#172033] dark:text-slate-100 font-mono focus:outline-none focus:border-[#2563eb]"
                  />
                  <button
                    type="button"
                    onClick={handleVerifyAndBind}
                    className="bg-[#16a34a] hover:bg-[#15803d] text-white font-medium text-xs px-3.5 py-1.5 rounded-md transition-colors shadow-2xs"
                  >
                    Verify &amp; Bind
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Section 2: Account Profile & Security */}
      <div className="grid grid-cols-2 gap-5">
        {/* Account Summary */}
        <div className="bg-white dark:bg-[#1e293b] border border-[#d9e0e8] dark:border-[#334155] rounded-lg p-5 shadow-2xs space-y-3">
          <div className="flex items-center gap-2 border-b border-[#d9e0e8] dark:border-[#334155] pb-3">
            <UserCheck className="w-4 h-4 text-[#2563eb] dark:text-blue-400" />
            <h2 className="font-semibold text-[#172033] dark:text-slate-100 text-sm">Account Summary</h2>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-[#f1f5f9] dark:border-[#334155]">
              <span className="text-[#64748b] dark:text-slate-400">Account Name:</span>
              <span className="font-semibold text-[#172033] dark:text-slate-100">{displayName}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#f1f5f9] dark:border-[#334155]">
              <span className="text-[#64748b] dark:text-slate-400">Username:</span>
              <span className="font-semibold text-[#172033] dark:text-slate-100">{user?.username || '—'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#f1f5f9] dark:border-[#334155]">
              <span className="text-[#64748b] dark:text-slate-400">Registered Email:</span>
              <span className="font-semibold text-[#172033] dark:text-slate-100">{user?.email || '—'}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-[#64748b] dark:text-slate-400">Application Version:</span>
              <span className="font-mono font-semibold text-[#2563eb] dark:text-blue-400">v{appVersion}</span>
            </div>
          </div>
        </div>

        {/* Change Password Form */}
        <div className="bg-white dark:bg-[#1e293b] border border-[#d9e0e8] dark:border-[#334155] rounded-lg p-5 shadow-2xs space-y-3">
          <div className="flex items-center gap-2 border-b border-[#d9e0e8] dark:border-[#334155] pb-3">
            <Shield className="w-4 h-4 text-[#2563eb] dark:text-blue-400" />
            <h2 className="font-semibold text-[#172033] dark:text-slate-100 text-sm">Security &amp; Password</h2>
          </div>

          {pwStatus.msg && (
            <div className={`p-2 rounded text-xs font-medium ${
              pwStatus.ok ? 'bg-[#d1fae5] text-[#047857] border border-emerald-200' : 'bg-[#fee2e2] text-[#b91c1c] border border-rose-200'
            }`}>
              {pwStatus.msg}
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-2.5 text-xs">
            <div>
              <label className="block font-medium text-[#64748b] dark:text-slate-300 mb-1">Current Password</label>
              <input
                type="password"
                required
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                className="w-full bg-[#f8fafc] dark:bg-[#0f172a] border border-[#d9e0e8] dark:border-[#334155] rounded-md px-3 py-1.5 text-xs text-[#172033] dark:text-slate-100 focus:outline-none focus:border-[#2563eb]"
              />
            </div>

            <div>
              <label className="block font-medium text-[#64748b] dark:text-slate-300 mb-1">New Password</label>
              <input
                type="password"
                required
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                className="w-full bg-[#f8fafc] dark:bg-[#0f172a] border border-[#d9e0e8] dark:border-[#334155] rounded-md px-3 py-1.5 text-xs text-[#172033] dark:text-slate-100 focus:outline-none focus:border-[#2563eb]"
              />
            </div>

            <div>
              <label className="block font-medium text-[#64748b] dark:text-slate-300 mb-1">Confirm New Password</label>
              <input
                type="password"
                required
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                className="w-full bg-[#f8fafc] dark:bg-[#0f172a] border border-[#d9e0e8] dark:border-[#334155] rounded-md px-3 py-1.5 text-xs text-[#172033] dark:text-slate-100 focus:outline-none focus:border-[#2563eb]"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-medium text-xs py-2 rounded-md transition-colors shadow-2xs mt-1"
            >
              Update Password
            </button>
          </form>
        </div>
      </div>

      {/* Section 3: Software Updates */}
      <div className="bg-white dark:bg-[#1e293b] border border-[#d9e0e8] dark:border-[#334155] rounded-lg p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between border-b border-[#d9e0e8] dark:border-[#334155] pb-3">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-[#2563eb] dark:text-blue-400" />
            <h2 className="font-semibold text-[#172033] dark:text-slate-100 text-sm">Software Updates</h2>
          </div>
          <span className="text-xs font-mono font-semibold text-[#2563eb] dark:text-blue-400 bg-[#eff6ff] dark:bg-blue-950/60 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-900">
            v{appVersion}
          </span>
        </div>

        <div className="flex items-center justify-between gap-4 p-3 bg-[#f8fafc] dark:bg-[#0f172a] border border-[#d9e0e8] dark:border-[#334155] rounded-md flex-wrap">
          <div className="space-y-0.5">
            <span className="font-semibold text-xs text-[#172033] dark:text-slate-200 block">
              Check for Application Updates
            </span>
            <p className="text-[11px] text-[#64748b] dark:text-slate-400">
              Check if a newer version of Smart Medication Scheduler is available.
            </p>
          </div>

          <button
            type="button"
            id="chk-update-btn"
            disabled={checkingUpdate}
            onClick={handleCheckForUpdates}
            className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-medium text-xs px-3.5 py-1.5 rounded-md flex items-center gap-1.5 transition-colors shadow-2xs disabled:opacity-50 cursor-pointer shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checkingUpdate ? 'animate-spin' : ''}`} />
            <span>{checkingUpdate ? 'Checking for updates...' : 'Check for Updates'}</span>
          </button>
        </div>

        {updateStatus.msg && (
          <div className={`p-2.5 rounded-md text-xs font-medium flex items-center gap-2 ${
            updateStatus.isError
              ? 'bg-[#fee2e2] text-[#b91c1c] border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900'
              : 'bg-[#d1fae5] text-[#047857] border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900'
          }`}>
            {updateStatus.isError ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
            <span>{updateStatus.msg}</span>
          </div>
        )}
      </div>
    </div>
  );
}
