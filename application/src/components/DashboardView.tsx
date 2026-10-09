import React, { useEffect, useState } from 'react';
import { Pill, Bell, History, Check, Sparkles, BarChart3, Activity } from 'lucide-react';
import { callApi } from '../utils/pywebview';
import { User, DashboardDataResponse } from '../types';

interface DashboardViewProps {
  user: User | null;
  onDataChange?: () => void;
}

export default function DashboardView({ user, onDataChange }: DashboardViewProps): React.JSX.Element {
  const [data, setData] = useState<DashboardDataResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchDashboard = async () => {
    if (!user?.user_id) return;
    setLoading(true);
    const res = await callApi<DashboardDataResponse>('get_dashboard_data', user.user_id);
    if (res.success) {
      setData(res as DashboardDataResponse);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDashboard();
  }, [user]);

  const handleTakeDose = async (medId: number) => {
    if (!user?.user_id) return;
    const res = await callApi('take_dose', user.user_id, medId);
    if (res.success) {
      fetchDashboard();
      if (onDataChange) onDataChange();
    }
  };

  if (loading && !data) {
    return (
      <div className="p-6 space-y-4 animate-pulse">
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-white dark:bg-[#151926] border border-slate-200 dark:border-[#222838] rounded-2xl p-4">
              <div className="h-4 w-24 bg-slate-200 dark:bg-[#222838] rounded mb-3"></div>
              <div className="h-8 w-16 bg-slate-200 dark:bg-[#222838] rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const {
    total_meds = 0,
    low_stock = 0,
    doses_taken = 0,
    adherence_rate = '0%',
    weekly_counts = [0, 0, 0, 0, 0, 0, 0],
    due_meds = [],
    recent_history = []
  } = data || {};

  const days: string[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const maxWeekly: number = Math.max(...weekly_counts, 4);

  return (
    <div className="p-5 space-y-5 overflow-y-auto h-full pr-6 transition-colors duration-150">

      {/* Top 4 Summary Cards - Neutral Containers with Restrained Accent Hierarchy */}
      <div className="grid grid-cols-4 gap-4">

        {/* Stat 1: Active Medications */}
        <div className="bg-white dark:bg-[#151926] border border-slate-200 dark:border-[#222838] rounded-2xl p-4 h-[115px] flex flex-col justify-between shadow-sm hover:border-slate-300 dark:hover:border-[#2b334a] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Active Medications</span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <Pill className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{total_meds}</span>
          </div>
          <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">In Active Inventory</span>
        </div>

        {/* Stat 2: Adherence Rate */}
        <div className="bg-white dark:bg-[#151926] border border-slate-200 dark:border-[#222838] rounded-2xl p-4 h-[115px] flex flex-col justify-between shadow-sm hover:border-slate-300 dark:hover:border-[#2b334a] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Adherence Rate</span>
            <div className="w-7 h-7 rounded-lg bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
              <Activity className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{adherence_rate}</span>
          </div>
          <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">Daily On-Schedule</span>
        </div>

        {/* Stat 3: Low Stock Alerts */}
        <div className="bg-white dark:bg-[#151926] border border-slate-200 dark:border-[#222838] rounded-2xl p-4 h-[115px] flex flex-col justify-between shadow-sm hover:border-slate-300 dark:hover:border-[#2b334a] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Low Stock Alerts</span>
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${
              low_stock > 0
                ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30'
            }`}>
              {low_stock > 0 ? 'ATTENTION' : 'OPTIMAL'}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-bold tracking-tight ${low_stock > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'}`}>
              {low_stock}
            </span>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">Items below threshold</span>
        </div>

        {/* Stat 4: Doses Logged */}
        <div className="bg-white dark:bg-[#151926] border border-slate-200 dark:border-[#222838] rounded-2xl p-4 h-[115px] flex flex-col justify-between shadow-sm hover:border-slate-300 dark:hover:border-[#2b334a] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Doses Logged</span>
            <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 dark:bg-[#1e2436] dark:text-slate-300 dark:border-slate-700/50">
              HISTORY
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{doses_taken}</span>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">Total completed doses</span>
        </div>
      </div>

      {/* Middle Section: Due Right Now & Weekly Chart */}
      <div className="grid grid-cols-10 gap-4">

        {/* Due Right Now Panel (6 cols) */}
        <div className="col-span-6 bg-white dark:bg-[#151926] border border-slate-200 dark:border-[#222838] rounded-2xl h-[280px] flex flex-col overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-[#1e2436]">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">Due Right Now</h3>
            </div>
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md ${
              due_meds.length > 0
                ? 'bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-500/15 dark:text-purple-300 dark:border-purple-500/30'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30'
            }`}>
              {due_meds.length > 0 ? `${due_meds.length} Due` : 'Caught Up'}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
            {due_meds.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 py-8">
                <Sparkles className="w-6 h-6 text-amber-500 dark:text-amber-400 mb-2" />
                <span className="font-semibold text-xs text-slate-700 dark:text-slate-300">You are all caught up on your doses!</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">No pending medication reminders due at this moment.</span>
              </div>
            ) : (
              due_meds.map((med) => (
                <div
                  key={med.med_id}
                  className="bg-slate-50 dark:bg-[#1c2234] border border-slate-200 dark:border-[#262f46] hover:border-purple-300 dark:hover:border-purple-500/40 rounded-xl p-3 flex items-center justify-between transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                      <Pill className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-white text-xs leading-snug">
                        {med.med_name || med.name} {med.strength || med.dosage}
                      </h4>
                      <p className="text-[11px] text-sky-600 dark:text-sky-400">Scheduled at: {med.time_value}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleTakeDose(med.med_id)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm shrink-0"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Take Dose</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Weekly Adherence Chart (4 cols) - Single Restrained Purple Palette */}
        <div className="col-span-4 bg-white dark:bg-[#151926] border border-slate-200 dark:border-[#222838] rounded-2xl h-[280px] flex flex-col p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span>Weekly Intake Adherence</span>
            </h3>
            <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 dark:bg-[#1e2436] dark:text-slate-300 dark:border-slate-700/50">
              Mon - Sun
            </span>
          </div>

          <div className="flex-1 flex items-end justify-between gap-2 pt-2 pb-1 border-b border-slate-200 dark:border-[#1e2436]">
            {days.map((day, idx) => {
              const val = weekly_counts[idx] || 0;
              const heightPct = Math.max(8, Math.round((val / maxWeekly) * 100));
              const barColor = val === 0 ? 'bg-slate-200 dark:bg-[#222838]' : 'bg-purple-600 dark:bg-purple-500';

              return (
                <div key={day} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                  <div
                    style={{ height: `${heightPct}%` }}
                    className={`w-full max-w-[18px] rounded-t-sm transition-all duration-300 ${barColor}`}
                    title={`${day}: ${val} doses`}
                  />
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{day}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Section: Recent Activity Log */}
      <div className="bg-white dark:bg-[#151926] border border-slate-200 dark:border-[#222838] rounded-2xl h-[220px] flex flex-col overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-[#1e2436]">
          <h3 className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-2">
            <History className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span>Recent Activity Log</span>
          </h3>
          <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-[#1e2436] text-slate-600 dark:text-slate-400">
            Latest Logs
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {recent_history.length === 0 ? (
            <div className="text-center text-slate-500 dark:text-slate-400 text-xs py-8">No logs recorded yet.</div>
          ) : (
            recent_history.map((log) => {
              const isTaken = log.status === 'TAKEN';
              return (
                <div
                  key={log.log_id}
                  className="bg-slate-50 dark:bg-[#1c2234] border border-slate-200 dark:border-[#262f46] rounded-xl px-4 py-2 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      isTaken
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30'
                        : 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30'
                    }`}>
                      {log.status}
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{log.med_name}</span>
                  </div>
                  <span className="text-slate-500 dark:text-slate-400 text-[11px] font-mono">{log.timestamp}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
