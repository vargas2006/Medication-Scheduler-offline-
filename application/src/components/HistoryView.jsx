import React, { useState, useEffect } from 'react';
import { Calendar, FileSpreadsheet } from 'lucide-react';
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
    <div className="p-5 flex flex-col h-full overflow-hidden space-y-4">
      <div className="bg-[#161926] border border-[#24293e] rounded-2xl flex-1 flex flex-col overflow-hidden p-5">
        {/* Header & Timeline Filter Controls */}
        <div className="flex flex-col gap-3 mb-4 pb-3 border-b border-[#22273a]">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>📜</span>
              <span>Intake History Audit</span>
            </h3>

            <span className="text-xs font-bold text-[#c084fc] bg-[#231836] px-2.5 py-1 rounded-md">
              {filteredHistory.length} Logs
            </span>
          </div>

          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 bg-[#1c2033] border border-[#282f47] px-3 py-1.5 rounded-xl text-xs">
              <Calendar className="w-3.5 h-3.5 text-[#38bdf8]" />
              <span className="text-slate-400 font-semibold">Filter Timeline:</span>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
              >
                <option value="ALL" className="bg-[#161926]">All Dates (Lahat ng Petsa)</option>
                <option value="TODAY" className="bg-[#161926]">Today (Ngayong Araw)</option>
                <option value="YESTERDAY" className="bg-[#161926]">Yesterday (Kahapon)</option>
                <option value="THIS_WEEK" className="bg-[#161926]">This Week / Last 7 Days (Nitong Linggo / 7 Araw)</option>
                <option value="THIS_MONTH" className="bg-[#161926]">This Month / Last 30 Days (Nitong Buwan / 30 Araw)</option>
                <option value="LAST_3_MONTHS" className="bg-[#161926]">Last 3 Months / 90 Days (Nakaraang 3 Buwan)</option>
                <option value="CUSTOM" className="bg-[#161926]">Older / Custom Range (Pumili ng Petsa)</option>
              </select>
            </div>
          </div>

          {/* Custom Date Pickers */}
          {dateFilter === 'CUSTOM' && (
            <div className="flex items-center gap-2 bg-[#1c2033] border border-[#282f47] p-2 rounded-xl text-xs">
              <span className="text-slate-400 font-medium">Start Date:</span>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="bg-[#161926] border border-[#272e45] rounded-lg px-2 py-1 text-white text-xs focus:outline-none"
              />
              <span className="text-slate-400 font-medium">End Date:</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="bg-[#161926] border border-[#272e45] rounded-lg px-2 py-1 text-white text-xs focus:outline-none"
              />
            </div>
          )}
        </div>

        {/* Audit Log Items */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
          {loading ? (
            <div className="text-center text-slate-500 py-16 text-xs">Loading history logs...</div>
          ) : filteredHistory.length === 0 ? (
            <div className="text-center text-slate-500 py-20 text-xs">No history logs found for selected timeline filter.</div>
          ) : (
            filteredHistory.map((log) => {
              const isTaken = log.status === 'TAKEN';
              return (
                <div
                  key={log.log_id}
                  className="bg-[#1c2033] border border-[#272e45] rounded-xl px-4 py-3 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md ${
                      isTaken ? 'bg-[#102d24] text-[#10b981]' : 'bg-[#3d1822] text-[#f43f5e]'
                    }`}>
                      {log.status}
                    </span>
                    <span className="font-bold text-white text-xs">{log.med_name}</span>
                  </div>
                  <span className="text-slate-400 font-mono text-[11px]">{log.timestamp}</span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Footer Export Action */}
      <div className="flex items-center justify-between bg-[#161926] border border-[#24293e] rounded-xl px-5 py-3 shrink-0">
        <span className="text-xs text-slate-400 font-medium">
          {exportMsg || 'Generate downloadable CSV record of medication intake history.'}
        </span>
        <button
          onClick={handleExportCSV}
          className="bg-[#06b6d4] hover:bg-[#0891b2] text-slate-950 font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-2 transition-colors shadow-sm"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Export to CSV Report</span>
        </button>
      </div>
    </div>
  );
}
