import React, { useState, useEffect } from 'react';
import { Pill, Check, Search, Calendar, Clock, Plus, X, CheckCircle, AlertCircle, LayoutList, LayoutGrid } from 'lucide-react';
import { callApi } from '../utils/pywebview';

function MedImage({ src, alt }) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return <Pill className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />;
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

  const [viewMode, setViewMode] = useState('grid');
  const [dateFilter, setDateFilter] = useState('ALL');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

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
    <div className="p-5 flex flex-col h-full overflow-hidden space-y-4 relative transition-colors duration-150">

      {/* Desktop Toolbar Container */}
      <div className="bg-white dark:bg-[#151926] border border-slate-200 dark:border-[#222838] rounded-2xl p-4 flex flex-col gap-3 shrink-0 shadow-sm">
        <div className="flex items-center justify-between gap-3 flex-wrap">

          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
            <input
              type="text"
              placeholder="Search medication by name or dosage..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 dark:bg-[#1c2234] border border-slate-200 dark:border-[#262f46] rounded-xl pl-10 pr-4 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
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
                    ? 'bg-indigo-600 text-white shadow-sm'
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
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
                <span>Grid View</span>
              </button>
            </div>

            {/* Primary Action Button */}
            <button
              onClick={() => {
                setShowModal(true);
                if (medications.length > 0 && !selectedMedId) {
                  setSelectedMedId(medications[0].med_id.toString());
                }
              }}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-4 py-2 rounded-xl flex items-center gap-2 transition-all shadow-sm shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add Intake Schedule</span>
            </button>
          </div>
        </div>

        {/* Timeline Filter Bar */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-slate-200 dark:border-[#1e2436]">
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-[#1c2234] border border-slate-200 dark:border-[#262f46] px-3 py-1.5 rounded-xl text-xs">
            <Calendar className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            <span className="text-slate-500 dark:text-slate-400 font-medium">Filter Timeline:</span>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-transparent text-slate-900 dark:text-white font-bold focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-white dark:bg-[#151926]">All Dates</option>
              <option value="TODAY" className="bg-white dark:bg-[#151926]">Today</option>
              <option value="YESTERDAY" className="bg-white dark:bg-[#151926]">Yesterday</option>
              <option value="THIS_WEEK" className="bg-white dark:bg-[#151926]">This Week (7 Days)</option>
              <option value="THIS_MONTH" className="bg-white dark:bg-[#151926]">This Month (30 Days)</option>
              <option value="LAST_3_MONTHS" className="bg-white dark:bg-[#151926]">Last 3 Months (90 Days)</option>
              <option value="CUSTOM" className="bg-white dark:bg-[#151926]">Custom Range</option>
            </select>
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 font-medium">
            <span>Filtered Items:</span>
            <span className="bg-slate-100 text-sky-700 dark:bg-[#1c2234] dark:text-sky-400 border border-slate-200 dark:border-[#262f46] font-bold px-2.5 py-0.5 rounded-md">
              {filteredMeds.length}
            </span>
          </div>
        </div>

        {dateFilter === 'CUSTOM' && (
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-[#1c2234] border border-slate-200 dark:border-[#262f46] p-2 rounded-xl text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Start Date:</span>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="bg-white dark:bg-[#151926] border border-slate-200 dark:border-[#262f46] rounded-lg px-2 py-1 text-slate-900 dark:text-white text-xs focus:outline-none"
            />
            <span className="text-slate-500 dark:text-slate-400 font-medium">End Date:</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="bg-white dark:bg-[#151926] border border-slate-200 dark:border-[#262f46] rounded-lg px-2 py-1 text-slate-900 dark:text-white text-xs focus:outline-none"
            />
          </div>
        )}
      </div>

      {/* Main Content List / Grid */}
      <div className="flex-1 overflow-y-auto pr-1">
        {loading ? (
          <div className="text-center text-slate-500 dark:text-slate-400 py-20 text-xs">Loading medications for intake...</div>
        ) : filteredMeds.length === 0 ? (
          <div className="text-center text-slate-500 dark:text-slate-400 py-24 text-xs">No medications found matching filter.</div>
        ) : viewMode === 'grid' ? (

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMeds.map((med) => {
              const isOut = med.stock <= 0;
              const isSuccess = message.medId === med.med_id;

              return (
                <div
                  key={med.med_id}
                  className="bg-white dark:bg-[#151926] border border-slate-200 dark:border-[#222838] hover:border-sky-300 dark:hover:border-sky-500/40 rounded-2xl p-4 flex flex-col justify-between space-y-4 transition-all shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-[#1c2234] border border-slate-200 dark:border-[#262f46] flex items-center justify-center text-lg shrink-0 overflow-hidden shadow-sm">
                        <MedImage src={med.image_path} alt={med.name} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-slate-900 dark:text-white text-sm truncate">{med.name}</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{med.dosage}</p>
                      </div>
                    </div>

                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                      isOut
                        ? 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30'
                        : med.is_low_stock
                        ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30'
                    }`}>
                      {isOut ? 'OUT OF STOCK' : med.is_low_stock ? 'LOW STOCK' : 'IN STOCK'}
                    </span>
                  </div>

                  <div className="bg-slate-50 dark:bg-[#1c2234] border border-slate-200 dark:border-[#262f46] rounded-xl p-2.5 flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Current Stock:</span>
                    <span className={`font-bold text-sm ${isOut ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
                      {med.stock} doses
                    </span>
                  </div>

                  {isSuccess ? (
                    <div className="py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:border-emerald-500/30 dark:text-emerald-400 font-semibold text-xs rounded-xl flex items-center justify-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      <span>Dose Taken Logged!</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleTakeDose(med)}
                      disabled={isOut}
                      className={`w-full py-2 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-sm ${
                        isOut
                          ? 'bg-slate-100 text-slate-400 dark:bg-[#222838] dark:text-slate-500 cursor-not-allowed border border-slate-200 dark:border-[#2b334a]'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white'
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

          <div className="space-y-2">
            {filteredMeds.map((med) => {
              const isOut = med.stock <= 0;
              const isSuccess = message.medId === med.med_id;

              return (
                <div
                  key={med.med_id}
                  className="bg-white dark:bg-[#151926] border border-slate-200 dark:border-[#222838] hover:border-sky-300 dark:hover:border-sky-500/40 rounded-xl p-3 flex items-center justify-between transition-all"
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
                      {isOut ? 'OUT OF STOCK' : med.is_low_stock ? 'LOW STOCK' : 'IN STOCK'}
                    </span>

                    {isSuccess ? (
                      <div className="px-3.5 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:border-emerald-500/30 dark:text-emerald-400 font-semibold text-xs rounded-lg flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Taken!</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleTakeDose(med)}
                        disabled={isOut}
                        className={`px-3.5 py-1.5 rounded-lg font-semibold text-xs flex items-center gap-1.5 transition-all ${
                          isOut
                            ? 'bg-slate-100 text-slate-400 dark:bg-[#222838] dark:text-slate-500 cursor-not-allowed border border-slate-200 dark:border-[#2b334a]'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
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

      {/* Schedule Intake Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-[#090b12]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="w-full max-w-lg bg-white dark:bg-[#151926] border border-slate-200 dark:border-[#222838] rounded-2xl p-6 shadow-2xl space-y-5 text-slate-900 dark:text-white">

            <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#1e2436] pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">Schedule Intake Medication</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Set planned date, time, and dose status.</p>
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
                {formMsg.isError ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle className="w-4 h-4 shrink-0" />}
                <span>{formMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleCreateIntakeSchedule} className="space-y-4">

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Select Medication
                </label>
                <select
                  value={selectedMedId}
                  onChange={(e) => setSelectedMedId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#1c2234] border border-slate-200 dark:border-[#262f46] rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                >
                  {medications.map((m) => (
                    <option key={m.med_id} value={m.med_id}>
                      {m.name} ({m.dosage}) &bull; Stock: {m.stock}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                    <span>Choose Intake Date</span>
                  </label>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{selectedDate}</span>
                </div>

                <input
                  type="date"
                  required
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#1c2234] border border-slate-200 dark:border-[#262f46] rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 mb-2"
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
                  type="time"
                  required
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#1c2234] border border-slate-200 dark:border-[#262f46] rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 mb-2"
                />

                <div className="grid grid-cols-4 gap-2">
                  {timePresets.map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setSelectedTime(preset.value)}
                      className={`py-1.5 px-2 border rounded-lg text-[10px] font-bold transition-all ${
                        selectedTime === preset.value
                          ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-[#1c2234] hover:bg-slate-200 dark:hover:bg-[#222838] border-slate-200 dark:border-[#262f46] text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {preset.label} ({preset.value})
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Intake Status</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setIntakeStatus('TAKEN')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                      intakeStatus === 'TAKEN'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-500/15 dark:border-emerald-500/30 dark:text-emerald-400 shadow-sm'
                        : 'bg-slate-50 dark:bg-[#1c2234] border-slate-200 dark:border-[#262f46] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                    <span>Mark as TAKEN</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIntakeStatus('SCHEDULED')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                      intakeStatus === 'SCHEDULED'
                        ? 'bg-sky-50 text-sky-700 border-sky-300 dark:bg-sky-500/15 dark:border-sky-500/30 dark:text-sky-400 shadow-sm'
                        : 'bg-slate-50 dark:bg-[#1c2234] border-slate-200 dark:border-[#262f46] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                    <span>Set SCHEDULED Alert</span>
                  </button>
                </div>
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
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <span>{submitting ? 'Saving...' : 'Save Schedule'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
