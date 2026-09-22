import React, { useEffect, useState } from 'react';
import { Pill, Bell, History, Check, AlertTriangle, Sparkles } from 'lucide-react';
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
            <div key={i} className="h-28 bg-[#161926] border border-[#24293e] rounded-2xl p-4">
              <div className="h-4 w-24 bg-[#262d42] rounded mb-3"></div>
              <div className="h-8 w-16 bg-[#262d42] rounded"></div>
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
    adherence_rate = '100%',
    weekly_counts = [0, 0, 0, 0, 0, 0, 0],
    due_meds = [],
    recent_history = []
  } = data || {};

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const maxWeekly = Math.max(...weekly_counts, 4);

  return (
    <div className="p-5 space-y-5 overflow-y-auto h-full pr-6">
      {/* 4 Stat Cards */}
      <div className="grid grid-cols-4 gap-4">
        {/* Card 1: Vibrant Purple Card */}
        <div className="bg-[#6b21a8] border border-[#9333ea] rounded-2xl p-4 h-[110px] flex flex-col justify-between shadow-lg shadow-purple-950/40">
          <span className="text-xs font-bold text-[#e9d5ff]">Active Medications</span>
          <span className="text-3xl font-extrabold text-white">{total_meds}</span>
          <span className="text-[10px] font-medium text-[#d8b4fe]">● In Active Inventory</span>
        </div>

        {/* Card 2: Vibrant Cyan Card */}
        <div className="bg-[#0e7490] border border-[#06b6d4] rounded-2xl p-4 h-[110px] flex flex-col justify-between shadow-lg shadow-cyan-950/40">
          <span className="text-xs font-bold text-[#cffafe]">Adherence Rate</span>
          <span className="text-3xl font-extrabold text-white">{adherence_rate}</span>
          <span className="text-[10px] font-medium text-[#a5f3fc]">● Daily On-Schedule</span>
        </div>

        {/* Card 3: Dark Card with Low Stock Alerts */}
        <div className="bg-[#161926] border border-[#24293e] rounded-2xl p-4 h-[110px] flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">Low Stock Alerts</span>
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${
              low_stock > 0 ? 'bg-[#3d1822] text-[#ef4444]' : 'bg-[#102d24] text-[#10b981]'
            }`}>
              {low_stock > 0 ? 'ATTENTION' : 'OPTIMAL'}
            </span>
          </div>
          <span className={`text-3xl font-extrabold ${low_stock > 0 ? 'text-[#f87171]' : 'text-white'}`}>
            {low_stock}
          </span>
          <span className="text-[10px] text-slate-500">Items below threshold</span>
        </div>

        {/* Card 4: Dark Card with Total Doses Logged */}
        <div className="bg-[#161926] border border-[#24293e] rounded-2xl p-4 h-[110px] flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">Doses Logged</span>
            <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-[#10273f] text-[#38bdf8]">
              HISTORY
            </span>
          </div>
          <span className="text-3xl font-extrabold text-white">{doses_taken}</span>
          <span className="text-[10px] text-slate-500">Total completed doses</span>
        </div>
      </div>

      {/* Middle Section: Due Right Now & Weekly Chart */}
      <div className="grid grid-cols-10 gap-4">
        {/* Left: Due Right Now (6 cols) */}
        <div className="col-span-6 bg-[#161926] border border-[#24293e] rounded-2xl h-[280px] flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#22273a]">
            <div className="flex items-center gap-2">
              <span className="text-lg">🔔</span>
              <h3 className="font-bold text-white text-sm">Due Right Now</h3>
            </div>
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md ${
              due_meds.length > 0 ? 'bg-[#2c1a45] text-[#a855f7]' : 'bg-[#102d24] text-[#10b981]'
            }`}>
              {due_meds.length > 0 ? `${due_meds.length} Due` : 'Caught Up'}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
            {due_meds.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 py-8">
                <Sparkles className="w-7 h-7 text-amber-400 mb-2" />
                <span className="font-semibold text-xs text-slate-300">You are all caught up on your doses!</span>
              </div>
            ) : (
              due_meds.map((med) => (
                <div
                  key={med.med_id}
                  className="bg-[#1c2033] border border-[#2b324d] rounded-xl p-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#272d47] flex items-center justify-center text-base shrink-0">
                      💊
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-xs leading-snug">
                        {med.name} {med.dosage}
                      </h4>
                      <p className="text-[11px] text-[#38bdf8]">Scheduled at: {med.time_value}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleTakeDose(med.med_id)}
                    className="bg-[#10b981] hover:bg-[#059669] text-white font-bold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm shrink-0"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Take Dose</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Weekly Intake Adherence Chart (4 cols) */}
        <div className="col-span-4 bg-[#161926] border border-[#24293e] rounded-2xl h-[280px] flex flex-col p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-white text-xs flex items-center gap-2">
              <span>📊</span>
              <span>Weekly Intake Adherence</span>
            </h3>
            <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-[#10273f] text-[#38bdf8]">
              Mon - Sun
            </span>
          </div>

          <div className="flex-1 flex items-end justify-between gap-2 pt-2 pb-1 border-b border-[#252b40]">
            {days.map((day, idx) => {
              const val = weekly_counts[idx] || 0;
              const heightPct = Math.max(8, Math.round((val / maxWeekly) * 100));
              const colors = ['bg-[#38bdf8]', 'bg-[#06b6d4]', 'bg-[#22d3ee]', 'bg-[#818cf8]', 'bg-[#a855f7]', 'bg-[#c084fc]', 'bg-[#06b6d4]'];
              const barColor = val === 0 ? 'bg-[#1f2438]' : colors[idx % colors.length];

              return (
                <div key={day} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                  <div
                    style={{ height: `${heightPct}%` }}
                    className={`w-full max-w-[20px] rounded-t-sm transition-all duration-500 ${barColor}`}
                    title={`${day}: ${val} doses`}
                  />
                  <span className="text-[10px] text-slate-500 font-medium">{day}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Section: Recent Activity Log */}
      <div className="bg-[#161926] border border-[#24293e] rounded-2xl h-[220px] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#22273a]">
          <h3 className="font-bold text-white text-xs flex items-center gap-2">
            <span>📜</span>
            <span>Recent Activity Log</span>
          </h3>
          <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-[#1e2438] text-slate-400">
            Latest Logs
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {recent_history.length === 0 ? (
            <div className="text-center text-slate-500 text-xs py-8">No logs recorded yet.</div>
          ) : (
            recent_history.map((log) => {
              const isTaken = log.status === 'TAKEN';
              return (
                <div
                  key={log.log_id}
                  className="bg-[#1c2033] border border-[#252b40] rounded-lg px-4 py-2 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      isTaken ? 'bg-[#102d24] text-[#10b981]' : 'bg-[#3d1822] text-[#f43f5e]'
                    }`}>
                      {log.status}
                    </span>
                    <span className="font-bold text-slate-200">{log.med_name}</span>
                  </div>
                  <span className="text-slate-500 text-[11px] font-mono">{log.timestamp}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
