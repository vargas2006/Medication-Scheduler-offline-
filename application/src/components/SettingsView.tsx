import React, { useState, useEffect } from 'react';
import {
  Moon,
  Sun,
  Bell,
  Volume2,
  KeyRound,
  LogOut,
  Check,
  AlertCircle,
  Save,
  X,
  Mail,
  RefreshCw,
  ShieldCheck,
  Send,
  CheckCircle2
} from 'lucide-react';
import { callApi } from '../utils/pywebview';
import { User } from '../types';

interface SettingsViewProps {
  user: User | null;
  theme?: 'dark' | 'light' | string;
  onToggleTheme: () => void;
  onLogout?: () => void;
}

export default function SettingsView({ user, theme = 'light', onToggleTheme, onLogout }: SettingsViewProps): React.JSX.Element {
  const isDark = theme === 'dark';

  const [enableNotifications, setEnableNotifications] = useState<boolean>(true);
  const [soundAlerts, setSoundAlerts] = useState<boolean>(true);
  const [reminderTime, setReminderTime] = useState<string>('10 minutes before');

  // Existing settings from backend
  const [enableOfflinePopups, setEnableOfflinePopups] = useState<boolean>(true);
  const [enableGmailNotifications, setEnableGmailNotifications] = useState<boolean>(false);
  const [boundEmail, setBoundEmail] = useState<string>('');
  const [isEmailVerified, setIsEmailVerified] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<string>('');

  // Online Notifications State
  const [inputGmail, setInputGmail] = useState<string>('');
  const [otpCode, setOtpCode] = useState<string>('');
  const [codeSent, setCodeSent] = useState<boolean>(false);
  const [sendingCode, setSendingCode] = useState<boolean>(false);
  const [verifyingCode, setVerifyingCode] = useState<boolean>(false);
  const [testingNotification, setTestingNotification] = useState<boolean>(false);
  const [bindStatus, setBindStatus] = useState<{ msg: string; isError: boolean }>({ msg: '', isError: false });

  // Software Update State
  const [appVersion, setAppVersion] = useState<string>('1.2.2');
  const [checkingUpdate, setCheckingUpdate] = useState<boolean>(false);
  const [updateStatus, setUpdateStatus] = useState<{ msg: string; isError: boolean }>({ msg: '', isError: false });

  // Password modal state
  const [showPasswordModal, setShowPasswordModal] = useState<boolean>(false);
  const [currentPw, setCurrentPw] = useState<string>('');
  const [newPw, setNewPw] = useState<string>('');
  const [confirmPw, setConfirmPw] = useState<string>('');
  const [pwMsg, setPwMsg] = useState<{ text: string; isError: boolean }>({ text: '', isError: false });
  const [pwLoading, setPwLoading] = useState<boolean>(false);

  const loadSettings = async () => {
    try {
      const res = await callApi('get_settings', user?.user_id);
      if (res && res.success) {
        setEnableOfflinePopups(res.enable_offline_popups === 1);
        setEnableNotifications(res.enable_offline_popups === 1);
        setEnableGmailNotifications(res.enable_gmail_notifications === 1);
        setBoundEmail(res.recipient_email || '');
        if (res.recipient_email) {
          setInputGmail(res.recipient_email);
        }
        setIsEmailVerified(res.is_email_verified === 1);
      }

      // Fetch dynamic current app version
      const vRes = await callApi('get_current_version');
      if (vRes && vRes.success && vRes.version) {
        setAppVersion(vRes.version);
      }
    } catch (e) {
      console.error('Failed loading settings', e);
    }
  };

  useEffect(() => {
    loadSettings();
  }, [user]);

  const handleToggleNotifications = async () => {
    const nextVal = !enableNotifications;
    setEnableNotifications(nextVal);
    setEnableOfflinePopups(nextVal);
    try {
      await callApi(
        'save_settings',
        nextVal ? 1 : 0,
        enableGmailNotifications ? 1 : 0,
        boundEmail,
        '',
        '',
        user?.user_id,
        isEmailVerified ? 1 : 0
      );
      setSaveStatus('Desktop notifications setting updated!');
      setTimeout(() => setSaveStatus(''), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleSound = () => {
    setSoundAlerts(!soundAlerts);
    setSaveStatus('Preferences saved!');
    setTimeout(() => setSaveStatus(''), 2000);
  };

  const handleToggleGmailNotifications = async () => {
    const nextVal = !enableGmailNotifications;
    setEnableGmailNotifications(nextVal);
    try {
      await callApi(
        'save_settings',
        enableOfflinePopups ? 1 : 0,
        nextVal ? 1 : 0,
        boundEmail,
        '',
        '',
        user?.user_id,
        isEmailVerified ? 1 : 0
      );
      setSaveStatus(nextVal ? 'Online Gmail notifications enabled!' : 'Online Gmail notifications disabled!');
      setTimeout(() => setSaveStatus(''), 2500);
    } catch (e) {
      console.error(e);
      setSaveStatus('Error saving Gmail notifications setting.');
    }
  };

  const handleSendCode = async () => {
    const emailToVerify = inputGmail.trim();
    if (!emailToVerify || !emailToVerify.includes('@')) {
      setBindStatus({ msg: 'Please enter a valid Gmail address.', isError: true });
      return;
    }

    setSendingCode(true);
    setBindStatus({ msg: 'Sending 6-digit verification code to your Gmail...', isError: false });
    try {
      const res = await callApi('send_gmail_bind_code', user?.user_id, emailToVerify);
      if (res && res.success) {
        setCodeSent(true);
        setBindStatus({ msg: res.message || `Code sent to ${emailToVerify}! Please check your inbox.`, isError: false });
      } else {
        setBindStatus({ msg: res?.message || 'Failed to send verification code.', isError: true });
      }
    } catch (e) {
      setBindStatus({ msg: 'Error sending verification code.', isError: true });
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerifyAndBind = async () => {
    const code = otpCode.trim();
    if (!code) {
      setBindStatus({ msg: 'Please enter the 6-digit verification code.', isError: true });
      return;
    }
    setVerifyingCode(true);
    setBindStatus({ msg: 'Verifying code...', isError: false });
    try {
      const targetEmail = inputGmail.trim();
      const res = await callApi('verify_and_bind_gmail', user?.user_id, targetEmail, code);
      if (res && res.success) {
        setBoundEmail(targetEmail);
        setIsEmailVerified(true);
        setEnableGmailNotifications(true);
        setCodeSent(false);
        setOtpCode('');
        setBindStatus({ msg: res.message || 'Gmail verified & bound successfully!', isError: false });
        setTimeout(() => setBindStatus({ msg: '', isError: false }), 4000);
      } else {
        setBindStatus({ msg: res?.message || 'Invalid or expired code.', isError: true });
      }
    } catch (e) {
      setBindStatus({ msg: 'Error verifying code.', isError: true });
    } finally {
      setVerifyingCode(false);
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
      setBindStatus({ msg: 'Gmail unbound successfully.', isError: false });
      setTimeout(() => setBindStatus({ msg: '', isError: false }), 3000);
    } catch (e) {
      setBindStatus({ msg: 'Error unbinding Gmail.', isError: true });
    }
  };

  const handleSendTestNotification = async () => {
    setTestingNotification(true);
    try {
      const res = await callApi('send_test_notification');
      if (res && res.success) {
        setBindStatus({ msg: 'Test notification & email sent successfully! Check your inbox.', isError: false });
      } else {
        setBindStatus({ msg: res?.message || 'Failed to send test notification.', isError: true });
      }
    } catch (e) {
      setBindStatus({ msg: 'Error sending test notification.', isError: true });
    } finally {
      setTestingNotification(false);
      setTimeout(() => setBindStatus({ msg: '', isError: false }), 4000);
    }
  };

  const handleCheckForUpdates = async () => {
    setCheckingUpdate(true);
    setUpdateStatus({ msg: 'Checking remote manifest for updates...', isError: false });
    try {
      const res = await callApi('check_for_updates');
      if (res && res.success) {
        if (res.current_version) {
          setAppVersion(res.current_version);
        }
        if (res.update_available) {
          setUpdateStatus({
            msg: `New version v${res.remote_version} available! Downloading update package...`,
            isError: false
          });
          const upRes = await callApi('download_and_apply_update', res.download_url);
          if (upRes && !upRes.success) {
            setUpdateStatus({
              msg: `Update failed: ${upRes.message || 'Failed to apply update.'}`,
              isError: true
            });
          } else {
            setUpdateStatus({
              msg: `Update v${res.remote_version} applied successfully! Please restart the application.`,
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
        msg: 'Error connecting to update server. Please check your internet connection.',
        isError: true
      });
    } finally {
      setCheckingUpdate(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPw || !newPw || !confirmPw) {
      setPwMsg({ text: 'Please fill in all fields.', isError: true });
      return;
    }
    if (newPw !== confirmPw) {
      setPwMsg({ text: 'New passwords do not match.', isError: true });
      return;
    }
    if (newPw.length < 6) {
      setPwMsg({ text: 'Password must be at least 6 characters.', isError: true });
      return;
    }

    setPwLoading(true);
    setPwMsg({ text: '', isError: false });

    try {
      const res = await callApi('change_password', user?.user_id, currentPw, newPw);
      if (res && res.success) {
        setPwMsg({ text: 'Password updated successfully!', isError: false });
        setTimeout(() => {
          setShowPasswordModal(false);
          setCurrentPw('');
          setNewPw('');
          setConfirmPw('');
          setPwMsg({ text: '', isError: false });
        }, 1200);
      } else {
        setPwMsg({ text: res?.message || 'Failed to update password.', isError: true });
      }
    } catch (err) {
      setPwMsg({ text: 'Error connecting to database.', isError: true });
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-7 space-y-4 sm:space-y-5 h-full flex flex-col overflow-hidden transition-colors duration-200">
      {saveStatus && (
        <div className="p-3 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 rounded-xl text-xs font-medium animate-fadeIn flex items-center gap-2 shrink-0">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{saveStatus}</span>
        </div>
      )}

      {/* Main Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 min-h-0 overflow-hidden">
        {/* Left Form Settings (8 cols) - Scrollable */}
        <div className="lg:col-span-8 space-y-5 h-full overflow-y-auto custom-scrollbar pr-1">
          {/* 1. APPLICATION SETTINGS CARD */}
          <div className="glass-surface bg-white/75 dark:bg-[#13222f]/75 border border-white/80 dark:border-white/10 rounded-2xl p-6 shadow-sm space-y-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#1E2837] dark:text-white pb-3 border-b border-[#E3E8EE] dark:border-[#1c3345]">
              Application Settings
            </h3>

            {/* Theme Toggle Buttons */}
            <div>
              <label className="block text-xs font-semibold text-[#64748B] dark:text-[#859ba8] mb-2">
                Theme
              </label>
              <div className="inline-flex p-1 bg-[#F3F6F9] dark:bg-[#172838] border border-[#E3E8EE] dark:border-[#1c3345] rounded-xl gap-1">
                <button
                  type="button"
                  onClick={() => {
                    if (isDark) onToggleTheme();
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                    !isDark
                      ? 'bg-white text-[#2E7D7E] shadow-xs'
                      : 'text-[#8B9DA8] hover:text-[#1E2837]'
                  }`}
                >
                  <Sun className="w-4 h-4 text-amber-500" />
                  <span>Light</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!isDark) onToggleTheme();
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                    isDark
                      ? 'bg-[#13222f] text-[#2dd4bf] shadow-xs'
                      : 'text-[#8B9DA8] hover:text-[#1E2837]'
                  }`}
                >
                  <Moon className="w-4 h-4 text-[#2dd4bf]" />
                  <span>Dark</span>
                </button>
              </div>
            </div>

            {/* Notifications Toggle Switches */}
            <div className="space-y-4 pt-2">
              <label className="block text-xs font-semibold text-[#64748B] dark:text-[#859ba8]">
                Notifications
              </label>

              {/* Enable local desktop notifications switch */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#F3F6F9]/50 dark:bg-[#172838]/40 border border-[#E3E8EE]/70 dark:border-[#1c3345]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-500/10 text-[#2E7D7E] dark:text-[#2dd4bf] flex items-center justify-center">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#1E2837] dark:text-white">Desktop notifications</span>
                    <p className="text-[11px] text-[#8B9DA8]">Show popups when doses are due</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleToggleNotifications}
                  className={`w-11 h-6 rounded-full transition-colors relative focus:outline-none ${
                    enableNotifications ? 'bg-[#2E7D7E]' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                      enableNotifications ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Sound alerts switch */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#F3F6F9]/50 dark:bg-[#172838]/40 border border-[#E3E8EE]/70 dark:border-[#1c3345]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-500/10 text-[#2E7D7E] dark:text-[#2dd4bf] flex items-center justify-center">
                    <Volume2 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#1E2837] dark:text-white">Sound alerts</span>
                    <p className="text-[11px] text-[#8B9DA8]">Play gentle chime on dose reminders</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleToggleSound}
                  className={`w-11 h-6 rounded-full transition-colors relative focus:outline-none ${
                    soundAlerts ? 'bg-[#2E7D7E]' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                      soundAlerts ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Reminder Time Dropdown */}
            <div className="pt-2">
              <label className="block text-xs font-semibold text-[#64748B] dark:text-[#859ba8] mb-1.5">
                Reminder Time
              </label>
              <select
                value={reminderTime}
                onChange={(e) => {
                  setReminderTime(e.target.value);
                  setSaveStatus('Reminder time updated!');
                  setTimeout(() => setSaveStatus(''), 2000);
                }}
                className="w-full sm:w-64 px-3.5 py-2.5 bg-[#F3F6F9] dark:bg-[#172838] border border-[#E3E8EE] dark:border-[#1c3345] rounded-xl text-xs text-[#1E2837] dark:text-white focus:outline-none focus:border-[#2E7D7E]"
              >
                <option value="At scheduled time">At scheduled time</option>
                <option value="5 minutes before">5 minutes before</option>
                <option value="10 minutes before">10 minutes before</option>
                <option value="15 minutes before">15 minutes before</option>
                <option value="30 minutes before">30 minutes before</option>
              </select>
            </div>
          </div>

          {/* 2. ONLINE NOTIFICATIONS CARD (RESTORED) */}
          <div className="glass-surface bg-white/75 dark:bg-[#13222f]/75 border border-white/80 dark:border-white/10 rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#E3E8EE] dark:border-[#1c3345]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#1E2837] dark:text-white">
                    Online Notifications
                  </h3>
                  <p className="text-[11px] text-[#8B9DA8]">Automated email reminders sent to your Gmail inbox</p>
                </div>
              </div>

              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                isEmailVerified && boundEmail
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30'
                  : 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isEmailVerified && boundEmail ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                <span>{isEmailVerified && boundEmail ? 'Verified & Active' : 'Not Verified'}</span>
              </div>
            </div>

            {/* Toggle Switch: Enable Gmail Notifications */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#F3F6F9]/50 dark:bg-[#172838]/40 border border-[#E3E8EE]/70 dark:border-[#1c3345]">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-[#1E2837] dark:text-white block">
                  Gmail Medication Alerts
                </span>
                <p className="text-[11px] text-[#8B9DA8]">
                  Receive medication alerts via email when online (requires verified Gmail)
                </p>
              </div>

              <button
                type="button"
                onClick={handleToggleGmailNotifications}
                className={`w-11 h-6 rounded-full transition-colors relative focus:outline-none ${
                  enableGmailNotifications ? 'bg-sky-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                    enableGmailNotifications ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Gmail Binding Box */}
            <div className="p-4 rounded-xl border border-[#E3E8EE] dark:border-[#1c3345] bg-[#F8FAFC] dark:bg-[#0f172a] space-y-3.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-bold text-[#1E2837] dark:text-white">
                  Gmail Verification & Binding
                </span>
                {isEmailVerified && boundEmail && (
                  <button
                    type="button"
                    disabled={testingNotification}
                    onClick={handleSendTestNotification}
                    className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 disabled:opacity-50"
                  >
                    <Send className="w-3 h-3" />
                    <span>{testingNotification ? 'Sending Test...' : 'Send Test Notification'}</span>
                  </button>
                )}
              </div>

              {bindStatus.msg && (
                <div className={`p-2.5 rounded-xl text-xs font-medium flex items-center gap-2 ${
                  bindStatus.isError
                    ? 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/15 dark:border-rose-500/30 dark:text-rose-300'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:border-emerald-500/30 dark:text-emerald-300'
                }`}>
                  {bindStatus.isError ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
                  <span>{bindStatus.msg}</span>
                </div>
              )}

              {isEmailVerified && boundEmail ? (
                <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-[#13222f] border border-[#E3E8EE] dark:border-[#1c3345] gap-3 flex-wrap">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <div className="min-w-0">
                      <span className="text-[10px] text-[#8B9DA8] block">Bound Gmail Address</span>
                      <strong className="text-xs font-mono font-bold text-sky-600 dark:text-sky-400 truncate block">
                        {boundEmail}
                      </strong>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleUnbind}
                    className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 border border-rose-200 dark:border-rose-500/30 rounded-lg transition-colors shrink-0"
                  >
                    Unbind Gmail
                  </button>
                </div>
              ) : (
                <div className="space-y-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#64748B] dark:text-[#859ba8] mb-1.5">
                      Enter Gmail Address for Online Reminders:
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="email"
                        placeholder="yourname@gmail.com"
                        value={inputGmail}
                        onChange={(e) => setInputGmail(e.target.value)}
                        className="flex-1 px-3.5 py-2.5 bg-white dark:bg-[#13222f] border border-[#E3E8EE] dark:border-[#1c3345] rounded-xl text-xs text-[#1E2837] dark:text-white placeholder-[#8B9DA8] focus:outline-none focus:border-sky-500 transition-all"
                      />
                      <button
                        type="button"
                        disabled={sendingCode}
                        onClick={handleSendCode}
                        className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors shrink-0 disabled:opacity-50"
                      >
                        {sendingCode ? 'Sending...' : codeSent ? 'Resend Code' : 'Send Code'}
                      </button>
                    </div>
                  </div>

                  {codeSent && (
                    <div className="p-3 bg-white dark:bg-[#13222f] border border-[#E3E8EE] dark:border-[#1c3345] rounded-xl space-y-2.5 animate-fadeIn">
                      <label className="block text-[11px] font-semibold text-[#1E2837] dark:text-white">
                        Enter 6-Digit Verification Code:
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          maxLength={6}
                          placeholder="123456"
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                          className="w-32 px-3.5 py-2 bg-[#F3F6F9] dark:bg-[#172838] border border-[#E3E8EE] dark:border-[#1c3345] rounded-xl text-center text-sm font-mono tracking-widest text-sky-600 dark:text-sky-400 focus:outline-none focus:border-sky-500 font-bold"
                        />
                        <button
                          type="button"
                          disabled={verifyingCode}
                          onClick={handleVerifyAndBind}
                          className="flex-1 py-2 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors disabled:opacity-50"
                        >
                          {verifyingCode ? 'Verifying...' : 'Verify & Bind Gmail'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 3. SOFTWARE UPDATES CARD (RESTORED UPDATE BUTTON) */}
          <div className="glass-surface bg-white/75 dark:bg-[#13222f]/75 border border-white/80 dark:border-white/10 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E3E8EE] dark:border-[#1c3345]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-500/10 text-[#2E7D7E] dark:text-[#2dd4bf] flex items-center justify-center">
                  <RefreshCw className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#1E2837] dark:text-white">
                    Software Updates
                  </h3>
                  <p className="text-[11px] text-[#8B9DA8]">Keep application updated with the latest releases</p>
                </div>
              </div>

              <span className="text-xs font-mono font-bold text-[#2E7D7E] dark:text-[#2dd4bf] bg-teal-50 dark:bg-teal-500/15 border border-teal-200 dark:border-teal-500/30 px-2.5 py-1 rounded-lg">
                v{appVersion}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4 p-4 bg-[#F8FAFC] dark:bg-[#0f172a] border border-[#E3E8EE] dark:border-[#1c3345] rounded-xl flex-wrap">
              <div className="space-y-0.5">
                <span className="font-bold text-xs text-[#1E2837] dark:text-white block">
                  Check for Application Updates
                </span>
                <p className="text-[11px] text-[#8B9DA8]">
                  Query the remote GitHub repository for new patches and releases.
                </p>
              </div>

              {/* The Update Button */}
              <button
                type="button"
                id="chk-update-btn"
                disabled={checkingUpdate}
                onClick={handleCheckForUpdates}
                className="bg-[#2E7D7E] hover:bg-[#26696a] text-white font-semibold text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-xs transition-all disabled:opacity-50 shrink-0 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${checkingUpdate ? 'animate-spin' : ''}`} />
                <span>{checkingUpdate ? 'Checking for updates...' : 'Check for Updates'}</span>
              </button>
            </div>

            {updateStatus.msg && (
              <div className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 animate-fadeIn ${
                updateStatus.isError
                  ? 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/15 dark:border-rose-500/30 dark:text-rose-300'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:border-emerald-500/30 dark:text-emerald-300'
              }`}>
                {updateStatus.isError ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
                <span>{updateStatus.msg}</span>
              </div>
            )}
          </div>

          {/* 4. ACCOUNT SETTINGS CARD */}
          <div className="glass-surface bg-white/75 dark:bg-[#13222f]/75 border border-white/80 dark:border-white/10 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#1E2837] dark:text-white pb-3 border-b border-[#E3E8EE] dark:border-[#1c3345]">
              Account & Security
            </h3>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => {
                  setPwMsg({ text: '', isError: false });
                  setShowPasswordModal(true);
                }}
                className="flex items-center gap-2.5 text-xs font-semibold text-[#2E7D7E] dark:text-[#2dd4bf] hover:underline"
              >
                <KeyRound className="w-4 h-4" />
                <span>Change Password</span>
              </button>

              <div>
                <button
                  type="button"
                  onClick={() => onLogout && onLogout()}
                  className="flex items-center gap-2.5 text-xs font-semibold text-rose-600 hover:text-rose-700"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: FIXED PICTURE PANEL (Responsive Desktop Panel, Non-Scrollable, Full-Height Fit) */}
        <div className="glass-surface lg:col-span-4 bg-white/75 dark:bg-[#13222f]/75 border border-white/80 dark:border-white/10 rounded-2xl p-4 sm:p-5 shadow-sm overflow-hidden flex flex-col items-center justify-between text-center shrink-0 h-full">
          {/* Large Image - Fills all available vertical space ("sakto") */}
          <div className="w-full flex-1 min-h-[340px] sm:min-h-[380px] lg:min-h-[420px] rounded-2xl overflow-hidden relative shadow-sm mb-3.5">
            <img
              src="/assets/side_card_art.jpg"
              alt="Healthcare botanical artwork"
              className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent flex items-end p-4">
              <span className="text-white text-xs font-semibold drop-shadow-md">
                Prescription Care & Routine
              </span>
            </div>
          </div>

          {/* Footer Info & Badges */}
          <div className="shrink-0 space-y-1.5 w-full pt-1">
            <p className="text-sm font-semibold text-[#2E7D7E] dark:text-[#2dd4bf] font-serif italic">
              Your health, our priority ♡
            </p>
            <p className="text-[11px] text-[#8B9DA8] dark:text-[#859ba8]">
              Smart Medication Scheduler v{appVersion}
            </p>
            <div className="pt-1 flex items-center justify-center gap-2 text-[10px] text-[#64748B] dark:text-[#859ba8]">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-teal-50 dark:bg-teal-500/10 text-[#2E7D7E] dark:text-[#2dd4bf] font-medium border border-teal-200 dark:border-teal-500/20">
                <ShieldCheck className="w-3 h-3" />
                <span>On-Time Reminders</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 font-medium border border-sky-200 dark:border-sky-500/20">
                <span>Auto Sync</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* CHANGE PASSWORD MODAL */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-md my-auto max-h-[90vh] bg-white dark:bg-[#13222f] border border-[#E3E8EE] dark:border-[#1c3345] rounded-3xl p-6 shadow-2xl animate-fadeIn space-y-4 overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between pb-3 border-b border-[#E3E8EE] dark:border-[#1c3345]">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-[#2E7D7E] dark:text-[#2dd4bf]" />
                <h3 className="font-bold text-sm text-[#1E2837] dark:text-white">Change Password</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPasswordModal(false)}
                className="p-1 rounded-lg text-[#8B9DA8] hover:text-[#1E2837]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {pwMsg.text && (
              <div className={`p-2.5 rounded-xl text-xs ${pwMsg.isError ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
                {pwMsg.text}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-[#64748B] dark:text-[#859ba8] mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  required
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F3F6F9] dark:bg-[#172838] border border-[#E3E8EE] dark:border-[#1c3345] rounded-xl text-xs text-[#1E2837] dark:text-white focus:outline-none focus:border-[#2E7D7E]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#64748B] dark:text-[#859ba8] mb-1">
                  New Password (min 6 characters)
                </label>
                <input
                  type="password"
                  required
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F3F6F9] dark:bg-[#172838] border border-[#E3E8EE] dark:border-[#1c3345] rounded-xl text-xs text-[#1E2837] dark:text-white focus:outline-none focus:border-[#2E7D7E]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#64748B] dark:text-[#859ba8] mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F3F6F9] dark:bg-[#172838] border border-[#E3E8EE] dark:border-[#1c3345] rounded-xl text-xs text-[#1E2837] dark:text-white focus:outline-none focus:border-[#2E7D7E]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#64748B] hover:bg-[#F3F6F9]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pwLoading}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#2E7D7E] hover:bg-[#26696a] text-white shadow-sm"
                >
                  {pwLoading ? 'Saving...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
