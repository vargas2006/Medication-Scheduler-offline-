import React, { useState, useEffect } from 'react';
import { Download, CheckCircle, AlertCircle, FileSpreadsheet } from 'lucide-react';
import { callApi } from '../utils/pywebview';

export default function HistoryView({ user }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exportMsg, setExportMsg] = useState('');

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

  return (
    <div className="p-5 flex flex-col h-full overflow-hidden space-y-4">
      <div className="bg-[#161926] border border-[#24293e] rounded-2xl flex-1 flex flex-col overflow-hidden p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-white">Intake History Audit</h3>
          <span className="text-xs font-bold text-[#c084fc] bg-[#231836] px-2.5 py-1 rounded-md">
            {history.length} Logs
          </span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
          {loading ? (
            <div className="text-center text-slate-500 py-16 text-xs">Loading history logs...</div>
          ) : history.length === 0 ? (
            <div className="text-center text-slate-500 py-20 text-xs">No history logs recorded yet.</div>
          ) : (
            history.map((log) => {
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
