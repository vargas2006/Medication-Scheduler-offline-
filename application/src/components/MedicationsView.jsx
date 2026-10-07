import React, { useState, useEffect } from 'react';
import { Plus, Trash2, AlertCircle, AlertTriangle, Check, CheckCircle2, Search, ArrowUpDown, Filter, Boxes, PackageCheck, PackageX, X, LayoutList, LayoutGrid, Calendar, Clock, Pill } from 'lucide-react';
import { callApi } from '../utils/pywebview';

function MedImage({ src, alt }) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return <Pill className="w-5 h-5 text-purple-600 dark:text-purple-400" />;
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

  const [viewMode, setViewMode] = useState('grid');
  const [stockFilter, setStockFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('DEFAULT');

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
    <div className="p-5 flex flex-col h-full overflow-hidden space-y-4 relative transition-colors duration-150">

      {/* Desktop Toolbar Container */}
      <div className="bg-white dark:bg-[#151926] border border-slate-200 dark:border-[#222838] rounded-2xl p-4 flex flex-col gap-3 shrink-0 shadow-sm">
        <div className="flex items-center justify-between gap-3 flex-wrap">

          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
            <input
              type="text"
              placeholder="Search medication stock by name or dosage..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 dark:bg-[#1c2234] border border-slate-200 dark:border-[#262f46] rounded-xl pl-10 pr-4 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="flex items-center gap-3">

            {/* View Mode Switcher */}
            <div className="flex items-center bg-slate-100 dark:bg-[#1c2234] border border-slate-200 dark:border-[#262f46] p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                title="List View"
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 text-xs font-semibold ${
                  viewMode === 'list'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <LayoutList className="w-4 h-4" />
                <span>List View</span>
              </button>

              <div className="w-[1px] h-4 bg-slate-300 dark:bg-[#262f46] mx-1" />

              <button
                type="button"
                onClick={() => setViewMode('grid')}
                title="Grid View"
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 text-xs font-semibold ${
                  viewMode === 'grid'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
                <span>Grid View</span>
              </button>
            </div>

            {/* Primary Action Button */}
            <button
              onClick={() => setShowModal(true)}
              className="bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs px-4 py-2 rounded-xl flex items-center gap-2 transition-all shadow-sm shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add Drug</span>
            </button>
          </div>
        </div>

        {/* Filter and Sort Sub-Bar */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-slate-200 dark:border-[#1e2436]">

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setStockFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                stockFilter === 'ALL'
                  ? 'bg-slate-200 text-slate-900 dark:bg-[#222838] dark:text-white border border-slate-300 dark:border-[#2b334a]'
                  : 'bg-slate-50 dark:bg-[#1c2234] border border-slate-200 dark:border-[#262f46] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Boxes className="w-3.5 h-3.5" />
              <span>All Stock</span>
              <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-bold">
                {totalCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStockFilter('LOW_STOCK')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                stockFilter === 'LOW_STOCK'
                  ? 'bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30'
                  : 'bg-slate-50 dark:bg-[#1c2234] border border-slate-200 dark:border-[#262f46] text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
              <span>Low Stock (Need Refill)</span>
              <span className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                lowStockCount > 0 ? 'bg-amber-200 text-amber-900 dark:bg-amber-500/20 dark:text-amber-400' : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
              }`}>
                {lowStockCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStockFilter('OUT_OF_STOCK')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                stockFilter === 'OUT_OF_STOCK'
                  ? 'bg-rose-100 text-rose-900 border border-rose-300 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30'
                  : 'bg-slate-50 dark:bg-[#1c2234] border border-slate-200 dark:border-[#262f46] text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
              <span>Out of Stock</span>
              <span className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                outOfStockCount > 0 ? 'bg-rose-200 text-rose-900 dark:bg-rose-500/20 dark:text-rose-400' : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
              }`}>
                {outOfStockCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStockFilter('IN_STOCK')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                stockFilter === 'IN_STOCK'
                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30'
                  : 'bg-slate-50 dark:bg-[#1c2234] border border-slate-200 dark:border-[#262f46] text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
              <span>In Stock (Optimal)</span>
              <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-200 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-400 font-bold">
                {inStockCount}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-[#1c2234] border border-slate-200 dark:border-[#262f46] px-3 py-1.5 rounded-xl text-xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-500 dark:text-slate-400 font-medium">Sort By:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent text-slate-900 dark:text-white font-bold focus:outline-none cursor-pointer"
              >
                <option value="DEFAULT" className="bg-white dark:bg-[#151926]">Default</option>
                <option value="STOCK_ASC" className="bg-white dark:bg-[#151926]">Stock (Low to High - Refills First)</option>
                <option value="STOCK_DESC" className="bg-white dark:bg-[#151926]">Stock (High to Low)</option>
                <option value="NAME_AZ" className="bg-white dark:bg-[#151926]">Medication Name (A - Z)</option>
              </select>
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
              <span>Showing:</span>
              <span className="bg-slate-100 text-purple-700 dark:bg-[#1c2234] dark:text-purple-400 border border-slate-200 dark:border-[#262f46] font-bold px-2 py-0.5 rounded-md">
                {filteredMeds.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto pr-1">
        {loading ? (
          <div className="text-center text-slate-500 dark:text-slate-400 py-20 text-xs">Loading medication inventory...</div>
        ) : filteredMeds.length === 0 ? (
          <div className="text-center text-slate-500 dark:text-slate-400 py-24 text-xs">No medications found matching search or stock quantity filter.</div>
        ) : viewMode === 'grid' ? (

          /* Grid View Layout */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMeds.map((med) => {
              const isOut = med.stock <= 0;

              return (
                <div
                  key={med.med_id}
                  className="bg-white dark:bg-[#151926] border border-slate-200 dark:border-[#222838] hover:border-purple-300 dark:hover:border-purple-500/40 rounded-2xl p-4 flex flex-col justify-between space-y-4 transition-all shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-[#1c2234] border border-slate-200 dark:border-[#262f46] flex items-center justify-center text-lg shrink-0 overflow-hidden shadow-sm">
                        <MedImage src={med.image_path} alt={med.name} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-slate-900 dark:text-white text-sm truncate">{med.name}</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{med.dosage}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteMedication(med.med_id)}
                      className="p-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors shrink-0"
                      title="Delete Medication"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    <div className="bg-slate-50 dark:bg-[#1c2234] border border-slate-200 dark:border-[#262f46] rounded-xl p-2.5 flex items-center justify-between text-xs">
                      <span className="text-slate-500 dark:text-slate-400">Stock Remaining:</span>
                      <span className={`font-bold text-sm ${isOut ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
                        {med.stock} doses
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <span>Refill Threshold: {med.refill_threshold || 10}</span>
                      <span className={`font-bold px-2 py-0.5 rounded ${
                        isOut
                          ? 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30'
                          : med.is_low_stock
                          ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30'
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

          /* List View Layout */
          <div className="space-y-2">
            {filteredMeds.map((med) => {
              const isOut = med.stock <= 0;

              return (
                <div
                  key={med.med_id}
                  className="bg-white dark:bg-[#151926] border border-slate-200 dark:border-[#222838] hover:border-purple-300 dark:hover:border-purple-500/40 rounded-xl p-3 flex items-center justify-between transition-all"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-[#1c2234] border border-slate-200 dark:border-[#262f46] flex items-center justify-center text-base shrink-0 overflow-hidden shadow-sm">
                      <MedImage src={med.image_path} alt={med.name} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-semibold text-slate-900 dark:text-white text-xs truncate">{med.name}</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {med.dosage} &bull; Stock: <span className={isOut ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-700 dark:text-slate-300'}>{med.stock} doses</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-[9px] font-bold px-2.5 py-1 rounded ${
                      isOut
                        ? 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30'
                        : med.is_low_stock
                        ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30'
                    }`}>
                      {isOut ? 'OUT OF STOCK' : med.is_low_stock ? 'REFILL LOW' : 'OPTIMAL'}
                    </span>

                    <button
                      onClick={() => handleDeleteMedication(med.med_id)}
                      className="p-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
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

      {/* Add Drug Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-[#090b12]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-[#151926] border border-slate-200 dark:border-[#222838] rounded-2xl p-6 shadow-2xl space-y-5 text-slate-900 dark:text-white">

            <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#1e2436] pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <Pill className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">Register New Drug</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Add new drug to medication stock inventory.</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="w-7 h-7 rounded-lg hover:bg-slate-100 dark:hover:bg-[#1c2234] text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formMsg.text && (
              <div className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
                formMsg.isError ? 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/15 dark:border-rose-500/30 dark:text-rose-300' : 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:border-emerald-500/30 dark:text-emerald-300'
              }`}>
                {formMsg.isError ? <AlertCircle className="w-4 h-4 shrink-0" /> : <Check className="w-4 h-4 shrink-0" />}
                <span>{formMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleAddMedication} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Drug Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Paracetamol"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#1c2234] border border-slate-200 dark:border-[#262f46] rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Dosage Form</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 500mg Tablet"
                  value={dosage}
                  onChange={(e) => setDosage(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#1c2234] border border-slate-200 dark:border-[#262f46] rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Initial Stock Count</label>
                  <input
                    type="number"
                    min="0"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#1c2234] border border-slate-200 dark:border-[#262f46] rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Refill Alert At</label>
                  <input
                    type="number"
                    min="0"
                    value={threshold}
                    onChange={(e) => setThreshold(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#1c2234] border border-slate-200 dark:border-[#262f46] rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Schedule Type</label>
                <select
                  value={schedType}
                  onChange={(e) => setSchedType(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#1c2234] border border-slate-200 dark:border-[#262f46] rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="DAILY_TIME">DAILY TIME (Specific Time &amp; Date)</option>
                  <option value="INTERVAL">INTERVAL (Every X Hours)</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                    <span>Choose Schedule Date</span>
                  </label>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{selectedDate}</span>
                </div>

                <input
                  type="date"
                  required
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#1c2234] border border-slate-200 dark:border-[#262f46] rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 mb-2"
                />

                <div className="grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setQuickDate(0)}
                    className="py-1.5 px-2 bg-slate-100 dark:bg-[#1c2234] hover:bg-slate-200 dark:hover:bg-[#222838] border border-slate-200 dark:border-[#262f46] rounded-lg text-[10px] font-bold text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickDate(1)}
                    className="py-1.5 px-2 bg-slate-100 dark:bg-[#1c2234] hover:bg-slate-200 dark:hover:bg-[#222838] border border-slate-200 dark:border-[#262f46] rounded-lg text-[10px] font-bold text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    Tomorrow
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickDate(2)}
                    className="py-1.5 px-2 bg-slate-100 dark:bg-[#1c2234] hover:bg-slate-200 dark:hover:bg-[#222838] border border-slate-200 dark:border-[#262f46] rounded-lg text-[10px] font-bold text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    In 2 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickDate(3)}
                    className="py-1.5 px-2 bg-slate-100 dark:bg-[#1c2234] hover:bg-slate-200 dark:hover:bg-[#222838] border border-slate-200 dark:border-[#262f46] rounded-lg text-[10px] font-bold text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    In 3 Days
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    <span>Choose Intake Time</span>
                  </label>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{selectedTime}</span>
                </div>

                <input
                  type={schedType === 'DAILY_TIME' ? 'time' : 'text'}
                  required
                  placeholder={schedType === 'DAILY_TIME' ? '08:00' : 'Interval in hours (e.g. 6)'}
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#1c2234] border border-slate-200 dark:border-[#262f46] rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 mb-2"
                />

                {schedType === 'DAILY_TIME' && (
                  <div className="grid grid-cols-4 gap-2">
                    {timePresets.map((preset) => (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => setSelectedTime(preset.value)}
                        className={`py-1.5 px-2 border rounded-lg text-[10px] font-bold transition-all ${
                          selectedTime === preset.value
                            ? 'bg-purple-600 border-purple-500 text-white shadow-sm'
                            : 'bg-slate-100 dark:bg-[#1c2234] hover:bg-slate-200 dark:hover:bg-[#222838] border-slate-200 dark:border-[#262f46] text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {preset.label} ({preset.value})
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-[#1e2436]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-[#262f46] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs rounded-xl shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <span>{submitting ? 'Adding...' : 'Add Drug'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
