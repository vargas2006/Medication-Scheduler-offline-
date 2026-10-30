import React, { useState, useEffect } from 'react';
import { Pill, Check, Calendar, Clock, Plus, X, AlertCircle, Trash2, ChevronLeft, ChevronRight, Search, Droplets, Repeat, Info, Package, Sun, Moon, CheckCircle2, ChevronDown } from 'lucide-react';
import { callApi } from '../utils/pywebview';
import { User, Schedule, Medication } from '../types';
import { formatTimeWithAmPm, sortSchedulesByDeadline, isScheduleTimeReached, isAmTime } from '../utils/timeFormat';
import { getMedicationImageUrl } from '../utils/imageHelper';

interface IntakeViewProps {
  user: User | null;
  onDataChange?: () => void;
  refreshKey?: number;
}

interface FormMessage {
  text: string;
  isError: boolean;
}

interface PendingDosePrompt {
  sch: Schedule;
  medName: string;
  timeStr: string;
}

function formatDateDisplay(dateStr?: string | null): { dateFormatted: string; dayName: string } {
  if (!dateStr) return { dateFormatted: 'Ongoing', dayName: 'Continuous schedule' };
  try {
    const d = new Date(dateStr + (dateStr.length === 10 ? 'T00:00:00' : ''));
    if (isNaN(d.getTime())) return { dateFormatted: dateStr, dayName: '' };
    return {
      dateFormatted: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      dayName: d.toLocaleDateString('en-US', { weekday: 'long' })
    };
  } catch {
    return { dateFormatted: dateStr, dayName: '' };
  }
}

