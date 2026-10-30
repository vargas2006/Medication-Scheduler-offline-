import React, { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Trash2,
  AlertCircle,
  AlertTriangle,
  Check,
  Search,
  X,
  Pill,
  PackagePlus,
  Calendar,
  Camera,
  MoreVertical,
  Clock,
  Tag,
  ShieldCheck,
  Box,
  Sparkles,
} from 'lucide-react';
import { callApi } from '../utils/pywebview';
import { User, Medication } from '../types';

interface MedicationsViewProps {
  user: User | null;
  onDataChange?: () => void;
  refreshKey?: number;
  addModalRequest?: number;
}

interface StatusMsg {
  text: string;
  isError: boolean;
}

type StockFilterType = 'ALL' | 'IN_STOCK' | 'LOW_STOCK';

export default function MedicationsView({ user, onDataChange, refreshKey, addModalRequest = 0 }: MedicationsViewProps): React.JSX.Element {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [stockFilter, setStockFilter] = useState<StockFilterType>('ALL');

  // Menu State for 3-dots actions per card
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);

  // Modal State for Register New Drug
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [name, setName] = useState<string>('');
  const [strengthVal, setStrengthVal] = useState<string>('500');
  const [strengthUnit, setStrengthUnit] = useState<string>('mg');
  const [dosageForm, setDosageForm] = useState<string>('Tablet');
  const [stock, setStock] = useState<string>('30');
  const [stockUnit, setStockUnit] = useState<string>('tablets');
  const [threshold, setThreshold] = useState<string>('10');
  const [expirationDate, setExpirationDate] = useState<string>('');
  const [batchNo, setBatchNo] = useState<string>('');
  const [imageData, setImageData] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [formMsg, setFormMsg] = useState<StatusMsg>({ text: '', isError: false });
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Modal State for Restock
  const [showRestockModal, setShowRestockModal] = useState<boolean>(false);
  const [restockMedObj, setRestockMedObj] = useState<Medication | null>(null);
  const [addStockAmount, setAddStockAmount] = useState<string>('30');
  const [restockMsg, setRestockMsg] = useState<StatusMsg>({ text: '', isError: false });
  const [restocking, setRestocking] = useState<boolean>(false);

  // Modal State for Delete Confirmation
  const [pendingDeleteMed, setPendingDeleteMed] = useState<Medication | null>(null);

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
  }, [user, refreshKey]);

  useEffect(() => {
    if (addModalRequest > 0) {
      setFormMsg({ text: '', isError: false });
      setShowAddModal(true);
    }
  }, [addModalRequest]);

  // Close card action menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.card-action-menu')) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleOpenRestock = (med: Medication) => {
    setRestockMedObj(med);
    setAddStockAmount('30');
    setRestockMsg({ text: '', isError: false });
    setShowRestockModal(true);
  };

  const handleConfirmRestock = async (e: React.FormEvent) => {
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
        setRestockMsg({ text: `Added ${amt} ${restockMedObj.stock_unit || 'tablets'} to stock!`, isError: false });
        fetchMeds();
        if (onDataChange) onDataChange();
        setTimeout(() => {
          setShowRestockModal(false);
          setRestockMedObj(null);
          setRestockMsg({ text: '', isError: false });
        }, 800);
      } else {
        setRestockMsg({ text: res.message || 'Failed to add stock.', isError: true });
      }
    } catch {
      setRestockMsg({ text: 'Error adding stock.', isError: true });
    } finally {
      setRestocking(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFormMsg({ text: 'Please select a valid image file (PNG/JPG/WEBP).', isError: true });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 400;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setImageData(dataUrl);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleAddMedication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.user_id) return;
    setFormMsg({ text: '', isError: false });

    if (!name.trim()) {
      setFormMsg({ text: 'Please enter Medicine Name.', isError: true });
      return;
    }

    setSubmitting(true);
    try {
      const cleanStrengthVal = strengthVal.trim() || '500';
      const cleanStrengthUnit = strengthUnit.trim() || 'mg';
      const computedStrength = `${cleanStrengthVal} ${cleanStrengthUnit}`;
      const computedDosage = computedStrength;
      const computedForm = dosageForm || 'Tablet';
      const computedUnit = stockUnit || 'tablets';
      const computedStock = parseInt(stock, 10) || 30;
      const computedThreshold = parseInt(threshold, 10) || 10;
      const cleanExpiration = expirationDate.trim() || null;
      const cleanBatch = batchNo.trim() || null;

      const res = await callApi(
        'add_medication',
        user.user_id,
        name.trim(),
        computedDosage,
        computedStock,
        computedThreshold,
        imageData || null,
        computedStrength,
        computedForm,
        computedUnit,
        null, // start_date
        null, // end_date
        cleanExpiration,
        null, // last_restock
        cleanBatch
      );

      if (res && res.success) {
        setFormMsg({ text: 'Medicine registered to inventory successfully!', isError: false });
        fetchMeds();
        if (onDataChange) onDataChange();
        setTimeout(() => {
          setShowAddModal(false);
          setName('');
          setStrengthVal('500');
          setStrengthUnit('mg');
          setDosageForm('Tablet');
          setStock('30');
          setStockUnit('tablets');
          setThreshold('10');
          setExpirationDate('');
          setBatchNo('');
          setImageData('');
          setFormMsg({ text: '', isError: false });
        }, 800);
      } else {
        setFormMsg({ text: res?.message || 'Failed to add medication.', isError: true });
      }
    } catch {
      setFormMsg({ text: 'Error saving medication.', isError: true });
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDeleteMed = async () => {
    if (!pendingDeleteMed) return;
    const target = pendingDeleteMed;
    setPendingDeleteMed(null);
    try {
      const res = await callApi('delete_medication', target.med_id);
      if (res.success) {
        fetchMeds();
        if (onDataChange) onDataChange();
      }
    } catch (err) {
      console.error('Delete error', err);
    }
  };

  // Helper to format dates e.g. "Dec 15, 2026"
  const formatDateDisplay = (dateStr: string | null | undefined, fallback: string = 'Dec 15, 2026'): string => {
    if (!dateStr) return fallback;
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        }
      }
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
    } catch {
      // fallback
    }
    return dateStr;
  };

  // Helper to resolve clean batch code
  const getBatchCode = (med: Medication): string => {
    if (med.batch_no && med.batch_no.trim()) return med.batch_no.trim();
    const nameClean = (med.name || '').toUpperCase().replace(/[^A-Z]/g, '');
    const prefix = nameClean.slice(0, 3) || 'MED';
    const year = 2026;
    const idStr = String(med.med_id || 1).padStart(3, '0');
    return `${prefix}-${year}-${idStr}`;
  };

  // Helper to resolve medicine bottle image matching user reference
  const resolveMedImage = (med: Medication): string => {
    if (med.image_path && med.image_path.startsWith('data:')) {
      return med.image_path;
    }
    const nameClean = (med.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (nameClean.includes('paracetamol') || nameClean.includes('biogesic')) return '/drug_images/paracetamol.jpg';
    if (nameClean.includes('vitaminc') || (nameClean.includes('vitamin') && nameClean.includes('c')) || nameClean.includes('ascorbic')) return '/drug_images/vitaminc.jpg';
    if (nameClean.includes('multivitamin') || nameClean.includes('centrum') || nameClean.includes('revicon')) return '/drug_images/multivitamin.jpg';
    if (nameClean.includes('ibuprofen') || nameClean.includes('advil') || nameClean.includes('motrin')) return '/drug_images/ibuprofen.jpg';

    if (med.image_path) {
      if (med.image_path.startsWith('http') || med.image_path.startsWith('/')) {
        return med.image_path;
      }
      return `/drug_images/${med.image_path.replace('/drug_images/', '')}`;
    }

    return `/drug_images/${nameClean}.png`;
  };

  // Filters
  const lowStockMeds = medications.filter(
    (m) => m.is_low_stock || m.stock <= (m.refill_threshold || 10)
  );

  const inStockMeds = medications.filter(
    (m) => !(m.is_low_stock || m.stock <= (m.refill_threshold || 10)) && m.stock > 0
  );

  const filteredMeds = medications.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.dosage || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.strength || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.batch_no || '').toLowerCase().includes(searchTerm.toLowerCase());

    const isLow = m.is_low_stock || (m.stock <= (m.refill_threshold || 10));

    if (stockFilter === 'LOW_STOCK') return matchesSearch && isLow;
    if (stockFilter === 'IN_STOCK') return matchesSearch && !isLow && m.stock > 0;
    return matchesSearch;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-7 flex flex-col h-full overflow-hidden transition-colors duration-200">
      {/* 1. STICKY TOP BAR: Search + Filter Chips + Add Medication */}
      <div className="glass-surface shrink-0 pb-4 mb-4 border border-white/70 dark:border-white/10 rounded-2xl px-4 pt-4 bg-white/95 dark:bg-[#13222f]/95 z-10">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 flex-wrap">
          {/* Search Input Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#2E7D7E] dark:text-[#2dd4bf]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search medication stocks by name, batch, strength..."
              className="glass-control w-full pl-10 pr-4 py-2.5 bg-white/65 dark:bg-[#13222f]/75 border border-white/80 dark:border-white/10 rounded-xl text-xs text-[#1E2837] dark:text-white placeholder-[#8B9DA8] focus:outline-none focus:border-[#2E7D7E] dark:focus:border-[#2dd4bf] shadow-xs transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8B9DA8] hover:text-[#1E2837]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Pills & Add Medication Button */}
          <div className="flex items-center gap-3 self-end sm:self-auto">
            {/* Quick Filter Segment */}
            <div className="glass-control inline-flex p-1 bg-white/65 dark:bg-[#13222f]/75 border border-white/80 dark:border-white/10 rounded-xl gap-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setStockFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  stockFilter === 'ALL'
                    ? 'bg-[#EBF5F5]/85 dark:bg-[#183641]/90 text-[#2E7D7E] dark:text-[#2dd4bf]'
                    : 'text-[#8B9DA8] hover:text-[#1E2837]'
                }`}
              >
                All ({medications.length})
              </button>
              <button
                type="button"
                onClick={() => setStockFilter('IN_STOCK')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  stockFilter === 'IN_STOCK'
                    ? 'bg-[#E6F8F2]/85 dark:bg-[#133833]/90 text-[#0D9488] dark:text-[#2dd4bf]'
                    : 'text-[#8B9DA8] hover:text-[#1E2837]'
                }`}
              >
                In Stock ({inStockMeds.length})
              </button>
              <button
                type="button"
                onClick={() => setStockFilter('LOW_STOCK')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  stockFilter === 'LOW_STOCK'
                    ? 'bg-[#FEF3E2]/85 dark:bg-[#3d2716]/90 text-[#E08A1E] dark:text-[#f59e0b]'
                    : 'text-[#8B9DA8] hover:text-[#1E2837]'
                }`}
              >
                Low Stock ({lowStockMeds.length})
              </button>
            </div>

            {/* Add Medication Button */}
            <button
              type="button"
              onClick={() => {
                setFormMsg({ text: '', isError: false });
                setShowAddModal(true);
              }}
              className="glass-control py-2.5 px-4 bg-[#2E7D7E]/90 hover:bg-[#26696a]/90 text-white font-semibold text-xs rounded-xl shadow-sm transition-all flex items-center gap-2 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add Medication</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. MAIN LAYOUT: Left Column Scrolls with Reference Stock Cards, Right Column has Image & Guidelines */}
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 gap-5 items-start overflow-hidden">
        {/* LEFT COLUMN: Scrollable Medication Stock & Low Stock Alerts */}
        <div className="md:col-span-7 xl:col-span-7 2xl:col-span-8 h-full overflow-y-auto custom-scrollbar pr-1.5 space-y-4">
          {filteredMeds.length === 0 ? (
            <div className="py-16 text-center text-[#8B9DA8] dark:text-[#859ba8] bg-white dark:bg-[#13222f] border border-[#E3E8EE] dark:border-[#1c3345] rounded-3xl p-8">
              <Pill className="w-10 h-10 mx-auto text-[#2E7D7E]/50 mb-3" />
              <h4 className="text-sm font-bold text-[#1E2837] dark:text-white">
                {searchTerm ? 'No matching medications found' : 'No medications registered yet'}
              </h4>
              <p className="text-xs text-[#8B9DA8] mt-1.5 max-w-sm mx-auto">
                {searchTerm
                  ? 'Try searching with another keyword or clear the active filter.'
                  : 'Click "Add Medication" above to start tracking your inventory.'}
              </p>
              {!searchTerm && (
                <button
                  type="button"
                  onClick={() => setShowAddModal(true)}
                  className="mt-4 px-4 py-2 bg-[#2E7D7E] text-white font-semibold text-xs rounded-xl hover:bg-[#26696a] transition-all"
                >
                  Add Your First Medication
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {filteredMeds.map((med) => {
                const isLow = med.is_low_stock || med.stock <= (med.refill_threshold || 10);
                const totalCapacity = med.initial_stock || Math.max(med.stock, 30);
                const percentage = Math.min(100, Math.max(0, Math.round((med.stock / totalCapacity) * 100)));
                const imgSrc = resolveMedImage(med);
                const expDate = formatDateDisplay(med.expiration_date, 'Dec 15, 2026');
                const lastRestock = formatDateDisplay(med.last_restock, 'Sep 21, 2025');
                const batchNoVal = getBatchCode(med);

                return (
                  <div
                    key={med.med_id}
                    className="glass-surface bg-white/75 dark:bg-[#13222f]/75 border border-white/80 dark:border-white/10 rounded-3xl p-4 sm:p-5 hover:shadow-md transition-all flex flex-col justify-between gap-4 relative group"
                  >
                    {/* Top Section: Photo on Left + Spec/Quantity Info on Right */}
                    <div className="flex items-start gap-3 sm:gap-4">
                      {/* Medication Realistic Photo Container (matching reference image) */}
                      <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-[#F4F7F9] dark:bg-[#182736] border border-[#E5EAEF] dark:border-[#223647] shrink-0 overflow-hidden flex items-center justify-center relative shadow-xs">
                        <img
                          src={imgSrc}
                          alt={med.name}
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = '/drug_images/paracetamol.jpg';
                          }}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      </div>

                      {/* Right Info Section */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch">
                        {/* Header Row: Title + Status Badge + 3-dots Menu */}
                        <div className="flex items-start justify-between gap-1.5">
                          <div className="flex flex-col items-start gap-1 min-w-0 flex-1">
                            <h3 className="text-sm sm:text-base font-bold text-[#1E293B] dark:text-white truncate max-w-full">
                              {med.name}
                            </h3>
                            {/* Status Badge */}
                            {isLow ? (
                              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#FEF3E2] text-[#E08A1E] dark:bg-[#3d2716] dark:text-[#f59e0b] shrink-0">
                                <span>✦</span> Low Stock
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#E6F8F2] text-[#0D9488] dark:bg-[#133833] dark:text-[#2dd4bf] shrink-0">
                                <span>✦</span> In Stock
                              </span>
                            )}
                          </div>

                          {/* 3-dots menu button */}
                          <div className="relative card-action-menu shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuId(activeMenuId === med.med_id ? null : med.med_id);
                              }}
                              className="p-1 rounded-lg text-[#94A3B8] hover:text-[#1E293B] dark:hover:text-white hover:bg-[#F1F5F9] dark:hover:bg-[#1a2b3a] transition-colors"
                              title="Options"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>

                            {/* Action Dropdown Menu */}
                            {activeMenuId === med.med_id && (
                              <div className="absolute right-0 top-7 z-30 w-32 bg-white dark:bg-[#172838] border border-[#E2E8F0] dark:border-[#223647] rounded-xl shadow-xl py-1 text-xs animate-fadeIn">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    handleOpenRestock(med);
                                  }}
                                  className="w-full px-3 py-1.5 text-left flex items-center gap-2 text-[#1E293B] dark:text-white hover:bg-[#F1F5F9] dark:hover:bg-[#1f3244] font-medium"
                                >
                                  <PackagePlus className="w-3.5 h-3.5 text-[#0D9488]" />
                                  <span>Restock</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    setPendingDeleteMed(med);
                                  }}
                                  className="w-full px-3 py-1.5 text-left flex items-center gap-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 font-medium"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Delete</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Specs Row: Strength & Dosage Form */}
                        <div className="space-y-0.5 my-1.5">
                          {med.strength && (
                            <div className="flex items-center gap-1.5 text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                              <ShieldCheck className="w-3 h-3 text-[#0D9488] shrink-0" />
                              <span>{med.strength}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5 text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                            <Box className="w-3 h-3 text-[#8E9CA8] shrink-0" />
                            <span>{med.dosage_form || 'Tablet'}</span>
                          </div>
                        </div>

                        {/* Quantity in Stock & Percentage Progress Bar */}
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-medium text-[#8E9CA8] dark:text-[#8094a5] block">
                            Quantity in Stock
                          </span>
                          <div className="flex items-center justify-between">
                            <span className={`text-xs sm:text-sm font-bold ${isLow ? 'text-[#E08A1E] dark:text-[#f59e0b]' : 'text-[#0D9488] dark:text-[#2dd4bf]'}`}>
                              {med.stock} {med.stock_unit || 'tablets'}
                            </span>
                            <span className="text-[11px] font-semibold text-[#8E9CA8] dark:text-[#8094a5]">
                              {percentage}%
                            </span>
                          </div>
                          {/* Pill Progress Bar */}
                          <div className="w-full h-1.5 rounded-full bg-[#EBF2F7] dark:bg-[#1b2b3a] overflow-hidden mt-0.5">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                isLow ? 'bg-[#F59E0B]' : 'bg-[#0D9488]'
                              }`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Row: 3 Metadata Columns Matching Reference Image */}
                    <div className="border-t border-[#F1F5F9] dark:border-[#1e2f3e] pt-3 grid grid-cols-3 gap-1.5">
                      {/* Expiration Date */}
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1 text-[10px] text-[#8E9CA8] dark:text-[#8094a5]">
                          <Calendar className="w-2.5 h-2.5 text-[#94A3B8]" />
                          <span className="truncate">Expiration Date</span>
                        </div>
                        <div className="text-[11px] font-semibold text-[#1E293B] dark:text-white truncate">
                          {expDate}
                        </div>
                      </div>

                      {/* Last Restock */}
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1 text-[10px] text-[#8E9CA8] dark:text-[#8094a5]">
                          <Clock className="w-2.5 h-2.5 text-[#94A3B8]" />
                          <span className="truncate">Last Restock</span>
                        </div>
                        <div className="text-[11px] font-semibold text-[#1E293B] dark:text-white truncate">
                          {lastRestock}
                        </div>
                      </div>

                      {/* Batch No */}
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1 text-[10px] text-[#8E9CA8] dark:text-[#8094a5]">
                          <Tag className="w-2.5 h-2.5 text-[#94A3B8]" />
                          <span className="truncate">Batch No.</span>
                        </div>
                        <div className="text-[11px] font-semibold text-[#1E293B] dark:text-white truncate">
                          {batchNoVal}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Low Stock Alerts Banner (if any) */}
          {lowStockMeds.length > 0 && (
            <div className="space-y-2.5 pt-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                  Low Stock Attention ({lowStockMeds.length})
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {lowStockMeds.map((med) => (
                  <div
                    key={`alert-${med.med_id}`}
                    className="bg-white dark:bg-[#13222f] border border-rose-200 dark:border-rose-900/50 rounded-2xl p-3 shadow-xs flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h5 className="text-xs font-bold text-[#1E2837] dark:text-white truncate">
                          {med.name}
                        </h5>
                        <p className="text-[10px] text-[#8B9DA8]">
                          {med.stock} {med.stock_unit || 'tablets'} remaining
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenRestock(med)}
                      className="px-2.5 py-1 bg-[#2E7D7E] hover:bg-[#26696a] text-white text-[11px] font-semibold rounded-lg transition-all shrink-0 shadow-xs"
                    >
                      Restock
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: FIXED PICTURE & INVENTORY GUIDELINES (IDENTICAL TO INTAKE & SETTINGS) */}
        <div className="md:col-span-5 xl:col-span-5 2xl:col-span-4 flex flex-col gap-3 h-full overflow-hidden">
          {/* Card 1: Medical Stock Visual & Quote Card */}
          <div className="glass-surface bg-white/80 dark:bg-[#13222f]/85 border border-white/80 dark:border-white/10 rounded-2xl p-3 sm:p-3.5 xl:p-4 2xl:p-5 shadow-sm flex flex-col items-center text-center gap-3 overflow-hidden flex-1 min-h-0">
            <div className="w-full flex-1 min-h-[170px] sm:min-h-[200px] xl:min-h-[260px] 2xl:min-h-[340px] rounded-2xl overflow-hidden relative shadow-sm">
              <img
                src="/assets/medication_stock_art.jpg"
                alt="Prescription stock and pharmacy supplies"
                className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent flex items-end p-3 xl:p-4">
                <span className="text-white text-[11px] xl:text-xs 2xl:text-sm font-semibold drop-shadow-md">
                  Prescription Stock & Inventory
                </span>
              </div>
            </div>

            <div className="shrink-0 space-y-1">
              <h3 className="text-xs xl:text-sm 2xl:text-base font-bold text-[#1E2837] dark:text-white font-serif italic text-[#2E7D7E] dark:text-[#2dd4bf]">
                Stock Well, Never Miss a Dose ♡
              </h3>
              <p className="text-[11px] xl:text-xs 2xl:text-sm text-[#8B9DA8] dark:text-[#859ba8] leading-relaxed">
                Keep prescriptions organized and monitor your refill thresholds in advance.
              </p>
            </div>
          </div>

          {/* Card 2: Inventory Safety & Organization Guidelines */}
          <div className="glass-surface bg-white/75 dark:bg-[#13222f]/75 border border-white/80 dark:border-white/10 rounded-2xl p-3 sm:p-3.5 xl:p-4 2xl:p-5 space-y-2 xl:space-y-3 shrink-0">
            <div className="flex items-center gap-2 pb-1.5 xl:pb-2 border-b border-[#E3E8EE] dark:border-[#1c3345]">
              <div className="w-6 h-6 xl:w-7 xl:h-7 rounded-lg bg-teal-50 dark:bg-teal-500/10 text-[#2E7D7E] dark:text-[#2dd4bf] flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 xl:w-4 xl:h-4" />
              </div>
              <h4 className="text-xs xl:text-sm font-bold text-[#1E2837] dark:text-white">
                Inventory Guidelines
              </h4>
            </div>
            <ul className="text-[11px] xl:text-xs 2xl:text-sm text-[#8B9DA8] dark:text-[#859ba8] space-y-1.5 xl:space-y-2 list-disc list-inside leading-relaxed">
              <li>Store medications in a cool, dry place away from heat.</li>
              <li>Always check expiration dates before restocking inventory.</li>
              <li>Keep original packaging or clear labels for dosage safety.</li>
              <li>Refill your prescription when supply reaches 25% or less.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* REGISTER NEW DRUG MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-[780px] lg:max-w-[880px] xl:max-w-[960px] my-auto max-h-[92vh] bg-white dark:bg-[#131d27] border border-[#E3E8EE] dark:border-[#223142] rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 animate-fadeIn">
            {/* Form Side (7 cols) */}
            <form onSubmit={handleAddMedication} className="lg:col-span-7 min-w-0 p-4 sm:p-6 lg:p-8 flex flex-col justify-between space-y-4 max-h-[92vh] overflow-y-auto custom-scrollbar">
              <div>
                {/* Modal Header */}
                <div className="flex items-center justify-between pb-3 border-b border-[#E3E8EE] dark:border-[#1e2d3d] mb-4">
                  <div className="flex items-center gap-3">
                    {imageData ? (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="w-10 h-10 min-w-[40px] min-h-[40px] max-w-[40px] max-h-[40px] aspect-square rounded-2xl overflow-hidden border border-purple-500/40 shrink-0 flex items-center justify-center cursor-pointer relative group"
                        title="Change medicine photo"
                      >
                        <img src={imageData} alt="Medicine preview" className="w-full h-full object-cover rounded-2xl" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-2xl">
                          <Camera className="w-3.5 h-3.5 text-white" />
                        </div>
                      </div>
                    ) : (
                      <div className="w-10 h-10 min-w-[40px] min-h-[40px] max-w-[40px] max-h-[40px] aspect-square rounded-2xl bg-purple-500/15 border border-purple-500/30 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                        <Pill className="w-5 h-5 -rotate-45" />
                      </div>
                    )}
                    <div>
                      <h3 className="text-base font-bold text-[#1E2837] dark:text-white leading-tight">
                        Register New Drug
                      </h3>
                      <p className="text-xs text-[#8B9DA8] dark:text-[#859ba8] mt-0.5">
                        Add new medicine to stock inventory.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="p-1 rounded-lg text-[#8B9DA8] hover:text-[#1E2837] dark:hover:text-white hover:bg-[#F3F6F9] dark:hover:bg-[#1a2838] transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {formMsg.text && (
                  <div
                    className={`p-3 rounded-xl mb-3 text-xs flex items-center gap-2 ${
                      formMsg.isError
                        ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20'
                        : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                    }`}
                  >
                    {formMsg.isError ? <AlertCircle className="w-4 h-4 shrink-0" /> : <Check className="w-4 h-4 shrink-0" />}
                    <span>{formMsg.text}</span>
                  </div>
                )}

                <div className="space-y-4">
                  {/* Field 1: Medicine Name */}
                  <div>
                    <label className="block text-xs font-semibold text-[#1E2837] dark:text-white mb-1.5">
                      Medicine Name
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Paracetamol"
                      className="w-full px-4 py-2.5 bg-[#F3F6F9] dark:bg-[#182635] border border-[#E3E8EE] dark:border-[#26374a] rounded-xl text-xs text-[#1E2837] dark:text-white placeholder-[#8B9DA8] focus:outline-none focus:border-purple-500 transition-all"
                    />
                  </div>

                  {/* Row: Medicine Strength & Type of Medicine */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="min-w-0">
                      <label className="block text-xs font-semibold text-[#1E2837] dark:text-white mb-1.5">
                        Medicine Strength
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          required
                          value={strengthVal}
                          onChange={(e) => setStrengthVal(e.target.value)}
                          placeholder="500"
                          className="min-w-0 flex-1 px-3.5 py-2.5 bg-[#F3F6F9] dark:bg-[#182635] border border-[#E3E8EE] dark:border-[#26374a] rounded-xl text-xs text-[#1E2837] dark:text-white focus:outline-none focus:border-purple-500 transition-all"
                        />
                        <select
                          value={strengthUnit}
                          onChange={(e) => setStrengthUnit(e.target.value)}
                          className="w-24 px-3 py-2.5 bg-[#F3F6F9] dark:bg-[#182635] border border-[#E3E8EE] dark:border-[#26374a] rounded-xl text-xs text-[#1E2837] dark:text-white focus:outline-none focus:border-purple-500 cursor-pointer"
                        >
                          <option value="mg" className="dark:bg-[#131d27]">mg</option>
                          <option value="g" className="dark:bg-[#131d27]">g</option>
                          <option value="ml" className="dark:bg-[#131d27]">ml</option>
                          <option value="mcg" className="dark:bg-[#131d27]">mcg</option>
                          <option value="IU" className="dark:bg-[#131d27]">IU</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#1E2837] dark:text-white mb-1.5">
                        Type of Medicine
                      </label>
                      <select
                        value={dosageForm}
                        onChange={(e) => setDosageForm(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-[#F3F6F9] dark:bg-[#182635] border border-[#E3E8EE] dark:border-[#26374a] rounded-xl text-xs text-[#1E2837] dark:text-white focus:outline-none focus:border-purple-500 cursor-pointer"
                      >
                        <option value="Tablet" className="dark:bg-[#131d27]">Tablet</option>
                        <option value="Capsule" className="dark:bg-[#131d27]">Capsule</option>
                        <option value="Syrup" className="dark:bg-[#131d27]">Syrup</option>
                        <option value="Injection" className="dark:bg-[#131d27]">Injection</option>
                        <option value="Drops" className="dark:bg-[#131d27]">Drops</option>
                        <option value="Ointment" className="dark:bg-[#131d27]">Ointment</option>
                        <option value="Inhaler" className="dark:bg-[#131d27]">Inhaler</option>
                        <option value="Patch" className="dark:bg-[#131d27]">Patch</option>
                      </select>
                    </div>
                  </div>

                  {/* Row: How Many Do You Have? & Alert Me When Stock Reaches */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="min-w-0">
                      <label className="block text-xs font-semibold text-[#1E2837] dark:text-white mb-1.5">
                        Quantity in Stock
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          required
                          value={stock}
                          onChange={(e) => setStock(e.target.value)}
                          placeholder="30"
                          className="min-w-0 flex-1 px-3.5 py-2.5 bg-[#F3F6F9] dark:bg-[#182635] border border-[#E3E8EE] dark:border-[#26374a] rounded-xl text-xs text-[#1E2837] dark:text-white focus:outline-none focus:border-purple-500 transition-all"
                        />
                        <select
                          value={stockUnit}
                          onChange={(e) => setStockUnit(e.target.value)}
                          className="w-28 shrink-0 px-3 py-2.5 bg-[#F3F6F9] dark:bg-[#182635] border border-[#E3E8EE] dark:border-[#26374a] rounded-xl text-xs text-[#1E2837] dark:text-white focus:outline-none focus:border-purple-500 cursor-pointer"
                        >
                          <option value="tablets" className="dark:bg-[#131d27]">tablets</option>
                          <option value="capsules" className="dark:bg-[#131d27]">capsules</option>
                          <option value="pills" className="dark:bg-[#131d27]">pills</option>
                          <option value="bottles" className="dark:bg-[#131d27]">bottles</option>
                          <option value="vials" className="dark:bg-[#131d27]">vials</option>
                          <option value="packs" className="dark:bg-[#131d27]">packs</option>
                          <option value="ml" className="dark:bg-[#131d27]">ml</option>
                        </select>
                      </div>
                    </div>

                    <div className="min-w-0">
                      <label className="block text-xs font-semibold text-[#1E2837] dark:text-white mb-1.5">
                        Alert When Stock Reaches
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={threshold}
                        onChange={(e) => setThreshold(e.target.value)}
                        placeholder="10"
                        className="w-full px-3.5 py-2.5 bg-[#F3F6F9] dark:bg-[#182635] border border-[#E3E8EE] dark:border-[#26374a] rounded-xl text-xs text-[#1E2837] dark:text-white focus:outline-none focus:border-purple-500 transition-all"
                      />
                    </div>
                  </div>

                  {/* Row: Expiration Date & Batch Number */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-[#1E2837] dark:text-white mb-1.5">
                        Expiration Date (Optional)
                      </label>
                      <input
                        type="date"
                        value={expirationDate}
                        onChange={(e) => setExpirationDate(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-[#F3F6F9] dark:bg-[#182635] border border-[#E3E8EE] dark:border-[#26374a] rounded-xl text-xs text-[#1E2837] dark:text-white focus:outline-none focus:border-purple-500 cursor-pointer"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#1E2837] dark:text-white mb-1.5">
                        Batch No. (Optional)
                      </label>
                      <input
                        type="text"
                        value={batchNo}
                        onChange={(e) => setBatchNo(e.target.value)}
                        placeholder="e.g. PCT-2026-001"
                        className="w-full px-3.5 py-2.5 bg-[#F3F6F9] dark:bg-[#182635] border border-[#E3E8EE] dark:border-[#26374a] rounded-xl text-xs text-[#1E2837] dark:text-white placeholder-[#8B9DA8] focus:outline-none focus:border-purple-500 transition-all"
                      />
                    </div>
                  </div>

                  {/* Medicine Photo / Picture Upload (Optional) */}
                  <div>
                    <label className="block text-xs font-semibold text-[#1E2837] dark:text-white mb-1.5">
                      Medicine Photo (Optional)
                    </label>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />

                    {imageData ? (
                      <div className="flex items-center justify-between p-2.5 rounded-xl border border-purple-500/40 bg-purple-500/5">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 min-w-[44px] min-h-[44px] max-w-[44px] max-h-[44px] aspect-square rounded-2xl overflow-hidden border border-purple-500/30 shrink-0 flex items-center justify-center bg-[#F3F6F9] dark:bg-[#182635]">
                            <img src={imageData} alt="Medicine preview" className="w-full h-full object-cover rounded-2xl" />
                          </div>
                          <div>
                            <span className="text-xs font-semibold text-[#1E2837] dark:text-white block">Custom Photo Attached</span>
                            <span className="text-[10px] text-[#8B9DA8]">Custom bottle photo attached</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="px-2.5 py-1 text-[11px] font-semibold text-purple-600 dark:text-purple-400 hover:underline"
                          >
                            Change
                          </button>
                          <button
                            type="button"
                            onClick={() => setImageData('')}
                            className="p-1 text-[#8B9DA8] hover:text-rose-500 transition-colors"
                            title="Remove photo"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full py-2.5 px-3.5 rounded-xl border border-dashed border-[#E3E8EE] dark:border-[#26374a] hover:border-purple-500 bg-[#F3F6F9]/40 dark:bg-[#182635]/30 hover:bg-purple-500/5 transition-all flex items-center justify-between text-xs text-[#8B9DA8] hover:text-[#1E2837] dark:hover:text-white group"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                            <Camera className="w-4 h-4" />
                          </div>
                          <div className="text-left">
                            <span className="block font-medium text-[#1E2837] dark:text-white">Upload Medicine Photo</span>
                            <span className="text-[10px] text-[#8B9DA8]">(Leave blank to use default realistic photo)</span>
                          </div>
                        </div>
                        <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400">Select</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E3E8EE] dark:border-[#1e2d3d]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold border border-[#E3E8EE] dark:border-[#26374a] hover:bg-[#F3F6F9] dark:hover:bg-[#182635] text-[#64748B] dark:text-[#859ba8] transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-[#8b5cf6] hover:bg-[#7c3aed] text-white shadow-lg shadow-purple-500/25 transition-all flex items-center justify-center gap-2"
                >
                  <span>{submitting ? 'Adding...' : 'Add to Stock Inventory'}</span>
                </button>
              </div>
            </form>

            {/* Artwork Side (5 cols) */}
            <div className="hidden lg:block lg:col-span-5 relative min-h-[460px] bg-gradient-to-br from-[#E2F0EF] to-[#D5EAE9] dark:from-[#112733] dark:to-[#0a1822] overflow-hidden">
              <img
                src="/assets/medication_stock_art.jpg"
                alt="Medication pharmacy stock"
                className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
              />
              <div className="absolute top-8 right-8 max-w-[240px] text-right">
                <p className="inline-block rounded-xl border border-white/30 bg-black/55 px-3 py-2 text-sm sm:text-base font-semibold text-white italic drop-shadow-sm font-serif leading-snug shadow-lg backdrop-blur-sm">
                  Stock Well, Never Miss a Dose ♡
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RESTOCK MODAL */}
      {showRestockModal && restockMedObj && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-md my-auto max-h-[90vh] bg-white dark:bg-[#13222f] border border-[#E3E8EE] dark:border-[#1c3345] rounded-3xl p-6 shadow-2xl animate-fadeIn space-y-4 overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between pb-3 border-b border-[#E3E8EE] dark:border-[#1c3345]">
              <div className="flex items-center gap-2">
                <PackagePlus className="w-5 h-5 text-[#2E7D7E] dark:text-[#2dd4bf]" />
                <h3 className="font-bold text-sm text-[#1E2837] dark:text-white">
                  Restock {restockMedObj.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRestockModal(false)}
                className="p-1 rounded-lg text-[#8B9DA8] hover:text-[#1E2837]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {restockMsg.text && (
              <div className={`p-2.5 rounded-xl text-xs ${restockMsg.isError ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
                {restockMsg.text}
              </div>
            )}

            <form onSubmit={handleConfirmRestock} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#64748B] dark:text-[#859ba8] mb-1">
                  Quantity to Add ({restockMedObj.stock_unit || 'tablets'}):
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={addStockAmount}
                  onChange={(e) => setAddStockAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F3F6F9] dark:bg-[#172838] border border-[#E3E8EE] dark:border-[#1c3345] rounded-xl text-xs text-[#1E2837] dark:text-white focus:outline-none focus:border-[#2E7D7E]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRestockModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#64748B] hover:bg-[#F3F6F9]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={restocking}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#2E7D7E] hover:bg-[#26696a] text-white shadow-sm"
                >
                  {restocking ? 'Updating...' : 'Confirm Restock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {pendingDeleteMed && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white dark:bg-[#13222f] border border-[#E3E8EE] dark:border-[#1c3345] rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-sm text-[#1E2837] dark:text-white">Delete Medication?</h3>
            <p className="text-xs text-[#8B9DA8]">
              Are you sure you want to remove <span className="font-bold text-[#1E2837] dark:text-white">{pendingDeleteMed.name}</span>?
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPendingDeleteMed(null)}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold text-[#64748B]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteMed}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
