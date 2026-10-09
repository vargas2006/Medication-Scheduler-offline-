import React, { useState, useEffect } from 'react';
import { Calendar, FileSpreadsheet, Trash2, History } from 'lucide-react';
import { callApi } from '../utils/pywebview';
import { User, HistoryLog } from '../types';

interface HistoryViewProps {
  user: User | null;
}

type DateFilterType = 'ALL' | 'TODAY' | 'YESTERDAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'LAST_3_MONTHS' | 'CUSTOM';

export default function HistoryView({ user }: HistoryViewProps): React.JSX.Element {
  const [history, setHistory] = useState<HistoryLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [exportMsg, setExportMsg] = useState<string>('');
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  const [dateFilter, setDateFilter] = useState<DateFilterType>('ALL');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');

  const fetchHistory = async () => {
    if (!user?.user_id) return;
    setLoading(true);
    const res = await callApi('get_history', user.user_id);
    if (res.success) {
      setHistory(res.history || []);
    }
    setLoading(false);
  };

  const confirmDeleteLog = async () => {
    if (!pendingDeleteId) return;
    const targetId = pendingDeleteId;
    setPendingDeleteId(null);
    const res = await callApi('delete_history_log', targetId);
    if (res.success) {
      fetchHistory();
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [user]);

  const handleExportCSV = async () => {
    if (!user?.user_id) return;
    setExportMsg('');
    const res = await callApi('export_csv', user.user_id);
    if (res.success) {
      setExportMsg(res.message || 'CSV report generated!');
    } else {
      setExportMsg('Export failed.');
    }
  };

  const filteredHistory = history.filter((log) => {
    if (dateFilter === 'ALL') return true;
    if (!log.timestamp) return true;

    const itemDate = new Date(log.timestamp.replace(' ', 'T'));
    if (isNaN(itemDate.getTime())) return true;

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const diffDays = (now.getTime() - itemDate.getTime()) / (1000 * 60 * 60 * 24);

    if (dateFilter === 'TODAY') {
      return itemDate.toISOString().split('T')[0] === todayStr;
    }
    if (dateFilter === 'YESTERDAY') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      return itemDate.toISOString().split('T')[0] === y.toISOString().split('T')[0];
    }
    if (dateFilter === 'THIS_WEEK') {
      return diffDays >= 0 && diffDays <= 7;
    }
    if (dateFilter === 'THIS_MONTH') {
      return diffDays >= 0 && diffDays <= 30;
    }
    if (dateFilter === 'LAST_3_MONTHS') {
      return diffDays >= 0 && diffDays <= 90;
    }
    if (dateFilter === 'CUSTOM') {
      if (customStart && new Date(customStart) > itemDate) return false;
      if (customEnd) {
        const endDate = new Date(customEnd);
        endDate.setHours(23, 59, 59, 999);
        if (endDate < itemDate) return false;
      }
      return true;
    }
    return true;
  });

  return (
    <div className="p-5 flex flex-col h-full overflow-hidden space-y-4 transition-colors duration-150">
      {/* Main Table Container */}
      <div className="bg-white dark:bg-[#151926] border border-slate-200 dark:border-[#222838] rounded-2xl flex-1 flex flex-col overflow-hidden p-5 shadow-sm">

        <div className="flex flex-col gap-3 mb-4 pb-3 border-b border-slate-200 dark:border-[#1e2436]">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <History className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span>Intake History Audit</span>
            </h3>

            <span className="text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-200 dark:text-purple-300 dark:bg-purple-500/15 dark:border-purple-500/20 px-2.5 py-0.5 rounded-md">
              {filteredHistory.length} Logs
            </span>
          </div>

          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-[#1c2234] border border-slate-200 dark:border-[#262f46] px-3 py-1.5 rounded-xl text-xs">
              <Calendar className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              <span className="text-slate-500 dark:text-slate-400 font-medium">Filter Timeline:</span>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as DateFilterType)}
                className="bg-transparent text-slate-900 dark:text-white font-bold focus:outline-none cursor-pointer"
              >
                <option value="ALL" className="bg-white dark:bg-[#151926]">All Dates</option>
                <option value="TODAY" className="bg-white dark:bg-[#151926]">Today</option>
                <option value="YESTERDAY" className="bg-white dark:bg-[#151926]">Yesterday</option>
                <option value="THIS_WEEK" className="bg-white dark:bg-[#151926]">This Week (7 Days)</option>
                <option value="THIS_MONTH" className="bg-white dark:bg-[#151926]">This Month (30 Days)</option>
                <option value="LAST_3_MONTHS" className="bg-white dark:bg-[#151926]">Last 3 Months (90 Days)</option>
                <option value="CUSTOM" className="bg-white dark:bg-[#151926]">Custom Range</option>
              </select>
            </div>
          </div>

          {dateFilter === 'CUSTOM' && (
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-[#1c2234] border border-slate-200 dark:border-[#262f46] p-2 rounded-xl text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Start Date:</span>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="bg-white dark:bg-[#151926] border border-slate-200 dark:border-[#262f46] rounded-lg px-2 py-1 text-slate-900 dark:text-white text-xs focus:outline-none"
              />
              <span className="text-slate-500 dark:text-slate-400 font-medium">End Date:</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="bg-white dark:bg-[#151926] border border-slate-200 dark:border-[#262f46] rounded-lg px-2 py-1 text-slate-900 dark:text-white text-xs focus:outline-none"
              />
            </div>
          )}
        </div>

        {/* History Records List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
          {loading ? (
            <div className="text-center text-slate-500 dark:text-slate-400 py-16 text-xs">Loading history logs...</div>
          ) : filteredHistory.length === 0 ? (
            <div className="text-center text-slate-500 dark:text-slate-400 py-20 text-xs">No history logs found for selected timeline filter.</div>
          ) : (
            filteredHistory.map((log) => {
              const isTaken = log.status === 'TAKEN';
              return (
                <div
                  key={log.log_id}
                  className="bg-slate-50 dark:bg-[#1c2234] border border-slate-200 dark:border-[#262f46] hover:border-slate-300 dark:hover:border-slate-700/60 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-md ${
                      isTaken
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30'
                        : 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30'
                    }`}>
                      {log.status}
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-slate-200 text-xs">{log.med_name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">{log.timestamp}</span>
                    <button
                      onClick={() => setPendingDeleteId(log.log_id)}
                      title="Delete History Record"
                      className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-1 transition-colors rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Custom Confirmation Modal for Deleting History Record */}
      {pendingDeleteId && (
        <div
          className="fixed inset-0 bg-slate-900/40 dark:bg-[#090b12]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setPendingDeleteId(null)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-[#151926] border border-slate-200 dark:border-[#222838] rounded-2xl p-6 shadow-xl space-y-4 text-slate-900 dark:text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete History Record?</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                Are you sure you want to delete this history record? This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setPendingDeleteId(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-[#1c2234] border border-slate-200 dark:border-[#262f46] text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#262f46] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteLog}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-sm transition-colors"
              >
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer Export Panel */}
      <div className="flex items-center justify-between bg-white dark:bg-[#151926] border border-slate-200 dark:border-[#222838] rounded-xl px-5 py-3 shrink-0 shadow-sm">
        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          {exportMsg || 'Generate downloadable CSV record of medication intake history.'}
        </span>
        <button
          onClick={handleExportCSV}
          className="bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs px-4 py-2 rounded-xl flex items-center gap-2 transition-colors shadow-sm"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Export to CSV Report</span>
        </button>
      </div>
    </div>
  );
}