export default function IntakeView({ user, onDataChange, refreshKey }: IntakeViewProps): React.JSX.Element {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Month navigation state matching reference image
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  // Create Schedule Modal state
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [selectedMedId, setSelectedMedId] = useState<string>('');
  const [isMedDropdownOpen, setIsMedDropdownOpen] = useState<boolean>(false);
  const [medSearchQuery, setMedSearchQuery] = useState<string>('');
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('08:00');
  const [frequency, setFrequency] = useState<string>('Daily');
  const [instructions, setInstructions] = useState<string>('');
  const [dosePerIntake, setDosePerIntake] = useState<string>('1');
  const [doseUnit, setDoseUnit] = useState<string>('tablet');
  const [formMsg, setFormMsg] = useState<FormMessage>({ text: '', isError: false });
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Pending delete schedule modal
  const [pendingDeleteSchedule, setPendingDeleteSchedule] = useState<Schedule | null>(null);

  // Pending early take dose confirmation modal
  const [pendingDosePrompt, setPendingDosePrompt] = useState<PendingDosePrompt | null>(null);

  // Date filtering state by month
  const [filterByMonth, setFilterByMonth] = useState<boolean>(true);

  const fetchSchedulesAndMeds = async () => {
    if (!user?.user_id) return;
    setLoading(true);
    try {
      const [schRes, medRes] = await Promise.all([
        callApi('get_schedules', user.user_id),
        callApi('get_medications', user.user_id)
      ]);

      if (schRes && schRes.success) {
        setSchedules(schRes.schedules || []);
      }
      if (medRes && medRes.success) {
        const meds = medRes.medications || [];
        setMedications(meds);
        if (meds.length > 0 && !selectedMedId) {
          setSelectedMedId(meds[0].med_id.toString());
        }
      }
    } catch (e) {
      console.error('Failed to fetch schedule data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedulesAndMeds();
  }, [user, refreshKey]);

  const executeTakeDose = async (sch: Schedule) => {
    if (!user?.user_id) return;
    try {
      const amt = (typeof sch.dose_per_intake === 'number' ? sch.dose_per_intake : parseInt(sch.dose_per_intake as any, 10)) || 1;
      const res = await callApi('take_dose', user.user_id, sch.med_id, amt);
      if (res && res.success) {
        const med = medications.find((m) => m.med_id === sch.med_id);
        const medName = sch.med_name || med?.name || 'Medication';
        const dosage = `${amt} ${sch.dose_unit || med?.stock_unit || 'tablet'}`;
        const remaining = med ? Math.max(0, med.stock - amt) : undefined;
        const imgSrc = getMedicationImageUrl(medName, sch.image_path || med?.image_path);

        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        window.dispatchEvent(
          new CustomEvent('dose-taken-success', {
            detail: {
              medName,
              dosage,
              timeTaken: formatTimeWithAmPm(timeStr),
              remainingStock: remaining,
              stockUnit: sch.dose_unit || med?.stock_unit || 'tablets',
              imageUrl: imgSrc
            }
          })
        );

        fetchSchedulesAndMeds();
        if (onDataChange) onDataChange();
      }
    } catch (e) {
      console.error('Error logging dose', e);
    }
  };

  const handleTakeDose = (sch: Schedule) => {
    const isTime = isScheduleTimeReached(sch.time_value, sch.schedule_date, sch.start_date);
    if (isTime) {
      // It's time or past due: take immediately
      executeTakeDose(sch);
    } else {
      // Not time yet: ask for confirmation
      const matchingMed = medications.find((m) => m.med_id === sch.med_id);
      setPendingDosePrompt({
        sch,
        medName: sch.med_name || matchingMed?.name || 'Medication',
        timeStr: formatTimeWithAmPm(sch.time_value),
      });
    }
  };

  const confirmTakeEarlyDose = () => {
    if (!pendingDosePrompt) return;
    const targetSch = pendingDosePrompt.sch;
    setPendingDosePrompt(null);
    executeTakeDose(targetSch);
  };

  const confirmDeleteSchedule = async () => {
    if (!pendingDeleteSchedule) return;
    const target = pendingDeleteSchedule;
    setPendingDeleteSchedule(null);
    try {
      const res = await callApi('delete_schedule', target.schedule_id);
      if (res && res.success) {
        fetchSchedulesAndMeds();
        if (onDataChange) onDataChange();
      }
    } catch (e) {
      console.error('Delete schedule error', e);
    }
  };

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.user_id) return;
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
        startDate,
        selectedTime,
        'SCHEDULED',
        parseInt(dosePerIntake, 10) || 1,
        doseUnit || 'tablet',
        frequency || 'Daily',
        startDate,
        endDate ? endDate : null,
        instructions || ''
      );

      if (res.success) {
        setFormMsg({ text: 'Schedule created successfully!', isError: false });
        fetchSchedulesAndMeds();
        if (onDataChange) onDataChange();
        setTimeout(() => {
          setShowCreateModal(false);
          setEndDate('');
          setInstructions('');
          setFormMsg({ text: '', isError: false });
        }, 800);
      } else {
        setFormMsg({ text: res.message || 'Failed to create schedule.', isError: true });
      }
    } catch (e) {
      setFormMsg({ text: 'Error saving schedule.', isError: true });
    } finally {
      setSubmitting(false);
    }
  };

  const monthYearLabel = currentDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });

  const prevMonth = () => {
    const next = new Date(currentDate);
    next.setMonth(next.getMonth() - 1);
    setCurrentDate(next);
  };

  const nextMonth = () => {
    const next = new Date(currentDate);
    next.setMonth(next.getMonth() + 1);
    setCurrentDate(next);
  };

  // Determine start & end of currently viewed month for date filtering
  const viewYear = currentDate.getFullYear();
  const viewMonth = currentDate.getMonth() + 1; // 1 to 12
  const monthStartStr = `${viewYear}-${String(viewMonth).padStart(2, '0')}-01`;
  const lastDayOfMonth = new Date(viewYear, viewMonth, 0).getDate();
  const monthEndStr = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`;

  const isCurrentMonthView = (() => {
    const now = new Date();
    return now.getFullYear() === viewYear && (now.getMonth() + 1) === viewMonth;
  })();

  // Filter schedules based on valid medication name, search term, date range, and sort by intake deadline
  const filteredSchedules = sortSchedulesByDeadline(
    schedules.filter((sch) => {
      const matchingMed = medications.find((m) => m.med_id === sch.med_id);
      const name = sch.med_name || matchingMed?.name;
      if (!name || !name.trim()) return false;

      // Auto-exclude expired schedules whose end_date has passed or finished today
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const schedEnd = (sch.end_date || '').trim();
      if (schedEnd && schedEnd < todayStr) return false;
      if (schedEnd && schedEnd === todayStr && sch.today_status === 'TAKEN') return false;

      // Date filtering by selected month (if filterByMonth is active)
      if (filterByMonth) {
        const schedStart = (sch.start_date || sch.schedule_date || '').trim();
        const schedEnd = (sch.end_date || '').trim();

        if (schedStart) {
          // If schedule starts after this month ends, exclude
          if (schedStart > monthEndStr) return false;
          // If schedule has an end date and ended before this month starts, exclude
          if (schedEnd && schedEnd < monthStartStr) return false;
        } else if (schedEnd) {
          if (schedEnd < monthStartStr) return false;
        }
      }

      // Search term filter
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        name.toLowerCase().includes(term) ||
        (sch.strength || sch.dosage || '').toLowerCase().includes(term) ||
        (sch.time_value || '').toLowerCase().includes(term) ||
        (sch.frequency || '').toLowerCase().includes(term) ||
        (sch.instructions || '').toLowerCase().includes(term) ||
        (sch.start_date || '').toLowerCase().includes(term) ||
        (sch.end_date || '').toLowerCase().includes(term)
      );
    })
  );

  const currentSelectedMed = medications.find((m) => m.med_id.toString() === selectedMedId) || (medications.length > 0 ? medications[0] : null);
  const filteredMedsForDropdown = medications.filter((m) => {
    if (!medSearchQuery.trim()) return true;
    const q = medSearchQuery.toLowerCase();
    return (
      (m.name || '').toLowerCase().includes(q) ||
      (m.dosage || m.strength || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-4 sm:p-6 lg:p-7 flex flex-col h-full overflow-hidden transition-colors duration-200">
      {/* 1. STICKY TOP BAR: Search Bar + Buttons (Always Fixed at Top, Never Scrolls) */}
      <div className="glass-surface shrink-0 pb-4 mb-4 border border-white/70 dark:border-white/10 rounded-2xl px-4 pt-4 bg-white/95 dark:bg-[#13222f]/95 z-10">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 flex-wrap">
          {/* Prominent Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8B9DA8]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search schedules by medication, time, dosage..."
              className="glass-control w-full pl-10 pr-4 py-2.5 bg-white/65 dark:bg-[#13222f]/75 border border-white/80 dark:border-white/10 rounded-xl text-xs text-[#1E2837] dark:text-white placeholder-[#8B9DA8] focus:outline-none focus:border-[#2E7D7E] dark:focus:border-[#2dd4bf] shadow-xs transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8B9DA8] hover:text-[#1E2837] dark:hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Month Selector & Controls */}
          <div className="flex items-center gap-2.5 self-end sm:self-auto flex-wrap">
            {/* Toggle Button: Month Filter vs All */}
            <button
              type="button"
              onClick={() => setFilterByMonth(!filterByMonth)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                filterByMonth
                  ? 'glass-control bg-teal-50/80 dark:bg-[#183641]/85 text-[#2E7D7E] dark:text-[#2dd4bf] border-[#2E7D7E]/30 dark:border-[#2dd4bf]/30 shadow-2xs'
                  : 'glass-control bg-white/65 dark:bg-[#13222f]/75 text-[#64748B] dark:text-[#94A3B8] border-white/80 dark:border-white/10'
              }`}
              title="Toggle date filter by month"
            >
              {filterByMonth ? 'Month Filter: ON' : 'Show All'}
            </button>

            {/* Month Navigation Pill */}
            {filterByMonth && (
              <div className="glass-control flex items-center gap-1 px-2.5 py-1.5 bg-white/65 dark:bg-[#13222f]/75 border border-white/80 dark:border-white/10 rounded-xl text-xs font-semibold text-[#1E2837] dark:text-white shadow-xs">
                <button
                  type="button"
                  onClick={prevMonth}
                  className="p-1 hover:text-[#2E7D7E] dark:hover:text-[#2dd4bf] transition-colors"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="min-w-[110px] text-center select-none font-bold">{monthYearLabel}</span>
                <button
                  type="button"
                  onClick={nextMonth}
                  className="p-1 hover:text-[#2E7D7E] dark:hover:text-[#2dd4bf] transition-colors"
                  title="Next Month"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                {!isCurrentMonthView && (
                  <button
                    type="button"
                    onClick={() => setCurrentDate(new Date())}
                    className="ml-1 px-2 py-0.5 rounded-lg bg-teal-50 dark:bg-[#183641] text-[#2E7D7E] dark:text-[#2dd4bf] text-[10px] font-bold hover:underline"
                    title="Jump to current month"
                  >
                    Today
                  </button>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setFormMsg({ text: '', isError: false });
                setShowCreateModal(true);
              }}
              className="glass-control py-2.5 px-4 bg-[#2E7D7E]/90 hover:bg-[#26696a]/90 text-white font-semibold text-xs rounded-xl shadow-sm transition-all flex items-center gap-2 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Create Schedule</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. MAIN LAYOUT: Left Column Scrolls ONLY, Right Picture Panel is FIXED */}
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 gap-5 items-start overflow-hidden">
        {/* LEFT COLUMN: Scrollable Schedule Objects List */}
        <div className="md:col-span-7 xl:col-span-7 2xl:col-span-8 h-full overflow-y-auto custom-scrollbar pr-1.5 space-y-3.5">
          {filteredSchedules.length === 0 ? (
            <div className="py-12 text-center text-[#8B9DA8] dark:text-[#859ba8] bg-white dark:bg-[#13222f] border border-[#E3E8EE] dark:border-[#1c3345] rounded-2xl p-8 space-y-2">
              <Calendar className="w-8 h-8 mx-auto text-[#2E7D7E]/50 mb-2" />
              <p className="text-xs font-semibold text-[#1E2837] dark:text-white">
                {searchTerm ? 'No matching schedules found' : `No schedules scheduled for ${monthYearLabel}`}
              </p>
              <p className="text-xs text-[#8B9DA8]">
                {searchTerm ? 'Try a different search query.' : 'Use the arrows above to browse other months or click Create Schedule.'}
              </p>
              {!isCurrentMonthView && (
                <button
                  type="button"
                  onClick={() => setCurrentDate(new Date())}
                  className="mt-2 px-3 py-1.5 text-xs font-semibold text-[#2E7D7E] dark:text-[#2dd4bf] border border-[#2E7D7E]/30 dark:border-[#2dd4bf]/30 rounded-xl hover:bg-[#2E7D7E]/10 transition-all inline-flex items-center gap-1.5"
                >
                  <span>Jump to Current Month</span>
                </button>
              )}
            </div>
          ) : (
            filteredSchedules.map((sch) => {
              const startInfo = formatDateDisplay(sch.start_date || sch.schedule_date);
              const endInfo = formatDateDisplay(sch.end_date);
              const matchingMed = medications.find((m) => m.med_id === sch.med_id);
              const stockRemaining = sch.stock ?? matchingMed?.stock ?? 0;
              const stockUnit = sch.stock_unit || matchingMed?.stock_unit || 'tablets';

              const imgSrc = getMedicationImageUrl(sch.med_name || matchingMed?.name, sch.image_path || matchingMed?.image_path);
              const isAm = isAmTime(sch.time_value);

              return (
                <div
                  key={sch.schedule_id}
                  className="glass-surface rounded-2xl border border-white/80 dark:border-white/10 bg-white/75 dark:bg-[#13222f]/75 p-4 sm:p-5 hover:shadow-md transition-all flex flex-col lg:flex-row items-stretch justify-between gap-4 relative overflow-hidden group"
                >
                  {/* Subtle medical cross & DNA helix watermark matching reference */}
                  <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center opacity-40">
                    <svg
                      className="w-56 h-28 text-[#507d9d]/15 dark:text-[#6597be]/10 select-none"
                      viewBox="0 0 200 100"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <path d="M70,25 h20 v20 h20 v20 h-20 v20 h-20 v-20 h-20 v-20 h20 z" />
                      <path d="M125,20 Q145,50 165,20 T205,20" strokeDasharray="3 3" />
                      <path d="M125,80 Q145,50 165,80 T205,80" strokeDasharray="3 3" />
                      <line x1="135" y1="35" x2="135" y2="65" />
                      <line x1="155" y1="35" x2="155" y2="65" />
                      <line x1="175" y1="35" x2="175" y2="65" />
                      <line x1="195" y1="35" x2="195" y2="65" />
                    </svg>
                  </div>

                  {/* Left Side: Start Date Panel (With Separator Line) */}
                  <div className="w-full lg:w-32 xl:w-36 shrink-0 flex flex-col justify-center pb-2 lg:pb-0 border-b lg:border-b-0 lg:border-r border-[#a8b8c4]/60 dark:border-[#2a3f52] pr-0 lg:pr-3 relative z-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#47677d] dark:text-[#7ba1bd] block mb-0.5">
                      Start Date
                    </span>
                    <h3 className="text-xs sm:text-sm font-bold text-[#1E2837] dark:text-white leading-tight">
                      {startInfo.dateFormatted}
                    </h3>
                    <p className="text-[11px] text-[#5a7487] dark:text-[#8ba3b5] mt-0.5">
                      {startInfo.dayName}
                    </p>
                  </div>

                  {/* Middle: Expanded Medication Details (NO green highlights on picture) */}
                  <div className="flex-1 min-w-0 px-0 lg:px-2 flex flex-col justify-between space-y-2.5 relative z-1">
                    {/* Header Row: Drug Name, Dosage & Scheduled Time */}
                    <div className="flex items-start justify-between gap-2.5 flex-wrap">
                      <div className="flex items-center gap-2.5">
                        {/* Clean Neutral Picture Container - Absolutely NO green highlight */}
                        <div className="w-10 h-10 min-w-[40px] min-h-[40px] max-w-[40px] max-h-[40px] aspect-square rounded-xl overflow-hidden border border-[#94a9b8]/50 dark:border-[#2e4354] shrink-0 shadow-xs bg-white/70 dark:bg-[#172838] flex items-center justify-center">
                          <img
                            src={imgSrc}
                            alt={sch.med_name}
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = '/drug_images/paracetamol.jpg';
                            }}
                            className="w-full h-full object-cover rounded-xl"
                            style={{ width: '40px', height: '40px' }}
                          />
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-xs sm:text-sm font-bold text-[#1E2837] dark:text-white">
                              {sch.med_name}
                            </h4>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-white/60 dark:bg-white/10 text-[#245878] dark:text-[#9bc2db] border border-[#a8b8c4]/60 dark:border-[#385166]">
                              {sch.strength || sch.dosage || 'Standard'}
                            </span>
                            {sch.today_status === 'MISSED' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-[10px] font-bold shadow-2xs whitespace-nowrap">
                                <AlertCircle className="w-3 h-3 text-rose-500 shrink-0" />
                                <span>Missed</span>
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-[#6b8293] dark:text-[#8ea5b6] font-medium block mt-0.5">
                            Prescription ID #{sch.med_id}
                          </span>
                        </div>
                      </div>

                      {/* Scheduled Time Pill: ALWAYS in the EXACT SAME POSITION across all cards! */}
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/70 dark:bg-[#172838] border border-[#a8b8c4]/70 dark:border-[#2a3f52] text-xs font-semibold text-[#1E2837] dark:text-white shadow-xs whitespace-nowrap shrink-0">
                        {isAm ? (
                          <Sun className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        ) : (
                          <Moon className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 shrink-0" />
                        )}
                        <span>{formatTimeWithAmPm(sch.time_value)}</span>
                      </div>
                    </div>

                    {/* Spec Chips */}
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap pt-0.5">
                      <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/60 dark:bg-white/5 border border-[#a8b8c4]/50 dark:border-[#385166] text-[10px] font-medium text-[#1E2837] dark:text-slate-200">
                        <Pill className="w-3 h-3 text-[#245878] -rotate-45" />
                        <span>Take: <strong className="font-semibold">{sch.dose_per_intake || 1} {sch.dose_unit || 'tablet'}</strong></span>
                      </div>

                      <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/60 dark:bg-white/5 border border-[#a8b8c4]/50 dark:border-[#385166] text-[10px] font-medium text-[#1E2837] dark:text-slate-200">
                        <Repeat className="w-3 h-3 text-[#245878]" />
                        <span>Repeat: <strong className="font-semibold">{sch.frequency || 'Daily'}</strong></span>
                      </div>

                      <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/60 dark:bg-white/5 border border-[#a8b8c4]/50 dark:border-[#385166] text-[10px] font-medium text-[#1E2837] dark:text-slate-200">
                        <Package className="w-3 h-3 text-[#245878]" />
                        <span>Stock: <strong className="font-semibold">{stockRemaining} {stockUnit}</strong></span>
                      </div>
                    </div>

                    {/* Clinical Instructions / Notes */}
                    {sch.instructions && (
                      <div className="p-1.5 rounded-xl bg-white/40 dark:bg-white/5 border border-[#a8b8c4]/40 dark:border-[#385166] flex items-start gap-1.5 text-[11px] text-[#245878] dark:text-[#2dd4bf]">
                        <Info className="w-3 h-3 shrink-0 mt-0.5" />
                        <span className="leading-snug truncate">
                          <strong>Note:</strong> {sch.instructions}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Right Side: End Date & Actions Panel (With Separator Line) */}
                  <div className="w-full lg:w-32 xl:w-36 shrink-0 flex flex-col justify-between pt-2 lg:pt-0 border-t lg:border-t-0 lg:border-l border-[#a8b8c4]/60 dark:border-[#2a3f52] pl-0 lg:pl-3 relative z-1">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#688295] dark:text-[#8ba3b5] block mb-0.5 text-left lg:text-right">
                        End Date
                      </span>
                      <h3 className="text-xs sm:text-sm font-bold text-[#1E2837] dark:text-white leading-tight text-left lg:text-right">
                        {endInfo.dateFormatted}
                      </h3>
                      <p className="text-[11px] text-[#688295] dark:text-[#8ba3b5] mt-0.5 text-left lg:text-right">
                        {endInfo.dayName}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end gap-1.5 pt-2">
                      {sch.today_status === 'TAKEN' ? (
                        <div className="px-2.5 py-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold shadow-xs flex items-center gap-1 whitespace-nowrap">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>Taken</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleTakeDose(sch)}
                          className="px-2.5 py-1.5 rounded-xl bg-[#2E7D7E] hover:bg-[#26696a] text-white text-xs font-semibold shadow-xs flex items-center gap-1 transition-all whitespace-nowrap"
                          title={sch.today_status === 'MISSED' ? "Take Missed Dose" : "Mark as Taken"}
                        >
                          <Check className="w-3 h-3 stroke-[2.5]" />
                          <span>{sch.today_status === 'MISSED' ? 'Take Late' : 'Take Dose'}</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setPendingDeleteSchedule(sch)}
                        title="Delete Schedule"
                        className="p-1 text-[#688295] hover:text-rose-500 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* RIGHT COLUMN: FIXED PICTURE & GUIDELINES (Responsive Desktop Panel, Non-Scrollable) */}
        <div className="md:col-span-5 xl:col-span-5 2xl:col-span-4 flex flex-col gap-3 h-full overflow-hidden">
          {/* Card 1: Medical Visual & Better Health Quote Card (Non-Scrollable, Auto-Fit) */}
          <div className="glass-surface bg-white/80 dark:bg-[#13222f]/85 border border-white/80 dark:border-white/10 rounded-2xl p-3 sm:p-3.5 xl:p-4 2xl:p-5 shadow-sm flex flex-col items-center text-center gap-3 overflow-hidden flex-1 min-h-0">
            <div className="w-full flex-1 min-h-[170px] sm:min-h-[200px] xl:min-h-[260px] 2xl:min-h-[340px] rounded-2xl overflow-hidden relative shadow-sm">
              <img
                src="/assets/side_card_art.jpg"
                alt="Medication scheduler photography"
                className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent flex items-end p-3 xl:p-4">
                <span className="text-white text-[11px] xl:text-xs 2xl:text-sm font-semibold drop-shadow-md">
                  Prescription Care & Routine
                </span>
              </div>
            </div>

            <div className="shrink-0 space-y-1">
              <h3 className="text-xs xl:text-sm 2xl:text-base font-bold text-[#1E2837] dark:text-white font-serif italic text-[#2E7D7E] dark:text-[#2dd4bf]">
                Better Health, Brighter Future ♡
              </h3>
              <p className="text-[11px] xl:text-xs 2xl:text-sm text-[#8B9DA8] dark:text-[#859ba8] leading-relaxed">
                Taking your doses at the same time each day builds a strong therapeutic routine.
              </p>
            </div>
          </div>

          {/* Card 2: Hydration & Medication Tip Card (Non-Scrollable Guidelines) */}
          <div className="glass-surface bg-white/75 dark:bg-[#13222f]/75 border border-white/80 dark:border-white/10 rounded-2xl p-3 sm:p-3.5 xl:p-4 2xl:p-5 space-y-2 xl:space-y-3 shrink-0">
            <div className="flex items-center gap-2 pb-1.5 xl:pb-2 border-b border-[#E3E8EE] dark:border-[#1c3345]">
              <div className="w-6 h-6 xl:w-7 xl:h-7 rounded-lg bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                <Droplets className="w-3.5 h-3.5 xl:w-4 xl:h-4" />
              </div>
              <h4 className="text-xs xl:text-sm font-bold text-[#1E2837] dark:text-white">
                Intake Guidelines
              </h4>
            </div>

            <ul className="text-[11px] xl:text-xs 2xl:text-sm text-[#64748B] dark:text-[#859ba8] space-y-1.5 xl:space-y-2 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2E7D7E] dark:bg-[#2dd4bf] mt-1.5 shrink-0" />
                <span>Drink a full glass of water with each scheduled dose.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2E7D7E] dark:bg-[#2dd4bf] mt-1.5 shrink-0" />
                <span>Never take double doses to make up for a missed intake.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2E7D7E] dark:bg-[#2dd4bf] mt-1.5 shrink-0" />
                <span>Check stock levels frequently to request refills in advance.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* CREATE SCHEDULE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-[780px] lg:max-w-[880px] xl:max-w-[960px] my-auto max-h-[92vh] bg-white dark:bg-[#13222f] border border-[#E3E8EE] dark:border-[#1c3345] rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-12 animate-fadeIn">
            {/* Form Side (7 cols) */}
            <form onSubmit={handleCreateSchedule} className="md:col-span-7 p-6 sm:p-8 flex flex-col justify-between space-y-4 max-h-[92vh] overflow-y-auto custom-scrollbar">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-[#E3E8EE] dark:border-[#1c3345] mb-4">
                  <h3 className="text-base font-bold text-[#1E2837] dark:text-white">
                    Create Schedule
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="p-1 rounded-lg text-[#8B9DA8] hover:text-[#1E2837]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {formMsg.text && (
                  <div className={`p-2.5 rounded-xl mb-3 text-xs flex items-center gap-2 ${formMsg.isError ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
                    {formMsg.isError ? <AlertCircle className="w-4 h-4 shrink-0" /> : <Check className="w-4 h-4 shrink-0" />}
                    <span>{formMsg.text}</span>
                  </div>
                )}

                <div className="space-y-3.5">
                  <div className="relative">
                    <label className="block text-[11px] font-semibold text-[#64748B] dark:text-[#859ba8] mb-1">
                      Medication *
                    </label>

                    {/* Visual Selector Button with Medication Picture */}
                    <button
                      type="button"
                      onClick={() => setIsMedDropdownOpen(!isMedDropdownOpen)}
                      className="w-full px-3 py-2 bg-[#F3F6F9] dark:bg-[#172838] border border-[#E3E8EE] dark:border-[#1c3345] hover:border-[#2E7D7E] dark:hover:border-[#2dd4bf] rounded-xl text-left flex items-center justify-between gap-2.5 transition-all shadow-2xs group cursor-pointer"
                    >
                      {currentSelectedMed ? (
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          {/* Selected Drug Thumbnail Picture */}
                          <div className="w-9 h-9 min-w-[36px] min-h-[36px] max-w-[36px] max-h-[36px] aspect-square rounded-xl overflow-hidden border border-[#bccddc] dark:border-[#2e4354] shrink-0 bg-white dark:bg-[#112338] p-0.5 flex items-center justify-center shadow-xs">
                            <img
                              src={getMedicationImageUrl(currentSelectedMed.name, currentSelectedMed.image_path)}
                              alt={currentSelectedMed.name}
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src = '/drug_images/paracetamol.jpg';
                              }}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-bold text-[#1E2837] dark:text-white truncate">
                                {currentSelectedMed.name}
                              </span>
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-teal-50 dark:bg-teal-500/15 text-[#2E7D7E] dark:text-[#2dd4bf] border border-teal-200 dark:border-teal-500/30 shrink-0">
                                {currentSelectedMed.dosage || currentSelectedMed.strength || 'Standard'}
                              </span>
                            </div>
                            <span className="text-[10px] text-[#7890a2] dark:text-[#8da5b6] block truncate">
                              Stock: {currentSelectedMed.stock} {currentSelectedMed.stock_unit || 'tablets'}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-[#8B9DA8]">Select a medication...</span>
                      )}

                      <ChevronDown className={`w-4 h-4 text-[#8B9DA8] transition-transform duration-200 shrink-0 ${isMedDropdownOpen ? 'rotate-180 text-[#2E7D7E]' : ''}`} />
                    </button>

                    {/* Dropdown Menu Showing Picture for Every Medication */}
                    {isMedDropdownOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => {
                            setIsMedDropdownOpen(false);
                            setMedSearchQuery('');
                          }}
                        />

                        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white dark:bg-[#13222f] border border-[#c5d5e2] dark:border-[#2b4154] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-64 animate-fadeIn">
                          {medications.length > 4 && (
                            <div className="p-2 border-b border-[#E3E8EE] dark:border-[#1c3345] bg-[#F8FAFC] dark:bg-[#172838]">
                              <div className="relative flex items-center">
                                <Search className="w-3.5 h-3.5 text-[#8B9DA8] absolute left-2.5 pointer-events-none" />
                                <input
                                  type="text"
                                  placeholder="Search medication..."
                                  value={medSearchQuery}
                                  onChange={(e) => setMedSearchQuery(e.target.value)}
                                  className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-[#112338] border border-[#d2dfeb] dark:border-[#2a3f52] rounded-lg text-xs text-[#1E2837] dark:text-white placeholder-[#8B9DA8] focus:outline-none focus:border-[#2E7D7E]"
                                  autoFocus
                                />
                              </div>
                            </div>
                          )}

                          <div className="overflow-y-auto max-h-52 p-1.5 space-y-1 custom-scrollbar">
                            {filteredMedsForDropdown.length === 0 ? (
                              <div className="py-4 text-center text-xs text-[#8B9DA8]">
                                No medication found.
                              </div>
                            ) : (
                              filteredMedsForDropdown.map((m) => {
                                const isSelected = m.med_id.toString() === selectedMedId;
                                const img = getMedicationImageUrl(m.name, m.image_path);

                                return (
                                  <button
                                    key={m.med_id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedMedId(m.med_id.toString());
                                      setIsMedDropdownOpen(false);
                                      setMedSearchQuery('');
                                      if (m.stock_unit && (!doseUnit || doseUnit === 'tablet')) {
                                        setDoseUnit(m.stock_unit.replace(/s$/, ''));
                                      }
                                    }}
                                    className={`w-full px-2.5 py-2 rounded-xl text-left flex items-center justify-between gap-2.5 transition-all cursor-pointer ${
                                      isSelected
                                        ? 'bg-[#EBF5F5] dark:bg-[#153a42] border border-[#2E7D7E]/40 text-[#2E7D7E] dark:text-[#2dd4bf]'
                                        : 'hover:bg-[#F3F6F9] dark:hover:bg-[#172838] text-[#1E2837] dark:text-white'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                      {/* Drug Picture Squircle */}
                                      <div className="w-9 h-9 min-w-[36px] min-h-[36px] max-w-[36px] max-h-[36px] aspect-square rounded-xl overflow-hidden border border-[#c0d2e0] dark:border-[#2e4354] shrink-0 bg-white dark:bg-[#112338] p-0.5 flex items-center justify-center shadow-2xs">
                                        <img
                                          src={img}
                                          alt={m.name}
                                          onError={(e) => {
                                            (e.currentTarget as HTMLImageElement).src = '/drug_images/paracetamol.jpg';
                                          }}
                                          className="w-full h-full object-cover rounded-lg"
                                        />
                                      </div>

                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-xs font-bold truncate">
                                            {m.name}
                                          </span>
                                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-white/80 dark:bg-white/10 text-[#245878] dark:text-[#9bc2db] border border-[#bcd6ed] dark:border-[#2c5375] shrink-0">
                                            {m.dosage || m.strength || 'Standard'}
                                          </span>
                                        </div>
                                        <span className="text-[10px] text-[#7890a2] dark:text-[#8da5b6] block truncate">
                                          Stock: {m.stock} {m.stock_unit || 'tablets'}
                                        </span>
                                      </div>
                                    </div>

                                    {isSelected && (
                                      <Check className="w-4 h-4 text-[#2E7D7E] dark:text-[#2dd4bf] shrink-0" />
                                    )}
                                  </button>
                                );
                              })
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Start Date on Left, End Date on Right */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#64748B] dark:text-[#859ba8] mb-1">
                        Start Date *
                      </label>
                      <input
                        type="date"
                        required
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full px-3.5 py-2 bg-[#F3F6F9] dark:bg-[#172838] border border-[#E3E8EE] dark:border-[#1c3345] rounded-xl text-xs text-[#1E2837] dark:text-white focus:outline-none focus:border-[#2E7D7E]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-[#64748B] dark:text-[#859ba8] mb-1">
                        End Date (optional)
                      </label>
                      <input
                        type="date"
                        value={endDate}
                        min={startDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full px-3.5 py-2 bg-[#F3F6F9] dark:bg-[#172838] border border-[#E3E8EE] dark:border-[#1c3345] rounded-xl text-xs text-[#1E2837] dark:text-white focus:outline-none focus:border-[#2E7D7E]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-semibold text-[#64748B] dark:text-[#859ba8]">
                          Select Time *
                        </label>
                        <span className="text-[10px] font-bold text-[#2E7D7E] dark:text-[#2dd4bf] bg-teal-50 dark:bg-teal-500/15 px-1.5 py-0.5 rounded border border-teal-200 dark:border-teal-500/30">
                          {formatTimeWithAmPm(selectedTime)}
                        </span>
                      </div>
                      <input
                        type="time"
                        required
                        value={selectedTime}
                        onChange={(e) => setSelectedTime(e.target.value)}
                        className="w-full px-3.5 py-2 bg-[#F3F6F9] dark:bg-[#172838] border border-[#E3E8EE] dark:border-[#1c3345] rounded-xl text-xs text-[#1E2837] dark:text-white focus:outline-none focus:border-[#2E7D7E]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-[#64748B] dark:text-[#859ba8] mb-1">
                        Repeat *
                      </label>
                      <select
                        value={frequency}
                        onChange={(e) => setFrequency(e.target.value)}
                        className="w-full px-3.5 py-2 bg-[#F3F6F9] dark:bg-[#172838] border border-[#E3E8EE] dark:border-[#1c3345] rounded-xl text-xs text-[#1E2837] dark:text-white focus:outline-none focus:border-[#2E7D7E]"
                      >
                        <option value="Daily">Daily</option>
                        <option value="Every 8 Hours">Every 8 Hours</option>
                        <option value="Every 12 Hours">Every 12 Hours</option>
                        <option value="Weekly">Weekly</option>
                        <option value="As Needed">As Needed</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#64748B] dark:text-[#859ba8] mb-1">
                        Dose per Intake
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={dosePerIntake}
                        onChange={(e) => setDosePerIntake(e.target.value)}
                        className="w-full px-3.5 py-2 bg-[#F3F6F9] dark:bg-[#172838] border border-[#E3E8EE] dark:border-[#1c3345] rounded-xl text-xs text-[#1E2837] dark:text-white focus:outline-none focus:border-[#2E7D7E]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-[#64748B] dark:text-[#859ba8] mb-1">
                        Unit
                      </label>
                      <input
                        type="text"
                        value={doseUnit}
                        onChange={(e) => setDoseUnit(e.target.value)}
                        placeholder="tablet / capsule"
                        className="w-full px-3.5 py-2 bg-[#F3F6F9] dark:bg-[#172838] border border-[#E3E8EE] dark:border-[#1c3345] rounded-xl text-xs text-[#1E2837] dark:text-white focus:outline-none focus:border-[#2E7D7E]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#64748B] dark:text-[#859ba8] mb-1">
                      Notes (optional)
                    </label>
                    <input
                      type="text"
                      value={instructions}
                      onChange={(e) => setInstructions(e.target.value)}
                      placeholder="e.g. Take with food"
                      className="w-full px-3.5 py-2 bg-[#F3F6F9] dark:bg-[#172838] border border-[#E3E8EE] dark:border-[#1c3345] rounded-xl text-xs text-[#1E2837] dark:text-white placeholder-[#8B9DA8] focus:outline-none focus:border-[#2E7D7E]"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E3E8EE] dark:border-[#1c3345]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#64748B] hover:bg-[#F3F6F9]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#2E7D7E] hover:bg-[#26696a] text-white shadow-sm"
                >
                  {submitting ? 'Saving...' : 'Save Schedule'}
                </button>
              </div>
            </form>

            {/* Medication Preview Card Side (5 cols) */}
            <div className="hidden md:flex md:col-span-5 relative min-h-[380px] lg:min-h-[460px] bg-gradient-to-br from-[#E2F0EF] via-[#e8f3f2] to-[#D5EAE9] dark:from-[#112733] dark:via-[#132d3b] dark:to-[#0a1822] overflow-hidden flex-col justify-between p-6 border-l border-[#E3E8EE] dark:border-[#1c3345]">
              {/* Subtle cross / helix watermark */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center opacity-25 select-none">
                <svg className="w-64 h-32 text-[#2E7D7E]/20 dark:text-[#2dd4bf]/15" viewBox="0 0 240 100" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M100,20 h25 v25 h25 v25 h-25 v25 h-25 v-25 h-25 v-25 h25 z" />
                </svg>
              </div>

              {/* Top Header */}
              <div className="relative z-1 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#2E7D7E] dark:text-[#2dd4bf] bg-white/80 dark:bg-[#172838] px-2.5 py-1 rounded-full border border-teal-200 dark:border-teal-500/30 shadow-2xs">
                  Medication Preview
                </span>
                <span className="text-xs text-[#2E7D7E] dark:text-[#2dd4bf] italic font-serif">
                  Care & Routine ♡
                </span>
              </div>

              {/* Center: Large High-Res Picture & Details */}
              {currentSelectedMed ? (
                <div className="relative z-1 flex flex-col items-center text-center my-auto py-2">
                  <div className="w-28 h-28 lg:w-32 lg:h-32 rounded-3xl overflow-hidden border-2 border-white dark:border-[#2e4354] shadow-xl bg-white dark:bg-[#172838] p-1.5 mb-3 group hover:scale-105 transition-transform duration-300">
                    <img
                      src={getMedicationImageUrl(currentSelectedMed.name, currentSelectedMed.image_path)}
                      alt={currentSelectedMed.name}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = '/drug_images/paracetamol.jpg';
                      }}
                      className="w-full h-full object-cover rounded-2xl"
                    />
                  </div>

                  <h4 className="text-base lg:text-lg font-black text-[#112338] dark:text-white tracking-tight">
                    {currentSelectedMed.name}
                  </h4>
                  <div className="flex items-center gap-1.5 mt-1 justify-center flex-wrap">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/90 dark:bg-white/10 text-[#1b6194] dark:text-[#88bfe8] border border-[#bcd6ed] dark:border-[#2c5375] shadow-2xs">
                      {currentSelectedMed.dosage || currentSelectedMed.strength || 'Standard'}
                    </span>
                    <span className="text-[11px] font-semibold text-[#5e788e] dark:text-[#8da5b6]">
                      #{currentSelectedMed.med_id}
                    </span>
                  </div>

                  {/* Quick specs pills */}
                  <div className="mt-4 flex flex-col gap-1.5 w-full max-w-[220px]">
                    <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-white/80 dark:bg-[#172838]/80 border border-teal-100 dark:border-teal-500/20 text-xs shadow-2xs">
                      <span className="text-[#64748B] dark:text-[#859ba8] font-medium">Scheduled Time:</span>
                      <strong className="text-[#1E2837] dark:text-white">{formatTimeWithAmPm(selectedTime)}</strong>
                    </div>
                    <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-white/80 dark:bg-[#172838]/80 border border-teal-100 dark:border-teal-500/20 text-xs shadow-2xs">
                      <span className="text-[#64748B] dark:text-[#859ba8] font-medium">Available Stock:</span>
                      <strong className="text-[#2E7D7E] dark:text-[#2dd4bf]">{currentSelectedMed.stock} {currentSelectedMed.stock_unit || 'tablets'}</strong>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative z-1 flex flex-col items-center justify-center my-auto text-center text-[#8B9DA8]">
                  <Pill className="w-12 h-12 text-[#2E7D7E]/40 mb-2" />
                  <p className="text-xs font-medium">Select a medication to view preview.</p>
                </div>
              )}

              {/* Bottom footer text */}
              <div className="relative z-1 text-center pt-2 border-t border-[#2E7D7E]/10 dark:border-teal-500/10">
                <p className="text-[11px] text-[#64748B] dark:text-[#8ba3b5]">
                  Your health matters. Keep taking your doses on time.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Schedule Confirmation */}
      {pendingDeleteSchedule && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white dark:bg-[#13222f] border border-[#E3E8EE] dark:border-[#1c3345] rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-sm text-[#1E2837] dark:text-white">Delete Schedule?</h3>
            <p className="text-xs text-[#8B9DA8]">
              Remove schedule for <span className="font-bold text-[#1E2837] dark:text-white">{pendingDeleteSchedule.med_name}</span> at <strong className="text-[#1E2837] dark:text-white">{formatTimeWithAmPm(pendingDeleteSchedule.time_value)}</strong>?
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPendingDeleteSchedule(null)}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold text-[#64748B]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteSchedule}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Early Dose Confirmation Modal */}
      {pendingDosePrompt && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm sm:max-w-md bg-white dark:bg-[#13222f] border border-[#E3E8EE] dark:border-[#1c3345] rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-sm text-[#1E2837] dark:text-white">
                  Not Scheduled Time Yet
                </h3>
                <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-1 leading-relaxed">
                  Are you sure you want to take <span className="font-bold text-[#1E2837] dark:text-white">{pendingDosePrompt.medName}</span>? It's not time yet.
                </p>
              </div>
            </div>

            <div className="p-3 bg-[#F8FAFC] dark:bg-[#172838] border border-[#E2E8F0] dark:border-[#1F364B] rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-[#475569] dark:text-[#94A3B8]">
                <Clock className="w-3.5 h-3.5 text-[#2E7D7E] dark:text-[#2dd4bf]" />
                <span>Scheduled Time:</span>
              </div>
              <span className="font-bold text-[#1E2837] dark:text-white bg-white dark:bg-[#1E3347] px-2.5 py-0.5 rounded-lg border border-[#CBD5E1] dark:border-[#2A455C]">
                {pendingDosePrompt.timeStr}
              </span>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#E3E8EE] dark:border-[#1c3345]">
              <button
                type="button"
                onClick={() => setPendingDosePrompt(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#64748B] hover:bg-[#F1F5F9] dark:hover:bg-[#1A2D3E] transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmTakeEarlyDose}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#2E7D7E] hover:bg-[#26696a] text-white shadow-sm transition-all flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Yes, Take Now</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
