import React, { useState, useEffect } from 'react';
import { Pill, Check, Search, Calendar, Clock, Plus, X, CheckCircle, AlertCircle, LayoutList, LayoutGrid } from 'lucide-react';
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

export default function IntakeView({ user, onDataChange }) {
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState({ text: '', medId: null });

  // View Mode: 'grid' | 'list'
  const [viewMode, setViewMode] = useState('grid');

  // Timeline / Date Filter State
  const [dateFilter, setDateFilter] = useState('ALL');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Modal & Form State
  const [showModal, setShowModal] = useState(false);
  const [selectedMedId, setSelectedMedId] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState('08:00');
  const [intakeStatus, setIntakeStatus] = useState('TAKEN');
  const [formMsg, setFormMsg] = useState({ text: '', isError: false });
  const [submitting, setSubmitting] = useState(false);

  const fetchMeds = async () => {
    if (!user?.user_id) return;
    setLoading(true);
    const res = await callApi('get_medications', user.user_id);
    if (res.success) {
      setMedications(res.medications || []);
      if (res.medications?.length > 0 && !selectedMedId) {
        setSelectedMedId(res.medications[0].med_id.toString());
      }
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

  const handleCreateIntakeSchedule = async (e) => {
    e.preventDefault();
    setFormMsg({ text: '', isError: false });

    if (!selectedMedId) {
      setFormMsg({ text: 'Please select a medication.', isError: true });
      return;
    }

    setSubmitting(true);
    try {
      const res = await callApi(
        'create_intake_schedule',
        user.user_id,
        selectedMedId,
        selectedDate,
        selectedTime,
        intakeStatus
      );

      if (res.success) {
        setFormMsg({ text: res.message || 'Intake schedule created!', isError: false });
        fetchMeds();
        if (onDataChange) onDataChange();
        setTimeout(() => {
          setShowModal(false);
          setFormMsg({ text: '', isError: false });
        }, 1500);
      } else {
        setFormMsg({ text: res.message || 'Failed to create schedule.', isError: true });
      }
    } catch (err) {
      setFormMsg({ text: 'Error saving intake schedule.', isError: true });
    } finally {
      setSubmitting(false);
    }
  };

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

  // Filtering search + date filter
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
      {/* Top Controls Bar: Search, Timeline Filter & View Toggle */}
      <div className="bg-[#161926] border border-[#24293e] rounded-2xl p-4 flex flex-col gap-3 shrink-0">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* Search Box */}
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

            <button
              onClick={() => {
                setShowModal(true);
                if (medications.length > 0 && !selectedMedId) {
                  setSelectedMedId(medications[0].med_id.toString());
                }
              }}
              className="bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-purple-900/30 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <Calendar className="w-4 h-4" />
              <span>Schedule New Intake</span>
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
              <option value="ALL" className="bg-[#161926]">All Dates</option>
              <option value="TODAY" className="bg-[#161926]">Today</option>
              <option value="YESTERDAY" className="bg-[#161926]">Yesterday</option>
              <option value="THIS_WEEK" className="bg-[#161926]">This Week (7 Days)</option>
              <option value="THIS_MONTH" className="bg-[#161926]">This Month (30 Days)</option>
              <option value="LAST_3_MONTHS" className="bg-[#161926]">Last 3 Months (90 Days)</option>
              <option value="CUSTOM" className="bg-[#161926]">Custom Range</option>
            </select>
          </div>

          <div className="text-xs text-slate-400 flex items-center gap-2 font-medium">
            <span>Filtered Items:</span>
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

      {/* Main Content Area (List View vs Grid View) */}
      <div className="flex-1 overflow-y-auto pr-1">
        {loading ? (
          <div className="text-center text-slate-500 py-20 text-xs">Loading medications for intake...</div>
        ) : filteredMeds.length === 0 ? (
          <div className="text-center text-slate-500 py-24 text-xs">No medications found matching filter.</div>
        ) : viewMode === 'grid' ? (
          /* GRID VIEW LAYOUT */
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
                      <div className="w-11 h-11 rounded-xl bg-[#272d47] border border-[#3b4366] flex items-center justify-center text-xl shrink-0 overflow-hidden shadow-sm">
                        <MedImage src={med.image_path} alt={med.name} />
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
        ) : (
          /* LIST VIEW LAYOUT */
          <div className="space-y-2.5">
            {filteredMeds.map((med) => {
              const isOut = med.stock <= 0;
              const isSuccess = message.medId === med.med_id;

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
                      {isOut ? 'OUT OF STOCK' : med.is_low_stock ? 'LOW STOCK' : 'IN STOCK'}
                    </span>

                    {isSuccess ? (
                      <div className="px-4 py-1.5 bg-[#102d24] border border-[#10b981] text-[#10b981] font-bold text-xs rounded-lg flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Taken!</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleTakeDose(med)}
                        disabled={isOut}
                        className={`px-4 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all ${
                          isOut
                            ? 'bg-[#222736] text-slate-600 cursor-not-allowed'
                            : 'bg-[#10b981] hover:bg-[#059669] text-white shadow-sm'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{isOut ? 'Out of Stock' : 'Take Dose'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* FORM MODAL: Create Intake Schedule with Calendar & Time Picker */}
      {showModal && (
        <div className="fixed inset-0 bg-[#090b12]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="w-full max-w-lg bg-[#121520] border border-[#24293e] rounded-2xl p-6 shadow-2xl space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#1e2438] pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#2b2046] text-[#c084fc] flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white leading-tight">Schedule Intake Medication</h3>
                  <p className="text-[11px] text-slate-400">Set planned date, time, and dose status.</p>
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
                {formMsg.isError ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle className="w-4 h-4 shrink-0" />}
                <span>{formMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleCreateIntakeSchedule} className="space-y-4">
              {/* Medication Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Select Medication
                </label>
                <select
                  value={selectedMedId}
                  onChange={(e) => setSelectedMedId(e.target.value)}
                  className="w-full bg-[#161926] border border-[#272e45] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#7c3aed]"
                >
                  {medications.map((m) => (
                    <option key={m.med_id} value={m.med_id}>
                      {m.name} ({m.dosage}) &bull; Stock: {m.stock}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Selection with Calendar & Quick Pills */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#38bdf8]" />
                    <span>Choose Intake Date</span>
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

              {/* Time Selection with Presets & Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#c084fc]" />
                    <span>Choose Intake Time</span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">{selectedTime}</span>
                </div>

                <input
                  type="time"
                  required
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="w-full bg-[#161926] border border-[#272e45] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#7c3aed] mb-2"
                />

                {/* Preset Time Pills */}
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
              </div>

              {/* Intake Action Type / Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Intake Status</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setIntakeStatus('TAKEN')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                      intakeStatus === 'TAKEN'
                        ? 'bg-[#102d24] border-[#10b981] text-[#10b981] shadow-sm'
                        : 'bg-[#161926] border-[#272e45] text-slate-400 hover:text-white'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                    <span>Mark as TAKEN</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIntakeStatus('SCHEDULED')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                      intakeStatus === 'SCHEDULED'
                        ? 'bg-[#10273f] border-[#38bdf8] text-[#38bdf8] shadow-sm'
                        : 'bg-[#161926] border-[#272e45] text-slate-400 hover:text-white'
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                    <span>Set SCHEDULED Alert</span>
                  </button>
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
                  <Check className="w-4 h-4" />
                  <span>{submitting ? 'Saving...' : 'Save Intake Schedule'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
