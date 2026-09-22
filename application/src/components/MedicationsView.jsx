import React, { useState, useEffect } from 'react';
import { Plus, Trash2, AlertCircle, Check, Search, Calendar, Clock, X, LayoutList, LayoutGrid } from 'lucide-react';
import { callApi } from '../utils/pywebview';

function MedImage({ src, alt }) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return '💊';
  }

  const imageSrc = src.startsWith('http') ? src : `file:///${src.replace(/\\/g, '/')}`;

  return (
    <img
      src={imageSrc}
      alt={alt}
      className="w-full h-full object-cover"
      onError={() => setHasError(true)}
    />
  );
}

export default function MedicationsView({ user, onDataChange }) {
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState({ text: '', isError: false });

  // View Mode: 'grid' | 'list'
  const [viewMode, setViewMode] = useState('grid');

  // Timeline / Date Filter State
  const [dateFilter, setDateFilter] = useState('ALL');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Modal State for Adding New Drug
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [stock, setStock] = useState('30');
  const [threshold, setThreshold] = useState('10');
  const [schedType, setSchedType] = useState('DAILY_TIME');
  const [timeValue, setTimeValue] = useState('08:00');
  const [imagePath, setImagePath] = useState('');
  const [formMsg, setFormMsg] = useState({ text: '', isError: false });
  const [submitting, setSubmitting] = useState(false);

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
    setFormMsg({ text: '', isError: false });

    if (!name.trim() || !dosage.trim()) {
      setFormMsg({ text: 'Please fill in medication name and dosage.', isError: true });
      return;
    }

    setSubmitting(true);
    try {
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
        setFormMsg({ text: 'Medication registered successfully!', isError: false });
        setName('');
        setDosage('');
        setStock('30');
        setThreshold('10');
        setTimeValue('08:00');
        setImagePath('');
        fetchMeds();
        if (onDataChange) onDataChange();
        setTimeout(() => {
          setShowModal(false);
          setFormMsg({ text: '', isError: false });
        }, 1200);
      } else {
        setFormMsg({ text: res.message || 'Failed to add medication.', isError: true });
      }
    } catch (err) {
      setFormMsg({ text: 'Error adding medication to stock.', isError: true });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteMedication = async (medId) => {
    const res = await callApi('delete_medication', medId);
    if (res.success) {
      fetchMeds();
      if (onDataChange) onDataChange();
    }
  };

  // Filter search + date filter logic
  const filteredMeds = medications.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.dosage.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;
    if (dateFilter === 'ALL') return true;

    const rawDate = m.created_at || m.timestamp;
    if (!rawDate) return true;

    const itemDate = new Date(rawDate.replace(' ', 'T'));
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
    <div className="p-5 flex flex-col h-full overflow-hidden space-y-4 relative">
      {/* Top Controls Bar (Identical Layout to Intake Medication) */}
      <div className="bg-[#161926] border border-[#24293e] rounded-2xl p-4 flex flex-col gap-3 shrink-0">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search medication stock by name or dosage..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#1c2033] border border-[#272e45] rounded-xl pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-[#7c3aed]"
            />
          </div>

          <div className="flex items-center gap-3">
            {/* View Mode Toggle Switch (Matching Reference Image) */}
            <div className="flex items-center bg-[#1c2033] border border-[#282f47] p-1 rounded-xl shadow-inner">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                title="List View"
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 text-xs font-bold ${
                  viewMode === 'list'
                    ? 'bg-[#7c3aed] text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <LayoutList className="w-4 h-4" />
                <span>List View</span>
              </button>

              <div className="w-[1px] h-4 bg-[#2b324d] mx-1" />

              <button
                type="button"
                onClick={() => setViewMode('grid')}
                title="Grid View"
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 text-xs font-bold ${
                  viewMode === 'grid'
                    ? 'bg-[#7c3aed] text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
                <span>Grid View</span>
              </button>
            </div>

            {/* Action Button: Register New Drug Modal Trigger */}
            <button
              onClick={() => setShowModal(true)}
              className="bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-purple-900/30 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Register New Drug</span>
            </button>
          </div>
        </div>

        {/* Timeline / Date Filter Selector Bar */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-[#22273a]">
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

          <div className="text-xs text-slate-400 flex items-center gap-2 font-medium">
            <span>Inventory Items:</span>
            <span className="bg-[#10273f] text-[#38bdf8] font-bold px-2.5 py-0.5 rounded-md">
              {filteredMeds.length}
            </span>
          </div>
        </div>

        {/* Custom Range Date Pickers */}
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

      {/* Main Content Area (Grid View vs List View) */}
      <div className="flex-1 overflow-y-auto pr-1">
        {loading ? (
          <div className="text-center text-slate-500 py-20 text-xs">Loading medication inventory...</div>
        ) : filteredMeds.length === 0 ? (
          <div className="text-center text-slate-500 py-24 text-xs">No medications found matching search or date filter.</div>
        ) : viewMode === 'grid' ? (
          /* GRID VIEW LAYOUT (Fixed Working Grid) */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMeds.map((med) => {
              const isOut = med.stock <= 0;

              return (
                <div
                  key={med.med_id}
                  className="bg-[#161926] border border-[#24293e] hover:border-[#38bdf8]/40 rounded-2xl p-4 flex flex-col justify-between space-y-4 transition-all shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-[#272d47] border border-[#3b4366] flex items-center justify-center text-xl shrink-0 overflow-hidden shadow-sm">
                        <MedImage src={med.image_path} alt={med.name} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-white text-sm truncate">{med.name}</h4>
                        <p className="text-xs text-slate-400 truncate">{med.dosage}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteMedication(med.med_id)}
                      className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-950/60 hover:text-rose-300 transition-colors shrink-0"
                      title="Delete Medication"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    <div className="bg-[#1c2033] border border-[#282f47] rounded-xl p-2.5 flex items-center justify-between text-xs">
                      <span className="text-slate-400">Stock Remaining:</span>
                      <span className={`font-bold text-sm ${isOut ? 'text-rose-400' : 'text-white'}`}>
                        {med.stock} doses
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Refill Threshold: {med.refill_threshold || 10}</span>
                      <span className={`font-bold px-2 py-0.5 rounded ${
                        isOut ? 'bg-[#3d1822] text-[#ef4444]' : med.is_low_stock ? 'bg-amber-950/80 text-amber-400' : 'bg-[#102d24] text-[#10b981]'
                      }`}>
                        {isOut ? 'OUT OF STOCK' : med.is_low_stock ? 'REFILL LOW' : 'OPTIMAL'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* LIST VIEW LAYOUT */
          <div className="space-y-2.5">
            {filteredMeds.map((med) => {
              const isOut = med.stock <= 0;

              return (
                <div
                  key={med.med_id}
                  className="bg-[#161926] border border-[#24293e] hover:border-[#38bdf8]/40 rounded-xl p-3.5 flex items-center justify-between transition-all"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-[#272d47] border border-[#3b4366] flex items-center justify-center text-lg shrink-0 overflow-hidden shadow-sm">
                      <MedImage src={med.image_path} alt={med.name} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-white text-xs truncate">{med.name}</h4>
                      <p className="text-[11px] text-slate-400 truncate">
                        {med.dosage} &bull; Stock: <span className={isOut ? 'text-rose-400 font-bold' : 'text-slate-300'}>{med.stock} doses</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-[9px] font-bold px-2.5 py-1 rounded ${
                      isOut ? 'bg-[#3d1822] text-[#ef4444]' : med.is_low_stock ? 'bg-amber-950/80 text-amber-400' : 'bg-[#102d24] text-[#10b981]'
                    }`}>
                      {isOut ? 'OUT OF STOCK' : med.is_low_stock ? 'REFILL LOW' : 'OPTIMAL'}
                    </span>

                    <button
                      onClick={() => handleDeleteMedication(med.med_id)}
                      className="p-2 rounded-lg text-rose-400 hover:bg-rose-950/60 hover:text-rose-300 transition-colors"
                      title="Delete Medication"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL FORM: Add/Register New Drug */}
      {showModal && (
        <div className="fixed inset-0 bg-[#090b12]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="w-full max-w-lg bg-[#121520] border border-[#24293e] rounded-2xl p-6 shadow-2xl space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#1e2438] pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#2b2046] text-[#c084fc] flex items-center justify-center text-lg">
                  💊
                </div>
                <div>
                  <h3 className="text-base font-bold text-white leading-tight">Register New Drug</h3>
                  <p className="text-[11px] text-slate-400">Add new drug to medication stock inventory.</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-lg hover:bg-[#1f2438] text-slate-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formMsg.text && (
              <div className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
                formMsg.isError ? 'bg-rose-950/60 border border-rose-800 text-rose-300' : 'bg-emerald-950/60 border border-emerald-800 text-emerald-300'
              }`}>
                {formMsg.isError ? <AlertCircle className="w-4 h-4 shrink-0" /> : <Check className="w-4 h-4 shrink-0" />}
                <span>{formMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleAddMedication} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Drug Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Paracetamol"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#161926] border border-[#272e45] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#7c3aed]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Dosage Form</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 500mg Tablet"
                  value={dosage}
                  onChange={(e) => setDosage(e.target.value)}
                  className="w-full bg-[#161926] border border-[#272e45] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#7c3aed]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Initial Stock Count</label>
                  <input
                    type="number"
                    min="0"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    className="w-full bg-[#161926] border border-[#272e45] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#7c3aed]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Refill Alert At</label>
                  <input
                    type="number"
                    min="0"
                    value={threshold}
                    onChange={(e) => setThreshold(e.target.value)}
                    className="w-full bg-[#161926] border border-[#272e45] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#7c3aed]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Schedule Type</label>
                  <select
                    value={schedType}
                    onChange={(e) => setSchedType(e.target.value)}
                    className="w-full bg-[#161926] border border-[#272e45] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#7c3aed]"
                  >
                    <option value="DAILY_TIME">DAILY TIME</option>
                    <option value="INTERVAL">INTERVAL (Hours)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Time / Interval</label>
                  <input
                    type="text"
                    placeholder={schedType === 'DAILY_TIME' ? '08:00' : '6'}
                    value={timeValue}
                    onChange={(e) => setTimeValue(e.target.value)}
                    className="w-full bg-[#161926] border border-[#272e45] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#7c3aed]"
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1e2438]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-[#272e45] text-slate-400 hover:text-white text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-900/30 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  <span>{submitting ? 'Saving...' : 'Register Drug'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
