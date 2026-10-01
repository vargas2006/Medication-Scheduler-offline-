import React, { useState, useEffect } from 'react';
import { Plus, Trash2, AlertCircle, AlertTriangle, Check, CheckCircle2, Search, ArrowUpDown, Boxes, X, LayoutList, LayoutGrid, Calendar, Clock, Pill } from 'lucide-react';
import { callApi } from '../utils/pywebview';

function MedImage({ src, alt }) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return <Pill className="w-5 h-5 text-[#2563eb] dark:text-blue-400" />;
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
        }, 1000);
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
    if (!window.confirm('Are you sure you want to delete this medication record?')) return;
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
    <div className="p-6 flex flex-col h-full overflow-hidden space-y-4 relative bg-[#f5f7fa] dark:bg-[#0f172a] transition-colors">
      {/* Top Controls Bar */}
      <div className="bg-white dark:bg-[#1e293b] border border-[#d9e0e8] dark:border-[#334155] rounded-lg p-4 flex flex-col gap-3 shrink-0 shadow-2xs">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#64748b] dark:text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by medication name or dosage..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#f8fafc] dark:bg-[#0f172a] border border-[#d9e0e8] dark:border-[#334155] rounded-md pl-9 pr-3 py-1.5 text-xs text-[#172033] dark:text-slate-100 focus:outline-none focus:border-[#2563eb]"
            />
          </div>

          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-[#f8fafc] dark:bg-[#0f172a] border border-[#d9e0e8] dark:border-[#334155] p-0.5 rounded-md">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                title="List View"
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  viewMode === 'list'
                    ? 'bg-[#2563eb] text-white font-semibold'
                    : 'text-[#64748b] dark:text-slate-400 hover:text-[#172033] dark:hover:text-slate-200'
                }`}
              >
                <LayoutList className="w-3.5 h-3.5" />
                <span>List</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('grid')}
                title="Grid View"
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  viewMode === 'grid'
                    ? 'bg-[#2563eb] text-white font-semibold'
                    : 'text-[#64748b] dark:text-slate-400 hover:text-[#172033] dark:hover:text-slate-200'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Grid</span>
              </button>
            </div>

            {/* Action Button: Register New Drug */}
            <button
              onClick={() => setShowModal(true)}
              className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-medium text-xs px-3.5 py-2 rounded-md flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add Medication</span>
            </button>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-[#d9e0e8] dark:border-[#334155]">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setStockFilter('ALL')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                stockFilter === 'ALL'
                  ? 'bg-[#2563eb] text-white'
                  : 'bg-[#f8fafc] dark:bg-[#0f172a] border border-[#d9e0e8] dark:border-[#334155] text-[#64748b] dark:text-slate-400 hover:text-[#172033]'
              }`}
            >
              <span>All ({totalCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setStockFilter('LOW_STOCK')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                stockFilter === 'LOW_STOCK'
                  ? 'bg-[#d97706] text-white'
                  : 'bg-[#f8fafc] dark:bg-[#0f172a] border border-[#d9e0e8] dark:border-[#334155] text-[#64748b] dark:text-slate-400 hover:text-[#d97706]'
              }`}
            >
              <span>Low Stock ({lowStockCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setStockFilter('OUT_OF_STOCK')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                stockFilter === 'OUT_OF_STOCK'
                  ? 'bg-[#dc2626] text-white'
                  : 'bg-[#f8fafc] dark:bg-[#0f172a] border border-[#d9e0e8] dark:border-[#334155] text-[#64748b] dark:text-slate-400 hover:text-[#dc2626]'
              }`}
            >
              <span>Out of Stock ({outOfStockCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setStockFilter('IN_STOCK')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                stockFilter === 'IN_STOCK'
                  ? 'bg-[#16a34a] text-white'
                  : 'bg-[#f8fafc] dark:bg-[#0f172a] border border-[#d9e0e8] dark:border-[#334155] text-[#64748b] dark:text-slate-400 hover:text-[#16a34a]'
              }`}
            >
              <span>In Stock ({inStockCount})</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#64748b] dark:text-slate-400">Sort By:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-[#f8fafc] dark:bg-[#0f172a] border border-[#d9e0e8] dark:border-[#334155] text-[#172033] dark:text-slate-100 rounded-md px-2 py-1 focus:outline-none cursor-pointer text-xs"
            >
              <option value="DEFAULT">Default</option>
              <option value="STOCK_ASC">Stock (Low to High)</option>
              <option value="STOCK_DESC">Stock (High to Low)</option>
              <option value="NAME_AZ">Name (A - Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Inventory Display (Grid vs List) */}
      <div className="flex-1 overflow-y-auto pr-1">
        {loading ? (
          <div className="text-center text-[#64748b] dark:text-slate-400 py-16 text-xs">Loading medication inventory...</div>
        ) : filteredMeds.length === 0 ? (
          <div className="text-center text-[#64748b] dark:text-slate-400 py-20 text-xs">No medications found.</div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMeds.map((med) => {
              const isOut = med.stock <= 0;

              return (
                <div
                  key={med.med_id}
                  className="bg-white dark:bg-[#1e293b] border border-[#d9e0e8] dark:border-[#334155] rounded-lg p-4 flex flex-col justify-between space-y-3 shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded bg-[#f8fafc] dark:bg-[#0f172a] border border-[#d9e0e8] dark:border-[#334155] flex items-center justify-center shrink-0 overflow-hidden">
                        <MedImage src={med.image_path} alt={med.name} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-[#172033] dark:text-slate-100 text-xs truncate">{med.name}</h3>
                        <p className="text-[11px] text-[#64748b] dark:text-slate-400 truncate">{med.dosage}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteMedication(med.med_id)}
                      className="p-1 rounded text-[#64748b] hover:text-[#dc2626] hover:bg-[#fee2e2] dark:hover:bg-rose-950/60 transition-colors shrink-0"
                      title="Delete Medication"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-2 pt-1 border-t border-[#d9e0e8] dark:border-[#334155]">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#64748b] dark:text-slate-400">Current Stock:</span>
                      <span className={`font-semibold ${isOut ? 'text-[#dc2626] dark:text-red-400' : 'text-[#172033] dark:text-slate-100'}`}>
                        {med.stock} doses
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#64748b] dark:text-slate-400">Threshold: {med.refill_threshold || 10}</span>
                      <span className={`font-medium px-2 py-0.5 rounded ${
                        isOut
                          ? 'bg-[#fee2e2] text-[#b91c1c] dark:bg-rose-950/60 dark:text-rose-300'
                          : med.is_low_stock
                          ? 'bg-[#fef3c7] text-[#b45309] dark:bg-amber-950/60 dark:text-amber-300'
                          : 'bg-[#d1fae5] text-[#047857] dark:bg-emerald-950/60 dark:text-emerald-300'
                      }`}>
                        {isOut ? 'Out of Stock' : med.is_low_stock ? 'Low Stock' : 'Optimal'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredMeds.map((med) => {
              const isOut = med.stock <= 0;

              return (
                <div
                  key={med.med_id}
                  className="bg-white dark:bg-[#1e293b] border border-[#d9e0e8] dark:border-[#334155] rounded-md p-3 flex items-center justify-between shadow-2xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded bg-[#f8fafc] dark:bg-[#0f172a] border border-[#d9e0e8] dark:border-[#334155] flex items-center justify-center shrink-0 overflow-hidden">
                      <MedImage src={med.image_path} alt={med.name} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-[#172033] dark:text-slate-100 text-xs truncate">{med.name}</h3>
                      <p className="text-[11px] text-[#64748b] dark:text-slate-400 truncate">
                        {med.dosage} &bull; Stock: <span className={isOut ? 'text-[#dc2626] font-semibold' : 'text-[#172033] dark:text-slate-200'}>{med.stock} doses</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${
                      isOut
                        ? 'bg-[#fee2e2] text-[#b91c1c] dark:bg-rose-950/60 dark:text-rose-300'
                        : med.is_low_stock
                        ? 'bg-[#fef3c7] text-[#b45309] dark:bg-amber-950/60 dark:text-amber-300'
                        : 'bg-[#d1fae5] text-[#047857] dark:bg-emerald-950/60 dark:text-emerald-300'
                    }`}>
                      {isOut ? 'Out of Stock' : med.is_low_stock ? 'Low Stock' : 'Optimal'}
                    </span>

                    <button
                      onClick={() => handleDeleteMedication(med.med_id)}
                      className="p-1.5 rounded text-[#64748b] hover:text-[#dc2626] hover:bg-[#fee2e2] dark:hover:bg-rose-950/60 transition-colors"
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

      {/* Add Medication Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-[#0f172a]/60 backdrop-blur-2xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="w-full max-w-lg bg-white dark:bg-[#1e293b] border border-[#d9e0e8] dark:border-[#334155] rounded-lg p-6 shadow-lg space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#d9e0e8] dark:border-[#334155] pb-3">
              <div>
                <h3 className="text-base font-semibold text-[#172033] dark:text-slate-100">Register New Medication</h3>
                <p className="text-xs text-[#64748b] dark:text-slate-400">Add drug details to inventory stock</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded text-[#64748b] hover:text-[#172033] dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formMsg.text && (
              <div className={`p-3 rounded-md text-xs font-medium flex items-center gap-2 ${
                formMsg.isError ? 'bg-[#fee2e2] text-[#b91c1c] border border-rose-200' : 'bg-[#d1fae5] text-[#047857] border border-emerald-200'
              }`}>
                {formMsg.isError ? <AlertCircle className="w-4 h-4 shrink-0" /> : <Check className="w-4 h-4 shrink-0" />}
                <span>{formMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleAddMedication} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-[#172033] dark:text-slate-200 mb-1">Medication Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Paracetamol"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#f8fafc] dark:bg-[#0f172a] border border-[#d9e0e8] dark:border-[#334155] rounded-md px-3 py-2 text-xs text-[#172033] dark:text-slate-100 focus:outline-none focus:border-[#2563eb]"
                />
              </div>

              <div>
                <label className="block font-medium text-[#172033] dark:text-slate-200 mb-1">Dosage Form</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 500mg Tablet"
                  value={dosage}
                  onChange={(e) => setDosage(e.target.value)}
                  className="w-full bg-[#f8fafc] dark:bg-[#0f172a] border border-[#d9e0e8] dark:border-[#334155] rounded-md px-3 py-2 text-xs text-[#172033] dark:text-slate-100 focus:outline-none focus:border-[#2563eb]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-[#172033] dark:text-slate-200 mb-1">Initial Stock</label>
                  <input
                    type="number"
                    min="0"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    className="w-full bg-[#f8fafc] dark:bg-[#0f172a] border border-[#d9e0e8] dark:border-[#334155] rounded-md px-3 py-2 text-xs text-[#172033] dark:text-slate-100 focus:outline-none focus:border-[#2563eb]"
                  />
                </div>

                <div>
                  <label className="block font-medium text-[#172033] dark:text-slate-200 mb-1">Refill Threshold</label>
                  <input
                    type="number"
                    min="0"
                    value={threshold}
                    onChange={(e) => setThreshold(e.target.value)}
                    className="w-full bg-[#f8fafc] dark:bg-[#0f172a] border border-[#d9e0e8] dark:border-[#334155] rounded-md px-3 py-2 text-xs text-[#172033] dark:text-slate-100 focus:outline-none focus:border-[#2563eb]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-[#172033] dark:text-slate-200 mb-1">Schedule Type</label>
                <select
                  value={schedType}
                  onChange={(e) => setSchedType(e.target.value)}
                  className="w-full bg-[#f8fafc] dark:bg-[#0f172a] border border-[#d9e0e8] dark:border-[#334155] rounded-md px-3 py-2 text-xs text-[#172033] dark:text-slate-100 focus:outline-none focus:border-[#2563eb]"
                >
                  <option value="DAILY_TIME">DAILY TIME (Specific Time &amp; Date)</option>
                  <option value="INTERVAL">INTERVAL (Every X Hours)</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-[#172033] dark:text-slate-200 mb-1">Schedule Date</label>
                <input
                  type="date"
                  required
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full bg-[#f8fafc] dark:bg-[#0f172a] border border-[#d9e0e8] dark:border-[#334155] rounded-md px-3 py-2 text-xs text-[#172033] dark:text-slate-100 focus:outline-none focus:border-[#2563eb] mb-1.5"
                />

                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setQuickDate(0)}
                    className="py-1 px-2 bg-[#f8fafc] dark:bg-[#0f172a] border border-[#d9e0e8] dark:border-[#334155] rounded text-[10px] font-medium text-[#64748b] dark:text-slate-300 hover:text-[#172033]"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickDate(1)}
                    className="py-1 px-2 bg-[#f8fafc] dark:bg-[#0f172a] border border-[#d9e0e8] dark:border-[#334155] rounded text-[10px] font-medium text-[#64748b] dark:text-slate-300 hover:text-[#172033]"
                  >
                    Tomorrow
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickDate(2)}
                    className="py-1 px-2 bg-[#f8fafc] dark:bg-[#0f172a] border border-[#d9e0e8] dark:border-[#334155] rounded text-[10px] font-medium text-[#64748b] dark:text-slate-300 hover:text-[#172033]"
                  >
                    In 2 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickDate(3)}
                    className="py-1 px-2 bg-[#f8fafc] dark:bg-[#0f172a] border border-[#d9e0e8] dark:border-[#334155] rounded text-[10px] font-medium text-[#64748b] dark:text-slate-300 hover:text-[#172033]"
                  >
                    In 3 Days
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-medium text-[#172033] dark:text-slate-200 mb-1">Intake Time</label>
                <input
                  type={schedType === 'DAILY_TIME' ? 'time' : 'text'}
                  required
                  placeholder={schedType === 'DAILY_TIME' ? '08:00' : 'Interval in hours (e.g. 6)'}
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="w-full bg-[#f8fafc] dark:bg-[#0f172a] border border-[#d9e0e8] dark:border-[#334155] rounded-md px-3 py-2 text-xs text-[#172033] dark:text-slate-100 focus:outline-none focus:border-[#2563eb] mb-1.5"
                />

                {schedType === 'DAILY_TIME' && (
                  <div className="grid grid-cols-4 gap-1.5">
                    {timePresets.map((preset) => (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => setSelectedTime(preset.value)}
                        className={`py-1 px-2 border rounded text-[10px] font-medium transition-colors ${
                          selectedTime === preset.value
                            ? 'bg-[#2563eb] text-white border-[#2563eb]'
                            : 'bg-[#f8fafc] dark:bg-[#0f172a] border-[#d9e0e8] dark:border-[#334155] text-[#64748b] dark:text-slate-300'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#d9e0e8] dark:border-[#334155]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3.5 py-1.5 rounded-md border border-[#d9e0e8] dark:border-[#334155] text-[#64748b] hover:text-[#172033] text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-medium text-xs rounded-md shadow-2xs transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Adding...' : 'Add Medication'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
