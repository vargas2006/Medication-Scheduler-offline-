import React, { useState, useEffect } from 'react';
import { Plus, Trash2, AlertCircle, AlertTriangle, Check, CheckCircle2, Search, ArrowUpDown, Boxes, X, LayoutList, LayoutGrid, Pill } from 'lucide-react';
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

  const [viewMode, setViewMode] = useState('grid');
  const [stockFilter, setStockFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('DEFAULT');

  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [strengthVal, setStrengthVal] = useState('500');
  const [strengthUnit, setStrengthUnit] = useState('mg');
  const [dosageForm, setDosageForm] = useState('Capsule');
  const [stock, setStock] = useState('30');
  const [stockUnit, setStockUnit] = useState('capsules');
  const [threshold, setThreshold] = useState('10');
  const [expirationDate, setExpirationDate] = useState('');
  const [imagePath, setImagePath] = useState('');
  const [formMsg, setFormMsg] = useState({ text: '', isError: false });
  const [submitting, setSubmitting] = useState(false);

  const [showRestockModal, setShowRestockModal] = useState(false);
  const [restockMedObj, setRestockMedObj] = useState(null);
  const [addStockAmount, setAddStockAmount] = useState('30');
  const [restockMsg, setRestockMsg] = useState({ text: '', isError: false });
  const [restocking, setRestocking] = useState(false);

  const handleOpenRestockModal = (med) => {
    setRestockMedObj(med);
    setAddStockAmount('30');
    setRestockMsg({ text: '', isError: false });
    setShowRestockModal(true);
  };

  const handleConfirmRestock = async (e) => {
    e.preventDefault();
    if (!restockMedObj) return;

    const amt = parseInt(addStockAmount, 10);
    if (isNaN(amt) || amt <= 0) {
      setRestockMsg({ text: 'Please enter a valid amount greater than 0.', isError: true });
      return;
    }

    setRestocking(true);
    try {
      const res = await callApi('restock_medication', restockMedObj.med_id, amt);
      if (res.success) {
        setRestockMsg({ text: `Successfully added ${amt} ${restockMedObj.stock_unit || 'capsules'} to stock!`, isError: false });
        fetchMeds();
        if (onDataChange) onDataChange();
        setTimeout(() => {
          setShowRestockModal(false);
          setRestockMedObj(null);
          setRestockMsg({ text: '', isError: false });
        }, 1000);
      } else {
        setRestockMsg({ text: res.message || 'Failed to add stock.', isError: true });
      }
    } catch (err) {
      setRestockMsg({ text: 'Error adding stock.', isError: true });
    } finally {
      setRestocking(false);
    }
  };

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

    if (!name.trim() || !strengthVal.trim()) {
      setFormMsg({ text: 'Please fill in Medicine Name and Medicine Strength.', isError: true });
      return;
    }

    setSubmitting(true);
    try {
      const computedStrength = `${strengthVal.trim()} ${strengthUnit.trim()}`.trim();
      const fullDosageStr = `${computedStrength} ${dosageForm.trim()}`.trim();

      const res = await callApi(
        'add_medication',
        user.user_id,
        name.trim(),
        fullDosageStr,
        parseInt(stock) || 0,
        parseInt(threshold) || 0,
        imagePath || null,
        computedStrength,
        dosageForm.trim(),
        stockUnit.trim() || 'capsules',
        null,
        null,
        expirationDate || null
      );

      if (res.success) {
        setFormMsg({ text: 'Medication registered in stock successfully!', isError: false });
        setName('');
        setStrengthVal('500');
        setStrengthUnit('mg');
        setDosageForm('Capsule');
        setStock('30');
        setStockUnit('capsules');
        setThreshold('10');
        setExpirationDate('');
        setImagePath('');
        fetchMeds();
        if (onDataChange) onDataChange();
        setTimeout(() => {
          setShowModal(false);
          setFormMsg({ text: '', isError: false });
        }, 1200);
      } else {
        setFormMsg({ text: res.message || 'Failed to register medication.', isError: true });
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
  const lowStockCount = medications.filter((m) => m.stock > 0 && (m.is_low_stock || m.stock <= (m.refill_threshold || 10))).length;
  const outOfStockCount = medications.filter((m) => m.stock <= 0).length;
  const inStockCount = medications.filter((m) => m.stock > (m.refill_threshold || 10)).length;

  const filteredMeds = medications
    .filter((m) => {
      const matchesSearch =
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.strength || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.dosage || '').toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      const thresh = m.refill_threshold || 10;
      const isOut = m.stock <= 0;
      const isLow = m.stock > 0 && (m.is_low_stock || m.stock <= thresh);
      const isSufficient = m.stock > thresh;

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
              placeholder="Search medication stock by name or strength..."
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
              <span>In Stock</span>
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
                <option value="STOCK_ASC" className="bg-white dark:bg-[#151926]">Stock (Low to High)</option>
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
          <div className="text-center text-slate-500 dark:text-slate-400 py-24 text-xs">No medications found in stock inventory.</div>
        ) : viewMode === 'grid' ? (

          /* Grid View Layout - Form Stock Refill at Expires Status */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMeds.map((med) => {
              const thresh = med.refill_threshold || 10;
              const isOut = med.stock <= 0;
              const isLow = !isOut && (med.is_low_stock || med.stock <= thresh);
              const unitStr = med.stock_unit || 'capsules';
              const expiresStr = med.expiration_date ? med.expiration_date : 'Unknown';

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
                        <p className="text-xs text-purple-600 dark:text-purple-400 font-semibold truncate">
                          {med.strength || med.dosage}
                        </p>
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

                  {/* Inner Box Container with requested fields: Form, Stock, Refill at, Expires, Status */}
                  <div className="bg-slate-50 dark:bg-[#1c2234] border border-slate-200 dark:border-[#262f46] rounded-xl p-3 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Form:</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {med.dosage_form || 'Capsule'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Stock:</span>
                      <span className={`font-bold ${isOut ? 'text-rose-600 dark:text-rose-400' : isLow ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'}`}>
                        {med.stock} {unitStr}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Refill at:</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {thresh} {unitStr}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Expires:</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {expiresStr}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-[#222838]">
                      <span className="text-slate-500 dark:text-slate-400">Status:</span>
                      <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                        isOut
                          ? 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30'
                          : isLow
                          ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30'
                      }`}>
                        {isOut ? 'OUT OF STOCK' : isLow ? 'LOW STOCK' : 'IN STOCK'}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenRestockModal(med)}
                    className={`w-full py-2 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm ${
                      isOut || isLow
                        ? 'bg-amber-500 hover:bg-amber-400 text-white'
                        : 'bg-purple-600 hover:bg-purple-500 text-white'
                    }`}
                  >
                    <Boxes className="w-3.5 h-3.5" />
                    <span>{isOut || isLow ? 'Restock Now' : 'Add Stock'}</span>
                  </button>
                </div>
              );
            })}
          </div>
        ) : (

          /* List View Layout */
          <div className="space-y-2">
            {filteredMeds.map((med) => {
              const thresh = med.refill_threshold || 10;
              const isOut = med.stock <= 0;
              const isLow = !isOut && (med.is_low_stock || med.stock <= thresh);
              const unitStr = med.stock_unit || 'capsules';
              const expiresStr = med.expiration_date ? med.expiration_date : 'Unknown';

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
                      <h4 className="font-semibold text-slate-900 dark:text-white text-xs truncate">{med.name} &bull; <span className="text-purple-600 dark:text-purple-400 font-bold">{med.strength || med.dosage}</span></h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        Form: {med.dosage_form || 'Capsule'} &bull; Stock: <span className={isOut ? 'text-rose-600 dark:text-rose-400 font-bold' : isLow ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-slate-700 dark:text-slate-300 font-bold'}>{med.stock} {unitStr}</span> &bull; Refill: {thresh} {unitStr} &bull; Expires: {expiresStr}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-[9px] font-bold px-2.5 py-1 rounded ${
                      isOut
                        ? 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30'
                        : isLow
                        ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30'
                    }`}>
                      {isOut ? 'OUT OF STOCK' : isLow ? 'LOW STOCK' : 'IN STOCK'}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleOpenRestockModal(med)}
                      className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-all flex items-center gap-1.5 ${
                        isOut || isLow
                          ? 'bg-amber-500 hover:bg-amber-400 text-white'
                          : 'bg-purple-600 hover:bg-purple-500 text-white'
                      }`}
                    >
                      <Boxes className="w-3.5 h-3.5" />
                      <span>{isOut || isLow ? 'Restock Now' : 'Add Stock'}</span>
                    </button>

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
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Add new medicine to stock inventory.</p>
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
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Medicine Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Biogesic"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#1c2234] border border-slate-200 dark:border-[#262f46] rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Medicine Strength & Type of Medicine */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Medicine Strength</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      placeholder="500"
                      value={strengthVal}
                      onChange={(e) => setStrengthVal(e.target.value)}
                      className="flex-1 min-w-0 bg-slate-50 dark:bg-[#1c2234] border border-slate-200 dark:border-[#262f46] rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                    />
                    <select
                      value={strengthUnit}
                      onChange={(e) => setStrengthUnit(e.target.value)}
                      className="w-24 shrink-0 bg-slate-50 dark:bg-[#1c2234] border border-slate-200 dark:border-[#262f46] rounded-xl px-2 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 cursor-pointer font-medium"
                    >
                      <option value="mg">mg</option>
                      <option value="g">g</option>
                      <option value="mcg">mcg</option>
                      <option value="ml">ml</option>
                      <option value="IU">IU</option>
                      <option value="%">%</option>
                      <option value="mEq">mEq</option>
                      <option value="mg/ml">mg/ml</option>
                      <option value="puffs">puffs</option>
                      <option value="drops">drops</option>
                      <option value="units">units</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Type of Medicine</label>
                  <select
                    value={dosageForm}
                    onChange={(e) => setDosageForm(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#1c2234] border border-slate-200 dark:border-[#262f46] rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 cursor-pointer font-medium"
                  >
                    <option value="Capsule">Capsule</option>
                    <option value="Tablet">Tablet</option>
                    <option value="Syrup">Syrup</option>
                    <option value="Injection">Injection</option>
                    <option value="Drops">Drops</option>
                    <option value="Inhaler">Inhaler</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Stock Quantity & Refill Threshold */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">How Many Do You Have?</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0"
                      required
                      placeholder="30"
                      value={stock}
                      onChange={(e) => setStock(e.target.value)}
                      className="flex-1 min-w-0 bg-slate-50 dark:bg-[#1c2234] border border-slate-200 dark:border-[#262f46] rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                    />
                    <select
                      value={stockUnit}
                      onChange={(e) => setStockUnit(e.target.value)}
                      className="w-28 shrink-0 bg-slate-50 dark:bg-[#1c2234] border border-slate-200 dark:border-[#262f46] rounded-xl px-2 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 cursor-pointer font-medium"
                    >
                      <option value="capsules">capsules</option>
                      <option value="tablets">tablets</option>
                      <option value="doses">doses</option>
                      <option value="ml">ml</option>
                      <option value="pills">pills</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Alert Me When Stock Reaches</label>
                  <input
                    type="number"
                    min="0"
                    required
                    placeholder="10"
                    value={threshold}
                    onChange={(e) => setThreshold(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#1c2234] border border-slate-200 dark:border-[#262f46] rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Expiration Date Field */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Expiration Date (Optional)</label>
                <input
                  type="date"
                  value={expirationDate}
                  onChange={(e) => setExpirationDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#1c2234] border border-slate-200 dark:border-[#262f46] rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                />
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
                  <span>{submitting ? 'Saving...' : 'Add to Stock Inventory'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Add Stock Modal */}
      {showRestockModal && restockMedObj && (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-[#090b12]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="w-full max-w-md bg-white dark:bg-[#151926] border border-slate-200 dark:border-[#222838] rounded-2xl p-6 shadow-2xl space-y-5 text-slate-900 dark:text-white">

            <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#1e2436] pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <Boxes className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">Add Stock</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">{restockMedObj.name} ({restockMedObj.strength || restockMedObj.dosage})</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowRestockModal(false);
                  setRestockMedObj(null);
                }}
                className="w-7 h-7 rounded-lg hover:bg-slate-100 dark:hover:bg-[#1c2234] text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {restockMsg.text && (
              <div className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
                restockMsg.isError ? 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/15 dark:border-rose-500/30 dark:text-rose-300' : 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:border-emerald-500/30 dark:text-emerald-300'
              }`}>
                {restockMsg.isError ? <AlertCircle className="w-4 h-4 shrink-0" /> : <Check className="w-4 h-4 shrink-0" />}
                <span>{restockMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleConfirmRestock} className="space-y-4">
              <div className="bg-slate-50 dark:bg-[#1c2234] border border-slate-200 dark:border-[#262f46] rounded-xl p-3 flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">Current Stock:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {restockMedObj.stock} {restockMedObj.stock_unit || 'capsules'}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Amount to Add:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    required
                    value={addStockAmount}
                    onChange={(e) => setAddStockAmount(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#1c2234] border border-slate-200 dark:border-[#262f46] rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                  />
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400 shrink-0">
                    {restockMedObj.stock_unit || 'capsules'}
                  </span>
                </div>
              </div>

              <div className="bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 rounded-xl p-3 flex items-center justify-between text-xs">
                <span className="text-purple-700 dark:text-purple-300 font-semibold">New Stock:</span>
                <span className="font-extrabold text-purple-600 dark:text-purple-400 text-sm">
                  {(restockMedObj.stock || 0) + (parseInt(addStockAmount, 10) || 0)} {restockMedObj.stock_unit || 'capsules'}
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-[#1e2436]">
                <button
                  type="button"
                  onClick={() => {
                    setShowRestockModal(false);
                    setRestockMedObj(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-[#262f46] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={restocking}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs rounded-xl shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <span>{restocking ? 'Adding...' : 'Add Stock'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
