import React, { useState, useEffect } from 'react';
import { Pill, Check, Search, AlertTriangle, Sparkles, CheckCircle } from 'lucide-react';
import { callApi } from '../utils/pywebview';

export default function IntakeView({ user, onDataChange }) {
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState({ text: '', medId: null });

  const fetchMeds = async () => {
    if (!user?.user_id) return;
    setLoading(true);
    const res = await callApi('get_medications', user.user_id);
    if (res.success) {
      setMedications(res.medications || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMeds();
  }, [user]);

  const handleTakeDose = async (med) => {
    if (med.stock <= 0) return;
    const res = await callApi('take_dose', user.user_id, med.med_id);
    if (res.success) {
      setMessage({ text: `Dose recorded for ${med.name}!`, medId: med.med_id });
      fetchMeds();
      if (onDataChange) onDataChange();
      setTimeout(() => setMessage({ text: '', medId: null }), 3000);
    }
  };

  const filteredMeds = medications.filter((m) =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.dosage.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-5 flex flex-col h-full overflow-hidden space-y-4">
      {/* Search Bar */}
      <div className="bg-[#161926] border border-[#24293e] rounded-2xl p-4 flex items-center justify-between shrink-0">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search medication by name or dosage..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#1c2033] border border-[#272e45] rounded-xl pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-[#7c3aed]"
          />
        </div>

        <div className="text-xs text-slate-400 flex items-center gap-2 font-medium">
          <span>Available Medications:</span>
          <span className="bg-[#10273f] text-[#38bdf8] font-bold px-2.5 py-0.5 rounded-md">
            {filteredMeds.length}
          </span>
        </div>
      </div>

      {/* Grid of Medications for Taking Doses */}
      <div className="flex-1 overflow-y-auto pr-1">
        {loading ? (
          <div className="text-center text-slate-500 py-20 text-xs">Loading medications for intake...</div>
        ) : filteredMeds.length === 0 ? (
          <div className="text-center text-slate-500 py-24 text-xs">No medications found matching search.</div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {filteredMeds.map((med) => {
              const isOut = med.stock <= 0;
              const isSuccess = message.medId === med.med_id;

              return (
                <div
                  key={med.med_id}
                  className="bg-[#161926] border border-[#24293e] hover:border-[#38bdf8]/40 rounded-2xl p-4 flex flex-col justify-between space-y-4 transition-all shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-[#272d47] flex items-center justify-center text-xl shrink-0">
                        💊
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-white text-sm truncate">{med.name}</h4>
                        <p className="text-xs text-slate-400 truncate">{med.dosage}</p>
                      </div>
                    </div>

                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                      isOut ? 'bg-[#3d1822] text-[#ef4444]' : med.is_low_stock ? 'bg-amber-950/80 text-amber-400' : 'bg-[#102d24] text-[#10b981]'
                    }`}>
                      {isOut ? 'OUT OF STOCK' : med.is_low_stock ? 'LOW STOCK' : 'IN STOCK'}
                    </span>
                  </div>

                  <div className="bg-[#1c2033] border border-[#282f47] rounded-xl p-2.5 flex items-center justify-between text-xs">
                    <span className="text-slate-400">Current Stock:</span>
                    <span className={`font-bold text-sm ${isOut ? 'text-rose-400' : 'text-white'}`}>
                      {med.stock} doses
                    </span>
                  </div>

                  {isSuccess ? (
                    <div className="py-2.5 bg-[#102d24] border border-[#10b981] text-[#10b981] font-bold text-xs rounded-xl flex items-center justify-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      <span>Dose Taken Logged!</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleTakeDose(med)}
                      disabled={isOut}
                      className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md ${
                        isOut
                          ? 'bg-[#222736] text-slate-600 cursor-not-allowed'
                          : 'bg-[#10b981] hover:bg-[#059669] text-white shadow-emerald-950/40'
                      }`}
                    >
                      <Check className="w-4 h-4" />
                      <span>{isOut ? 'Out of Stock' : 'Take Dose Now'}</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
