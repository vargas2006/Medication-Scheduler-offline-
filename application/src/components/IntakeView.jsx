import React, { useState, useEffect } from 'react';
import { Pill, Check, Search, Calendar, Clock, Plus, X, AlertCircle, LayoutList, LayoutGrid, Trash2, CheckCircle2 } from 'lucide-react';
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

export default function IntakeView({ user, onDataChange }) {
  const [schedules, setSchedules] = useState([]);
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState({ text: '', schId: null });

  const [viewMode, setViewMode] = useState('grid');

  const [showModal, setShowModal] = useState(false);
  const [selectedMedId, setSelectedMedId] = useState('');
  const [dosePerIntake, setDosePerIntake] = useState('1');
  const [doseUnit, setDoseUnit] = useState('tablet');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState('08:00');
  const [frequency, setFrequency] = useState('Every day');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [instructions, setInstructions] = useState('');

  const [formMsg, setFormMsg] = useState({ text: '', isError: false });
  const [submitting, setSubmitting] = useState(false);

  const fetchSchedulesAndInventory = async () => {
    if (!user?.user_id) return;
    setLoading(true);
    try {
      const [schRes, medRes] = await Promise.all([
        callApi('get_schedules', user.user_id),
        callApi('get_medications', user.user_id)
      ]);

      if (schRes.success) {
        setSchedules(schRes.schedules || []);
      }
      if (medRes.success) {
        const meds = medRes.medications || [];
        setMedications(meds);
        if (meds.length > 0 && !selectedMedId) {
          setSelectedMedId(meds[0].med_id.toString());
        }
      }
    } catch (err) {
      console.error('Failed to fetch schedules', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedulesAndInventory();
  }, [user]);

  const handleTakeDose = async (sch) => {
    if ((sch.stock || 0) <= 0) return;
    try {
      const amt = parseInt(sch.dose_per_intake) || 1;
      const res = await callApi('take_dose', user.user_id, sch.med_id, amt);
      if (res.success) {
        setMessage({ text: `Dose of ${sch.med_name} logged as TAKEN!`, schId: sch.schedule_id });
        fetchSchedulesAndInventory();
        if (onDataChange) onDataChange();
        setTimeout(() => setMessage({ text: '', schId: null }), 3000);
      }
    } catch (err) {
      console.error('Take dose error', err);
    }
  };

  const handleDeleteSchedule = async (scheduleId) => {
    try {
      const res = await callApi('delete_schedule', scheduleId);
      if (res.success) {
        fetchSchedulesAndInventory();
        if (onDataChange) onDataChange();
      }
    } catch (err) {
      console.error('Delete schedule error', err);
    }
  };

  const handleCreateIntakeSchedule = async (e) => {
    e.preventDefault();
    setFormMsg({ text: '', isError: false });

    if (!selectedMedId) {
      setFormMsg({ text: 'Please select a medication from stock.', isError: true });
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
        'SCHEDULED',
        parseInt(dosePerIntake) || 1,
        doseUnit || 'tablet',
        frequency || 'Every day',
        startDate || selectedDate,
        endDate || null,
        instructions || ''
      );

      if (res.success) {
        setFormMsg({ text: res.message || 'Intake schedule created successfully!', isError: false });
        fetchSchedulesAndInventory();
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

  const setQuickTime = (timeVal) => {
    setSelectedTime(timeVal);
  };

  const timePresets = [
    { label: 'Morning', value: '08:00' },
    { label: 'Noon', value: '12:00' },
    { label: 'Evening', value: '18:00' },
    { label: 'Night', value: '21:00' }
  ];

  const filteredSchedules = schedules.filter((s) => {
    const search = searchTerm.toLowerCase();
    return (
      s.med_name.toLowerCase().includes(search) ||
      (s.strength || '').toLowerCase().includes(search) ||
      (s.frequency || '').toLowerCase().includes(search) ||
      (s.instructions || '').toLowerCase().includes(search)
    );
  });

  const selectedMedObj = medications.find((m) => m.med_id.toString() === selectedMedId.toString());

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
              placeholder="Search scheduled intake by medicine name or time..."
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
              onClick={() => {
                if (medications.length === 0) {
                  alert('Please register at least one medication in Medication Stock inventory first.');
                  return;
                }
                setShowModal(true);
              }}
              className="bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs px-4 py-2 rounded-xl flex items-center gap-2 transition-all shadow-sm shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add Intake Schedule</span>
            </button>
          </div>
        </div>
      </div>

      {/* Action Notification Toast */}
      {message.text && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-sm animate-fadeIn shrink-0">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span className="font-semibold">{message.text}</span>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto pr-1">
        {loading ? (
          <div className="text-center text-slate-500 dark:text-slate-400 py-20 text-xs">Loading intake schedules...</div>
        ) : filteredSchedules.length === 0 ? (
          <div className="text-center text-slate-500 dark:text-slate-400 py-24 text-xs">
            <p className="font-medium text-sm text-slate-700 dark:text-slate-300 mb-1">No intake schedules set yet.</p>
            <p className="text-slate-500 dark:text-slate-400">Click "Add Intake Schedule" to choose a medicine from stock and set your dose reminder time.</p>
          </div>
        ) : viewMode === 'grid' ? (

          /* Grid View Layout */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSchedules.map((sch) => {
              const stockAmt = sch.stock || 0;
              const isOut = stockAmt <= 0;
              const doseAmt = sch.dose_per_intake || 1;
              const unitStr = sch.dose_unit || 'tablet';

              return (
                <div
                  key={sch.schedule_id}
                  className="bg-white dark:bg-[#151926] border border-slate-200 dark:border-[#222838] hover:border-purple-300 dark:hover:border-purple-500/40 rounded-2xl p-4 flex flex-col justify-between space-y-4 transition-all shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-slate-900 dark:text-white text-sm truncate">{sch.med_name}</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{sch.strength}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteSchedule(sch.schedule_id)}
                      className="p-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors shrink-0"
                      title="Delete Schedule"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="bg-slate-50 dark:bg-[#1c2234] border border-slate-200 dark:border-[#262f46] rounded-xl p-3 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Scheduled Time:</span>
                      <span className="font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {sch.time_value}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Dose per Intake:</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {doseAmt} {unitStr}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Frequency:</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {sch.frequency || 'Every day'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Start Date:</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {sch.start_date || 'N/A'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">End Date:</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {sch.end_date || 'Continuous'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-[#222838]">
                      <span className="text-slate-500 dark:text-slate-400">Stock Available:</span>
                      <span className={`font-bold ${isOut ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {stockAmt} {sch.stock_unit || 'tablets'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleTakeDose(sch)}
                    disabled={isOut}
                    className={`w-full py-2.5 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-sm ${
                      isOut
                        ? 'bg-slate-100 text-slate-400 dark:bg-[#1c2234] dark:text-slate-600 cursor-not-allowed'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                    <span>{isOut ? 'Out of Stock (Refill Needed)' : 'Take Dose'}</span>
                  </button>
                </div>
              );
            })}
          </div>
        ) : (

          /* List View Layout */
          <div className="space-y-2">
            {filteredSchedules.map((sch) => {
              const stockAmt = sch.stock || 0;
              const isOut = stockAmt <= 0;
              const doseAmt = sch.dose_per_intake || 1;
              const unitStr = sch.dose_unit || 'tablet';

              return (
                <div
                  key={sch.schedule_id}
                  className="bg-white dark:bg-[#151926] border border-slate-200 dark:border-[#222838] hover:border-purple-300 dark:hover:border-purple-500/40 rounded-xl p-3 flex items-center justify-between transition-all"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-semibold text-slate-900 dark:text-white text-xs truncate">{sch.med_name} ({sch.strength})</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        Time: <span className="font-bold text-purple-600 dark:text-purple-400">{sch.time_value}</span> &bull; Dose: {doseAmt} {unitStr} &bull; Freq: {sch.frequency || 'Every day'} &bull; Stock: <span className={isOut ? 'text-rose-600 font-bold' : 'text-emerald-600 font-bold'}>{stockAmt} {sch.stock_unit || 'tablets'}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      onClick={() => handleTakeDose(sch)}
                      disabled={isOut}
                      className={`px-4 py-1.5 rounded-lg font-semibold text-xs transition-all flex items-center gap-1.5 ${
                        isOut
                          ? 'bg-slate-100 text-slate-400 dark:bg-[#1c2234] dark:text-slate-600 cursor-not-allowed'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{isOut ? 'Out of Stock' : 'Take Dose'}</span>
                    </button>

                    <button
                      onClick={() => handleDeleteSchedule(sch.schedule_id)}
                      className="p-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                      title="Delete Schedule"
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

      {/* Add Intake Schedule Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-[#090b12]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-[#151926] border border-slate-200 dark:border-[#222838] rounded-2xl p-6 shadow-2xl space-y-5 text-slate-900 dark:text-white">

            <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#1e2436] pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">Create Medication Schedule</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Select a drug from inventory and set its intake reminder schedule.</p>
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

            <form onSubmit={handleCreateIntakeSchedule} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Select Drug from Inventory</label>
                <select
                  value={selectedMedId}
                  onChange={(e) => setSelectedMedId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#1c2234] border border-slate-200 dark:border-[#262f46] rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                >
                  {medications.map((m) => (
                    <option key={m.med_id} value={m.med_id}>
                      {m.name} ({m.strength || m.dosage}) - Stock: {m.stock} {m.stock_unit || 'tablets'}
                    </option>
                  ))}
                </select>
              </div>

              {selectedMedObj && (
                <div className="bg-slate-50 dark:bg-[#1c2234] border border-slate-200 dark:border-[#262f46] p-3 rounded-xl text-xs flex items-center justify-between text-slate-600 dark:text-slate-400">
                  <span>Selected Strength: <strong className="text-slate-900 dark:text-white">{selectedMedObj.strength || selectedMedObj.dosage}</strong></span>
                  <span>Available Stock: <strong className="text-emerald-600 dark:text-emerald-400">{selectedMedObj.stock} {selectedMedObj.stock_unit || 'tablets'}</strong></span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Dose per Intake</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={dosePerIntake}
                    onChange={(e) => setDosePerIntake(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#1c2234] border border-slate-200 dark:border-[#262f46] rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Dose Unit</label>
                  <select
                    value={doseUnit}
                    onChange={(e) => setDoseUnit(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#1c2234] border border-slate-200 dark:border-[#262f46] rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="tablet">tablet</option>
                    <option value="capsule">capsule</option>
                    <option value="dose">dose</option>
                    <option value="ml">ml</option>
                    <option value="pill">pill</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Scheduled Time</label>
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    required
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    className="flex-1 bg-slate-50 dark:bg-[#1c2234] border border-slate-200 dark:border-[#262f46] rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                  />
                  <div className="flex gap-1">
                    {timePresets.map((tp) => (
                      <button
                        key={tp.value}
                        type="button"
                        onClick={() => setQuickTime(tp.value)}
                        className={`px-2 py-1.5 rounded-lg text-[10px] font-semibold transition-all ${
                          selectedTime === tp.value
                            ? 'bg-purple-600 text-white'
                            : 'bg-slate-100 text-slate-600 dark:bg-[#1c2234] dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        {tp.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Frequency</label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#1c2234] border border-slate-200 dark:border-[#262f46] rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="Every day">Every day</option>
                  <option value="Twice a day">Twice a day</option>
                  <option value="Every 8 hours">Every 8 hours</option>
                  <option value="As needed">As needed (PRN)</option>
                  <option value="Weekly">Weekly</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#1c2234] border border-slate-200 dark:border-[#262f46] rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">End Date (Optional)</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#1c2234] border border-slate-200 dark:border-[#262f46] rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Special Instructions (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Take with food or after breakfast"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
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
