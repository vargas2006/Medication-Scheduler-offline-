import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Upload, AlertCircle, Check } from 'lucide-react';
import { callApi } from '../utils/pywebview';

export default function MedicationsView({ user, onDataChange }) {
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [stock, setStock] = useState('30');
  const [threshold, setThreshold] = useState('10');
  const [schedType, setSchedType] = useState('DAILY_TIME');
  const [timeValue, setTimeValue] = useState('08:00');
  const [imagePath, setImagePath] = useState('');
  const [message, setMessage] = useState({ text: '', isError: false });

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

  const handleAddMedication = async (e) => {
    e.preventDefault();
    setMessage({ text: '', isError: false });

    if (!name.trim() || !dosage.trim()) {
      setMessage({ text: 'Please fill in medication name and dosage.', isError: true });
      return;
    }

    const res = await callApi(
      'add_medication',
      user.user_id,
      name,
      dosage,
      parseInt(stock) || 0,
      parseInt(threshold) || 0,
      imagePath || null,
      schedType,
      timeValue
    );

    if (res.success) {
      setMessage({ text: 'Medication added successfully!', isError: false });
      setName('');
      setDosage('');
      setStock('30');
      setThreshold('10');
      setTimeValue('08:00');
      setImagePath('');
      fetchMeds();
      if (onDataChange) onDataChange();
    } else {
      setMessage({ text: res.message || 'Failed to add medication.', isError: true });
    }
  };

  const handleDeleteMedication = async (medId) => {
    const res = await callApi('delete_medication', medId);
    if (res.success) {
      fetchMeds();
      if (onDataChange) onDataChange();
    }
  };

  return (
    <div className="p-5 grid grid-cols-12 gap-5 h-full overflow-hidden">
      {/* Left Column: Form Box (5 cols) */}
      <div className="col-span-5 bg-[#161926] border border-[#24293e] rounded-2xl p-5 flex flex-col h-full overflow-y-auto">
        <h3 className="text-base font-bold text-white mb-4">Add New Drug</h3>

        {message.text && (
          <div className={`p-3 rounded-xl mb-4 text-xs font-medium flex items-center gap-2 ${
            message.isError ? 'bg-rose-950/60 border border-rose-800 text-rose-300' : 'bg-emerald-950/60 border border-emerald-800 text-emerald-300'
          }`}>
            {message.isError ? <AlertCircle className="w-4 h-4 shrink-0" /> : <Check className="w-4 h-4 shrink-0" />}
            <span>{message.text}</span>
          </div>
        )}

        <form onSubmit={handleAddMedication} className="space-y-3.5 flex-1">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Drug Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Paracetamol"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#1c2033] border border-[#272e45] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#7c3aed]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Dosage</label>
            <input
              type="text"
              required
              placeholder="e.g. 500mg Tablet"
              value={dosage}
              onChange={(e) => setDosage(e.target.value)}
              className="w-full bg-[#1c2033] border border-[#272e45] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#7c3aed]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Stock Count</label>
              <input
                type="number"
                min="0"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="w-full bg-[#1c2033] border border-[#272e45] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#7c3aed]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Refill Alert At</label>
              <input
                type="number"
                min="0"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                className="w-full bg-[#1c2033] border border-[#272e45] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#7c3aed]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Schedule Type</label>
              <select
                value={schedType}
                onChange={(e) => setSchedType(e.target.value)}
                className="w-full bg-[#1c2033] border border-[#272e45] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#7c3aed]"
              >
                <option value="DAILY_TIME">DAILY TIME</option>
                <option value="INTERVAL">INTERVAL (Hours)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Time / Interval</label>
              <input
                type="text"
                placeholder={schedType === 'DAILY_TIME' ? '08:00' : '6'}
                value={timeValue}
                onChange={(e) => setTimeValue(e.target.value)}
                className="w-full bg-[#1c2033] border border-[#272e45] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#7c3aed]"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full mt-2 py-3 bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-900/30 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Save Medication</span>
          </button> 
        </form>
      </div>

      {/* Right Column: Medications List (7 cols) */}
      <div className="col-span-7 bg-[#161926] border border-[#24293e] rounded-2xl p-5 flex flex-col h-full overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-white">Your Registered Drugs</h3>
          <span className="text-xs font-bold text-[#38bdf8] bg-[#10273f] px-2.5 py-1 rounded-md">
            {medications.length} Items
          </span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2.5 pr-2">
          {loading ? (
            <div className="text-center text-slate-500 py-10 text-xs">Loading medications...</div>
          ) : medications.length === 0 ? (
            <div className="text-center text-slate-500 py-16 text-xs">No medications registered yet.</div>
          ) : (
            medications.map((med) => (
              <div
                key={med.med_id}
                className="bg-[#1c2033] border border-[#282f47] rounded-xl p-3.5 flex items-center justify-between"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-[#272d47] flex items-center justify-center text-lg shrink-0">
                    💊
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-white text-xs truncate">{med.name}</h4>
                    <p className="text-[11px] text-slate-400 truncate">
                      {med.dosage} &bull; Stock: <span className={med.is_low_stock ? 'text-rose-400 font-bold' : 'text-slate-300'}>{med.stock}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {med.is_low_stock && (
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-[#3d1822] text-[#ef4444]">
                      REFILL LOW
                    </span>
                  )}
                  <button
                    onClick={() => handleDeleteMedication(med.med_id)}
                    className="p-2 rounded-lg text-rose-400 hover:bg-rose-950/60 hover:text-rose-300 transition-colors"
                    title="Delete Medication"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
