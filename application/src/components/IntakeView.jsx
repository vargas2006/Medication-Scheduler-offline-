import React, { useState, useEffect } from 'react';
import { Pill, Check, Search, Calendar, Clock, Plus, X, CheckCircle, AlertCircle, LayoutList, LayoutGrid } from 'lucide-react';
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
        }, 1200);
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
    <div className="p-6 flex flex-col h-full overflow-hidden space-y-4 relative bg-[#f5f7fa] dark:bg-[#0f172a] transition-colors">
      {/* Top Controls Bar */}
      <div className="bg-white dark:bg-[#1e293b] border border-[#d9e0e8] dark:border-[#334155] rounded-lg p-4 flex flex-col gap-3 shrink-0 shadow-2xs">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#64748b] dark:text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search medication by name or dosage..."
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

            <button
              onClick={() => {
                setShowModal(true);
                if (medications.length > 0 && !selectedMedId) {
                  setSelectedMedId(medications[0].med_id.toString());
                }
              }}
              className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-medium text-xs px-3.5 py-2 rounded-md flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add Schedule</span>
            </button>
          </div>
        </div>

        {/* Timeline Filter */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-[#d9e0e8] dark:border-[#334155]">
          <div className="flex items-center gap-2 text-xs">
            <Calendar className="w-3.5 h-3.5 text-[#2563eb] dark:text-blue-400" />
            <span className="text-[#64748b] dark:text-slate-400 font-medium">Timeline Filter:</span>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-[#f8fafc] dark:bg-[#0f172a] border border-[#d9e0e8] dark:border-[#334155] text-[#172033] dark:text-slate-100 rounded-md px-2 py-1 focus:outline-none cursor-pointer text-xs"
            >
              <option value="ALL">All Dates</option>
              <option value="TODAY">Today</option>
              <option value="YESTERDAY">Yesterday</option>
              <option value="THIS_WEEK">This Week (7 Days)</option>
              <option value="THIS_MONTH">This Month (30 Days)</option>
              <option value="LAST_3_MONTHS">Last 3 Months (90 Days)</option>
              <option value="CUSTOM">Custom Range</option>
            </select>
          </div>

          <div className="text-xs text-[#64748b] dark:text-slate-400 font-medium">
            <span>Items: </span>
            <span className="font-semibold text-[#172033] dark:text-slate-200">{filteredMeds.length}</span>
          </div>
        </div>

        {dateFilter === 'CUSTOM' && (
          <div className="flex items-center gap-2 pt-2 text-xs">
            <span className="text-[#64748b] dark:text-slate-400">Start:</span>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="bg-[#f8fafc] dark:bg-[#0f172a] border border-[#d9e0e8] dark:border-[#334155] rounded px-2 py-1 text-xs text-[#172033] dark:text-slate-100"
            />
            <span className="text-[#64748b] dark:text-slate-400">End:</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="bg-[#f8fafc] dark:bg-[#0f172a] border border-[#d9e0e8] dark:border-[#334155] rounded px-2 py-1 text-xs text-[#172033] dark:text-slate-100"
            />
          </div>
        )}
      </div>

      {/* Main Intake Cards Display */}
      <div className="flex-1 overflow-y-auto pr-1">
        {loading ? (
          <div className="text-center text-[#64748b] dark:text-slate-400 py-16 text-xs">Loading medications...</div>
        ) : filteredMeds.length === 0 ? (
          <div className="text-center text-[#64748b] dark:text-slate-400 py-20 text-xs">No medications found for dose logging.</div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMeds.map((med) => {
              const isOut = med.stock <= 0;
              const isSuccess = message.medId === med.med_id;

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

                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${
                      isOut
                        ? 'bg-[#fee2e2] text-[#b91c1c] dark:bg-rose-950/60 dark:text-rose-300'
                        : med.is_low_stock
                        ? 'bg-[#fef3c7] text-[#b45309] dark:bg-amber-950/60 dark:text-amber-300'
                        : 'bg-[#d1fae5] text-[#047857] dark:bg-emerald-950/60 dark:text-emerald-300'
                    }`}>
                      {isOut ? 'Out of Stock' : med.is_low_stock ? 'Low Stock' : 'In Stock'}
                    </span>
                  </div>

                  <div className="bg-[#f8fafc] dark:bg-[#0f172a] border border-[#d9e0e8] dark:border-[#334155] rounded-md p-2 flex items-center justify-between text-xs">
                    <span className="text-[#64748b] dark:text-slate-400">Current Stock:</span>
                    <span className={`font-semibold ${isOut ? 'text-[#dc2626] dark:text-red-400' : 'text-[#172033] dark:text-slate-100'}`}>
                      {med.stock} doses
                    </span>
                  </div>

                  {isSuccess ? (
                    <div className="py-2 bg-[#d1fae5] text-[#047857] dark:bg-emerald-950/60 dark:text-emerald-300 font-medium text-xs rounded-md flex items-center justify-center gap-1.5 border border-emerald-200">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Dose Logged!</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleTakeDose(med)}
                      disabled={isOut}
                      className={`w-full py-2 rounded-md font-medium text-xs flex items-center justify-center gap-1.5 transition-colors shadow-2xs ${
                        isOut
                          ? 'bg-[#e2e8f0] dark:bg-slate-800 text-[#94a3b8] cursor-not-allowed'
                          : 'bg-[#16a34a] hover:bg-[#15803d] text-white cursor-pointer'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
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
                    {isSuccess ? (
                      <div className="px-3 py-1 bg-[#d1fae5] text-[#047857] font-medium text-xs rounded-md flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Recorded</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleTakeDose(med)}
                        disabled={isOut}
                        className={`px-3.5 py-1.5 rounded-md font-medium text-xs flex items-center gap-1.5 transition-colors ${
                          isOut
                            ? 'bg-[#e2e8f0] dark:bg-slate-800 text-[#94a3b8] cursor-not-allowed'
                            : 'bg-[#16a34a] hover:bg-[#15803d] text-white cursor-pointer'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Take Dose</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Form: Add Intake Schedule */}
      {showModal && (
        <div className="fixed inset-0 bg-[#0f172a]/60 backdrop-blur-2xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="w-full max-w-lg bg-white dark:bg-[#1e293b] border border-[#d9e0e8] dark:border-[#334155] rounded-lg p-6 shadow-lg space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#d9e0e8] dark:border-[#334155] pb-3">
              <div>
                <h3 className="text-base font-semibold text-[#172033] dark:text-slate-100">Schedule Intake Dose</h3>
                <p className="text-xs text-[#64748b] dark:text-slate-400">Configure dose schedule timing &amp; status</p>
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

            <form onSubmit={handleCreateIntakeSchedule} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-[#172033] dark:text-slate-200 mb-1">Select Medication</label>
                <select
                  value={selectedMedId}
                  onChange={(e) => setSelectedMedId(e.target.value)}
                  className="w-full bg-[#f8fafc] dark:bg-[#0f172a] border border-[#d9e0e8] dark:border-[#334155] rounded-md px-3 py-2 text-xs text-[#172033] dark:text-slate-100 focus:outline-none focus:border-[#2563eb]"
                >
                  {medications.map((m) => (
                    <option key={m.med_id} value={m.med_id}>
                      {m.name} ({m.dosage}) &bull; Stock: {m.stock}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-[#172033] dark:text-slate-200 mb-1">Intake Date</label>
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
                  type="time"
                  required
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="w-full bg-[#f8fafc] dark:bg-[#0f172a] border border-[#d9e0e8] dark:border-[#334155] rounded-md px-3 py-2 text-xs text-[#172033] dark:text-slate-100 focus:outline-none focus:border-[#2563eb] mb-1.5"
                />

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
              </div>

              <div>
                <label className="block font-medium text-[#172033] dark:text-slate-200 mb-1">Initial Log Status</label>
                <select
                  value={intakeStatus}
                  onChange={(e) => setIntakeStatus(e.target.value)}
                  className="w-full bg-[#f8fafc] dark:bg-[#0f172a] border border-[#d9e0e8] dark:border-[#334155] rounded-md px-3 py-2 text-xs text-[#172033] dark:text-slate-100 focus:outline-none focus:border-[#2563eb]"
                >
                  <option value="TAKEN">TAKEN (Log as completed immediately)</option>
                  <option value="PENDING">PENDING (Keep on schedule alert list)</option>
                </select>
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
                  {submitting ? 'Saving...' : 'Save Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
