import React, { useState, useEffect } from 'react';
import { Calendar, FileSpreadsheet, Trash2, History } from 'lucide-react';
import { callApi } from '../utils/pywebview';

export default function HistoryView({ user }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exportMsg, setExportMsg] = useState('');

  // Date / Timeline Filter State
  const [dateFilter, setDateFilter] = useState('ALL');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const fetchHistory = async () => {
    if (!user?.user_id) return;
    setLoading(true);
    const res = await callApi('get_history', user.user_id);
    if (res.success) {
      setHistory(res.history || []);
    }
    setLoading(false);
  };

  const handleDeleteLog = async (logId) => {
    if (!window.confirm('Are you sure you want to delete this history record?')) return;
    const res = await callApi('delete_history_log', logId);
    if (res.success) {
      fetchHistory();
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [user]);

  const handleExportCSV = async () => {
    setExportMsg('');
    const res = await callApi('export_csv', user.user_id);
    if (res.success) {
      setExportMsg(res.message || 'CSV report generated!');
    } else {
      setExportMsg('Export failed.');
    }
  };

  // Date Filter logic for History Logs
  const filteredHistory = history.filter((log) => {
    if (dateFilter === 'ALL') return true;
    if (!log.timestamp) return true;

    const itemDate = new Date(log.timestamp.replace(' ', 'T'));
    if (isNaN(itemDate.getTime())) return true;

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const diffDays = (now - itemDate) / (1000 * 60 * 60 * 24);

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
    <div className="p-6 flex flex-col h-full overflow-hidden space-y-4 bg-[#f5f7fa] dark:bg-[#0f172a] transition-colors">
      <div className="bg-white dark:bg-[#1e293b] border border-[#d9e0e8] dark:border-[#334155] rounded-lg flex-1 flex flex-col overflow-hidden p-5 shadow-2xs">
        {/* Header & Controls */}
        <div className="flex flex-col gap-3 mb-4 pb-3 border-b border-[#d9e0e8] dark:border-[#334155]">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#172033] dark:text-slate-100 flex items-center gap-2">
              <History className="w-4 h-4 text-[#2563eb] dark:text-blue-400" />
              <span>Intake History Audit Log</span>
            </h2>

            <div className="flex items-center gap-3">
              <span className="text-xs text-[#64748b] dark:text-slate-400 font-medium">
                Total Logs: <span className="font-semibold text-[#172033] dark:text-slate-200">{filteredHistory.length}</span>
              </span>

              <button
                onClick={handleExportCSV}
                className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-medium text-xs px-3.5 py-1.5 rounded-md flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Export CSV Report</span>
              </button>
            </div>
          </div>

          {/* Timeline Filter Selector */}
          <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-[#d9e0e8] dark:border-[#334155]">
            <div className="flex items-center gap-2 text-xs">
              <Calendar className="w-3.5 h-3.5 text-[#64748b] dark:text-slate-400" />
              <span className="text-[#64748b] dark:text-slate-400 font-medium">Timeline Range:</span>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="bg-[#f8fafc] dark:bg-[#0f172a] border border-[#d9e0e8] dark:border-[#334155] text-[#172033] dark:text-slate-100 rounded-md px-2 py-1 focus:outline-none cursor-pointer text-xs"
              >
                <option value="ALL">All Recorded Dates</option>
                <option value="TODAY">Today</option>
                <option value="YESTERDAY">Yesterday</option>
                <option value="THIS_WEEK">This Week (7 Days)</option>
                <option value="THIS_MONTH">This Month (30 Days)</option>
                <option value="LAST_3_MONTHS">Last 3 Months (90 Days)</option>
                <option value="CUSTOM">Custom Range</option>
              </select>
            </div>

            {exportMsg && (
              <span className="text-xs font-medium text-[#16a34a] dark:text-emerald-400">
                {exportMsg}
              </span>
            )}
          </div>

          {dateFilter === 'CUSTOM' && (
            <div className="flex items-center gap-2 pt-1 text-xs">
              <span className="text-[#64748b] dark:text-slate-400">Start Date:</span>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="bg-[#f8fafc] dark:bg-[#0f172a] border border-[#d9e0e8] dark:border-[#334155] rounded px-2 py-1 text-xs text-[#172033] dark:text-slate-100"
              />
              <span className="text-[#64748b] dark:text-slate-400">End Date:</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="bg-[#f8fafc] dark:bg-[#0f172a] border border-[#d9e0e8] dark:border-[#334155] rounded px-2 py-1 text-xs text-[#172033] dark:text-slate-100"
              />
            </div>
          )}
        </div>

        {/* Audit Log Table */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="text-center text-[#64748b] dark:text-slate-400 py-16 text-xs">Loading audit history...</div>
          ) : filteredHistory.length === 0 ? (
            <div className="text-center text-[#64748b] dark:text-slate-400 py-20 text-xs">No audit logs recorded for selected timeline.</div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#d9e0e8] dark:border-[#334155] bg-[#f8fafc] dark:bg-[#0f172a] text-[#64748b] dark:text-slate-400 font-medium">
                  <th className="py-2.5 px-3">Log ID</th>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Medication Name</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#d9e0e8] dark:divide-[#334155]">
                {filteredHistory.map((log) => {
                  const isTaken = log.status === 'TAKEN';
                  return (
                    <tr key={log.log_id} className="hover:bg-[#f8fafc] dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-[#64748b] dark:text-slate-400">#{log.log_id}</td>
                      <td className="py-2.5 px-3 font-mono text-[#172033] dark:text-slate-200">{log.timestamp}</td>
                      <td className="py-2.5 px-3 font-semibold text-[#172033] dark:text-slate-100">{log.med_name}</td>
                      <td className="py-2.5 px-3">
                        <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded ${
                          isTaken
                            ? 'bg-[#d1fae5] text-[#047857] dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-[#fee2e2] text-[#b91c1c] dark:bg-rose-950/60 dark:text-rose-300'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => handleDeleteLog(log.log_id)}
                          className="p-1 rounded text-[#64748b] hover:text-[#dc2626] hover:bg-[#fee2e2] dark:hover:bg-rose-950/60 transition-colors"
                          title="Delete Record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
