import React, { useEffect, useState } from 'react';
import { Pill, Bell, History, Check, AlertTriangle, BarChart2, CheckCircle2 } from 'lucide-react';
import { callApi } from '../utils/pywebview';

export default function DashboardView({ user, onDataChange }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    if (!user?.user_id) return;
    setLoading(true);
    const res = await callApi('get_dashboard_data', user.user_id);
    if (res.success) {
      setData(res);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDashboard();
  }, [user]);

  const handleTakeDose = async (medId) => {
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
            <div key={i} className="h-24 bg-white dark:bg-[#1e293b] border border-[#d9e0e8] dark:border-[#334155] rounded-lg p-4">
              <div className="h-3 w-20 bg-slate-200 dark:bg-slate-700 rounded mb-2"></div>
              <div className="h-7 w-12 bg-slate-200 dark:bg-slate-700 rounded"></div>
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

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const maxWeekly = Math.max(...weekly_counts, 4);

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full bg-[#f5f7fa] dark:bg-[#0f172a] transition-colors">
      {/* 4 Professional Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        {/* Active Medications */}
        <div className="bg-white dark:bg-[#1e293b] border border-[#d9e0e8] dark:border-[#334155] rounded-lg p-4 flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#64748b] dark:text-slate-400">Active Medications</span>
            <span className="w-2 h-2 rounded-full bg-[#2563eb]"></span>
          </div>
          <div className="mt-2 mb-1">
            <span className="text-2xl font-semibold text-[#172033] dark:text-slate-100">{total_meds}</span>
          </div>
          <span className="text-[11px] text-[#64748b] dark:text-slate-400">In active inventory</span>
        </div>

        {/* Adherence Rate */}
        <div className="bg-white dark:bg-[#1e293b] border border-[#d9e0e8] dark:border-[#334155] rounded-lg p-4 flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#64748b] dark:text-slate-400">Adherence Rate</span>
            <span className="w-2 h-2 rounded-full bg-[#16a34a]"></span>
          </div>
          <div className="mt-2 mb-1">
            <span className="text-2xl font-semibold text-[#172033] dark:text-slate-100">{adherence_rate}</span>
          </div>
          <span className="text-[11px] text-[#64748b] dark:text-slate-400">Daily on-schedule</span>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white dark:bg-[#1e293b] border border-[#d9e0e8] dark:border-[#334155] rounded-lg p-4 flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#64748b] dark:text-slate-400">Low Stock Alerts</span>
            <span className={`w-2 h-2 rounded-full ${low_stock > 0 ? 'bg-[#dc2626]' : 'bg-[#16a34a]'}`}></span>
          </div>
          <div className="mt-2 mb-1">
            <span className={`text-2xl font-semibold ${low_stock > 0 ? 'text-[#dc2626] dark:text-red-400' : 'text-[#172033] dark:text-slate-100'}`}>
              {low_stock}
            </span>
          </div>
          <span className="text-[11px] text-[#64748b] dark:text-slate-400">Items below threshold</span>
        </div>

        {/* Doses Logged */}
        <div className="bg-white dark:bg-[#1e293b] border border-[#d9e0e8] dark:border-[#334155] rounded-lg p-4 flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#64748b] dark:text-slate-400">Doses Logged</span>
            <span className="w-2 h-2 rounded-full bg-[#64748b]"></span>
          </div>
          <div className="mt-2 mb-1">
            <span className="text-2xl font-semibold text-[#172033] dark:text-slate-100">{doses_taken}</span>
          </div>
          <span className="text-[11px] text-[#64748b] dark:text-slate-400">Total completed doses</span>
        </div>
      </div>

      {/* Middle Grid: Due Right Now (Left 6) & Weekly Adherence Chart (Right 4) */}
      <div className="grid grid-cols-10 gap-5">
        {/* Due Right Now (6 cols) */}
        <div className="col-span-6 bg-white dark:bg-[#1e293b] border border-[#d9e0e8] dark:border-[#334155] rounded-lg flex flex-col overflow-hidden shadow-2xs h-[290px]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#d9e0e8] dark:border-[#334155] bg-[#f8fafc] dark:bg-[#1e293b]">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#2563eb] dark:text-blue-400" />
              <h2 className="font-semibold text-[#172033] dark:text-slate-100 text-sm">Due Right Now</h2>
            </div>
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${
              due_meds.length > 0
                ? 'bg-[#fef3c7] text-[#b45309] dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-900'
                : 'bg-[#d1fae5] text-[#047857] dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900'
            }`}>
              {due_meds.length > 0 ? `${due_meds.length} Pending` : 'All Caught Up'}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {due_meds.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-[#64748b] dark:text-slate-400 py-10">
                <CheckCircle2 className="w-8 h-8 text-[#16a34a] dark:text-emerald-400 mb-2 stroke-[1.5]" />
                <span className="font-medium text-xs">All scheduled doses are up to date</span>
              </div>
            ) : (
              due_meds.map((med) => (
                <div
                  key={med.med_id}
                  className="bg-[#f8fafc] dark:bg-[#0f172a] border border-[#d9e0e8] dark:border-[#334155] rounded-md p-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-[#2563eb] dark:text-blue-400 shrink-0">
                      <Pill className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[#172033] dark:text-slate-100 text-xs">
                        {med.name} <span className="font-normal text-[#64748b] dark:text-slate-400">({med.dosage})</span>
                      </h3>
                      <p className="text-[11px] text-[#64748b] dark:text-slate-400 mt-0.5">
                        Scheduled: <span className="font-medium text-[#172033] dark:text-slate-200">{med.time_value}</span>
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleTakeDose(med.med_id)}
                    className="bg-[#16a34a] hover:bg-[#15803d] text-white font-medium text-xs px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors shadow-2xs shrink-0 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Take Dose</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Weekly Adherence Report Chart (4 cols) */}
        <div className="col-span-4 bg-white dark:bg-[#1e293b] border border-[#d9e0e8] dark:border-[#334155] rounded-lg flex flex-col p-4 shadow-2xs h-[290px]">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#d9e0e8] dark:border-[#334155]">
            <h2 className="font-semibold text-[#172033] dark:text-slate-100 text-sm flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-[#2563eb] dark:text-blue-400" />
              <span>Weekly Adherence Report</span>
            </h2>
            <span className="text-[10px] text-[#64748b] dark:text-slate-400 font-medium">
              Mon - Sun
            </span>
          </div>

          <div className="flex-1 flex items-end justify-between gap-2 pt-2 pb-1 border-b border-[#d9e0e8] dark:border-[#334155]">
            {days.map((day, idx) => {
              const val = weekly_counts[idx] || 0;
              const heightPct = Math.max(8, Math.round((val / maxWeekly) * 100));

              return (
                <div key={day} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                  <div
                    style={{ height: `${heightPct}%` }}
                    className={`w-full max-w-[18px] rounded-t-sm transition-all ${
                      val === 0
                        ? 'bg-[#e2e8f0] dark:bg-slate-700'
                        : 'bg-[#2563eb] dark:bg-blue-500'
                    }`}
                    title={`${day}: ${val} doses completed`}
                  />
                  <span className="text-[10px] text-[#64748b] dark:text-slate-400 font-medium">{day}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Section: Recent Activity Log */}
      <div className="bg-white dark:bg-[#1e293b] border border-[#d9e0e8] dark:border-[#334155] rounded-lg flex flex-col overflow-hidden shadow-2xs">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#d9e0e8] dark:border-[#334155] bg-[#f8fafc] dark:bg-[#1e293b]">
          <h2 className="font-semibold text-[#172033] dark:text-slate-100 text-sm flex items-center gap-2">
            <History className="w-4 h-4 text-[#64748b] dark:text-slate-400" />
            <span>Recent Activity Audit</span>
          </h2>
          <span className="text-[11px] text-[#64748b] dark:text-slate-400 font-medium">
            System Intake Logs
          </span>
        </div>

        <div className="p-3 space-y-1.5 max-h-[200px] overflow-y-auto">
          {recent_history.length === 0 ? (
            <div className="text-center text-[#64748b] dark:text-slate-400 text-xs py-6">
              No recent intake records available.
            </div>
          ) : (
            recent_history.map((log) => {
              const isTaken = log.status === 'TAKEN';
              return (
                <div
                  key={log.log_id}
                  className="bg-[#f8fafc] dark:bg-[#0f172a] border border-[#d9e0e8] dark:border-[#334155] rounded-md px-3.5 py-2 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                      isTaken
                        ? 'bg-[#d1fae5] text-[#047857] dark:bg-emerald-950/60 dark:text-emerald-300'
                        : 'bg-[#fee2e2] text-[#b91c1c] dark:bg-rose-950/60 dark:text-rose-300'
                    }`}>
                      {log.status}
                    </span>
                    <span className="font-medium text-[#172033] dark:text-slate-200">{log.med_name}</span>
                  </div>
                  <span className="text-[#64748b] dark:text-slate-400 text-[11px] font-mono">{log.timestamp}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
