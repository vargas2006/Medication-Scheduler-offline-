import React, { useState, useEffect } from 'react';
import { Plus, Trash2, AlertCircle, AlertTriangle, Check, CheckCircle2, Search, ArrowUpDown, Filter, Boxes, PackageCheck, PackageX, X, LayoutList, LayoutGrid, Calendar, Clock } from 'lucide-react';
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

  // Stock Quantity / Refill Filter State ('ALL' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'IN_STOCK')
  const [stockFilter, setStockFilter] = useState('ALL');
  // Sort State ('DEFAULT' | 'STOCK_ASC' | 'STOCK_DESC' | 'NAME_AZ')
  const [sortBy, setSortBy] = useState('DEFAULT');

  // Modal State for Adding New Drug
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [stock, setStock] = useState('30');
  const [threshold, setThreshold] = useState('10');
  const [schedType, setSchedType] = useState('DAILY_TIME');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState('08:00');
  const [imagePath, setImagePath] = useState('');
  const [formMsg, setFormMsg] = useState({ text: '', isError: false });
  const [submitting, setSubmitting] = useState(false);

  const setQuickDate = (offsetDays) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const timePresets = [
    { label: 'Morning', value: '08:00' },
    { label: 'Noon', value: '12:00' },
    { label: 'Evening', value: '18:00' },
    { label: 'Night', value: '21:00' }
  ];

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
        selectedTime,
        selectedDate
      );

      if (res.success) {
        setFormMsg({ text: 'Medication registered successfully!', isError: false });
        setName('');
        setDosage('');
        setStock('30');
        setThreshold('10');
        setSelectedTime('08:00');
        setSelectedDate(new Date().toISOString().split('T')[0]);
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

  const totalCount = medications.length;
  const lowStockCount = medications.filter((m) => m.stock > 0 && (m.is_low_stock || m.stock <= (m.refill_threshold || 5))).length;
  const outOfStockCount = medications.filter((m) => m.stock <= 0).length;
  const inStockCount = medications.filter((m) => m.stock > (m.refill_threshold || 5)).length;

  // Filter search + stock quantity status filter + sorting logic
  const filteredMeds = medications
    .filter((m) => {
      const matchesSearch =
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.dosage.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      const threshold = m.refill_threshold || 5;
      const isOut = m.stock <= 0;
      const isLow = m.stock > 0 && (m.is_low_stock || m.stock <= threshold);
      const isSufficient = m.stock > threshold;

      if (stockFilter === 'LOW_STOCK') return isLow;
      if (stockFilter === 'OUT_OF_STOCK') return isOut;
      if (stockFilter === 'IN_STOCK') return isSufficient;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'STOCK_ASC') return a.stock - b.stock;
      if (sortBy === 'STOCK_DESC') return b.stock - a.stock;
      if (sortBy === 'NAME_AZ') return a.name.localeCompare(b.name);
      return 0;
    });

  return (
    <div className="p-5 flex flex-col h-full overflow-hidden space-y-4 relative">
      {/* Top Controls Bar */}
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
            {/* View Mode Toggle Switch */}
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

        {/* Stock Quantity / Refill Status Filter Bar */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-[#22273a]">
          {/* Stock Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setStockFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                stockFilter === 'ALL'
                  ? 'bg-[#2b3558] text-white shadow-sm border border-[#3b4772]'
                  : 'bg-[#1c2033] border border-[#272e45] text-slate-400 hover:text-white'
              }`}
            >
              <Boxes className="w-3.5 h-3.5" />
              <span>All Stock</span>
              <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300">
                {totalCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStockFilter('LOW_STOCK')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                stockFilter === 'LOW_STOCK'
                  ? 'bg-amber-950/80 text-amber-300 border border-amber-500/60 shadow-sm'
                  : 'bg-[#1c2033] border border-[#272e45] text-slate-400 hover:text-amber-400'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>Low Stock (Need Refill)</span>
              <span className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                lowStockCount > 0 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-slate-800 text-slate-400'
              }`}>
                {lowStockCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStockFilter('OUT_OF_STOCK')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                stockFilter === 'OUT_OF_STOCK'
                  ? 'bg-rose-950/80 text-rose-300 border border-rose-500/60 shadow-sm'
                  : 'bg-[#1c2033] border border-[#272e45] text-slate-400 hover:text-rose-400'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
              <span>Out of Stock</span>
              <span className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                outOfStockCount > 0 ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-slate-800 text-slate-400'
              }`}>
                {outOfStockCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStockFilter('IN_STOCK')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                stockFilter === 'IN_STOCK'
                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/60 shadow-sm'
                  : 'bg-[#1c2033] border border-[#272e45] text-slate-400 hover:text-emerald-400'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>In Stock (Optimal)</span>
              <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {inStockCount}
              </span>
            </button>
          </div>

          {/* Right Controls: Sort Order & Count */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-[#1c2033] border border-[#282f47] px-3 py-1.5 rounded-xl text-xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-400 font-semibold">Sort By:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
              >
                <option value="DEFAULT" className="bg-[#161926]">Default</option>
                <option value="STOCK_ASC" className="bg-[#161926]">Stock (Low to High - Refills First)</option>
                <option value="STOCK_DESC" className="bg-[#161926]">Stock (High to Low)</option>
                <option value="NAME_AZ" className="bg-[#161926]">Medication Name (A - Z)</option>
              </select>
            </div>

            <div className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
              <span>Showing:</span>
              <span className="bg-[#10273f] text-[#38bdf8] font-bold px-2 py-0.5 rounded-md">
                {filteredMeds.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area (Grid View vs List View) */}
      <div className="flex-1 overflow-y-auto pr-1">
        {loading ? (
          <div className="text-center text-slate-500 py-20 text-xs">Loading medication inventory...</div>
        ) : filteredMeds.length === 0 ? (
          <div className="text-center text-slate-500 py-24 text-xs">No medications found matching search or stock quantity filter.</div>
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
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-[#121520] border border-[#24293e] rounded-2xl p-6 shadow-2xl space-y-5">
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

              {/* Schedule Type Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Schedule Type</label>
                <select
                  value={schedType}
                  onChange={(e) => setSchedType(e.target.value)}
                  className="w-full bg-[#161926] border border-[#272e45] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#7c3aed]"
                >
                  <option value="DAILY_TIME">DAILY TIME (Specific Time &amp; Date)</option>
                  <option value="INTERVAL">INTERVAL (Every X Hours)</option>
                </select>
              </div>

              {/* Date Selection with Calendar & Quick Pills (Matching Schedule New Intake) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#38bdf8]" />
                    <span>Choose Schedule Date</span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">{selectedDate}</span>
                </div>

                <input
                  type="date"
                  required
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full bg-[#161926] border border-[#272e45] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#7c3aed] mb-2"
                />

                {/* Quick Date Selector Pills */}
                <div className="grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setQuickDate(0)}
                    className="py-1.5 px-2 bg-[#1c2033] hover:bg-[#252b45] border border-[#2b324d] rounded-lg text-[10px] font-bold text-slate-300 transition-colors"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickDate(1)}
                    className="py-1.5 px-2 bg-[#1c2033] hover:bg-[#252b45] border border-[#2b324d] rounded-lg text-[10px] font-bold text-slate-300 transition-colors"
                  >
                    Tomorrow
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickDate(2)}
                    className="py-1.5 px-2 bg-[#1c2033] hover:bg-[#252b45] border border-[#2b324d] rounded-lg text-[10px] font-bold text-slate-300 transition-colors"
                  >
                    In 2 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickDate(3)}
                    className="py-1.5 px-2 bg-[#1c2033] hover:bg-[#252b45] border border-[#2b324d] rounded-lg text-[10px] font-bold text-slate-300 transition-colors"
                  >
                    In 3 Days
                  </button>
                </div>
              </div>

              {/* Time Selection with Presets & Input (Matching Schedule New Intake) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#c084fc]" />
                    <span>Choose Intake Time</span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">{selectedTime}</span>
                </div>

                <input
                  type={schedType === 'DAILY_TIME' ? 'time' : 'text'}
                  required
                  placeholder={schedType === 'DAILY_TIME' ? '08:00' : 'Interval in hours (e.g. 6)'}
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="w-full bg-[#161926] border border-[#272e45] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#7c3aed] mb-2"
                />

                {/* Preset Time Pills (Only for DAILY_TIME) */}
                {schedType === 'DAILY_TIME' && (
                  <div className="grid grid-cols-4 gap-2">
                    {timePresets.map((preset) => (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => setSelectedTime(preset.value)}
                        className={`py-1.5 px-2 border rounded-lg text-[10px] font-bold transition-all ${
                          selectedTime === preset.value
                            ? 'bg-[#7c3aed] border-[#9333ea] text-white shadow-sm'
                            : 'bg-[#1c2033] hover:bg-[#252b45] border-[#2b324d] text-slate-300'
                        }`}
                      >
                        {preset.label} ({preset.value})
                      </button>
                    ))}
                  </div>
                )}
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
