'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Calendar, X, SlidersHorizontal } from 'lucide-react';
import { useState, useEffect } from 'react';

const DateRangeFilter = () => {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  const [startDate, setStartDate]     = useState(searchParams.get('startDate') || '');
  const [endDate, setEndDate]         = useState(searchParams.get('endDate')   || '');
  const [selectedMonth, setSelectedMonth] = useState(searchParams.get('month') || '');
  const [sheetOpen, setSheetOpen]     = useState(false);

  const [filterMonth, setFilterMonth] = useState(() => {
    const m = searchParams.get('month');
    return m ? m.split('-')[1] : '';
  });
  const [filterYear, setFilterYear] = useState(() => {
    const m = searchParams.get('month');
    return m ? m.split('-')[0] : new Date().getFullYear().toString();
  });

  const months = [
    { value: '01', label: 'January' },  { value: '02', label: 'February' },
    { value: '03', label: 'March' },    { value: '04', label: 'April' },
    { value: '05', label: 'May' },      { value: '06', label: 'June' },
    { value: '07', label: 'July' },     { value: '08', label: 'August' },
    { value: '09', label: 'September' },{ value: '10', label: 'October' },
    { value: '11', label: 'November' }, { value: '12', label: 'December' },
  ];

  const years = (() => {
    const cur = new Date().getFullYear();
    const arr = [];
    for (let i = cur - 5; i <= cur + 2; i++) arr.push(i.toString());
    return arr;
  })();

  const syncMonth = (month: string, year: string) =>
    setSelectedMonth(month && year ? `${year}-${month}` : '');

  const handleMonthChange = (month: string) => {
    setFilterMonth(month);
    syncMonth(month, filterYear);
    if (month) { setStartDate(''); setEndDate(''); }
  };

  const handleYearChange = (year: string) => {
    setFilterYear(year);
    syncMonth(filterMonth, year);
    if (year && filterMonth) { setStartDate(''); setEndDate(''); }
  };

  useEffect(() => {
    if (startDate || endDate) setSelectedMonth('');
  }, [startDate, endDate]);

  // Lock body scroll when sheet is open
  useEffect(() => {
    if (sheetOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [sheetOpen]);

  const handleApply = () => {
    const params = new URLSearchParams(searchParams);
    params.set('page', '1');
    startDate     ? params.set('startDate', startDate) : params.delete('startDate');
    endDate       ? params.set('endDate',   endDate)   : params.delete('endDate');
    selectedMonth ? params.set('month', selectedMonth) : params.delete('month');
    replace(`${pathname}?${params.toString()}`);
    setSheetOpen(false);
  };

  const handleClear = () => {
    setStartDate(''); setEndDate(''); setSelectedMonth('');
    setFilterMonth(''); setFilterYear(new Date().getFullYear().toString());
    const params = new URLSearchParams(searchParams);
    params.delete('startDate'); params.delete('endDate'); params.delete('month');
    params.set('page', '1');
    replace(`${pathname}?${params.toString()}`);
    setSheetOpen(false);
  };

  const hasFilter = !!(startDate || endDate || selectedMonth);

  const filterLabel = selectedMonth
    ? `${months.find(m => m.value === filterMonth)?.label?.slice(0, 3) ?? ''} ${filterYear}`
    : startDate || endDate
    ? 'Date range'
    : null;

  return (
    <>
      {/* ── MOBILE TRIGGER BUTTON ──────────────────────────── */}
      <button
        onClick={() => setSheetOpen(true)}
        className={`lg:hidden inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold transition-all whitespace-nowrap
          ${hasFilter
            ? 'bg-brand-teal text-white border-brand-teal'
            : 'bg-white text-gray-600 border-gray-200 hover:border-brand-teal hover:text-brand-teal'
          }`}
      >
        <SlidersHorizontal className="h-3.5 w-3.5" />
        {filterLabel ?? 'Filter'}
        {hasFilter && (
          <span
            role="button"
            tabIndex={0}
            aria-label="Clear filter"
            onClick={e => { e.stopPropagation(); handleClear(); }}
            onKeyDown={e => { if (e.key === 'Enter') { e.stopPropagation(); handleClear(); }}}
            className="ml-0.5 rounded-full hover:bg-white/30 transition-colors"
          >
            <X className="h-3 w-3" />
          </span>
        )}
      </button>

      {/* ── MOBILE BOTTOM SHEET ───────────────────────────── */}
      {sheetOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setSheetOpen(false)}
          />

          {/* Sheet */}
          <div className="relative bg-white rounded-t-2xl shadow-2xl px-5 pt-4 pb-8 animate-in slide-in-from-bottom-4 duration-200">
            {/* Handle */}
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />

            {/* Title row */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-brand-teal" />
                <span className="text-sm font-semibold text-gray-800">Filter by Date</span>
              </div>
              <button
                onClick={() => setSheetOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
                aria-label="Close filter"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Month & Year */}
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">By Month</p>
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div>
                <label htmlFor="sh-month" className="block text-xs font-medium text-gray-500 mb-1.5">Month</label>
                <select
                  id="sh-month"
                  value={filterMonth}
                  onChange={e => handleMonthChange(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20 bg-white"
                >
                  <option value="">Any month</option>
                  {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="sh-year" className="block text-xs font-medium text-gray-500 mb-1.5">Year</label>
                <select
                  id="sh-year"
                  value={filterYear}
                  onChange={e => handleYearChange(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20 bg-white"
                >
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 h-px bg-gray-100" />
              <span className="text-xs text-gray-400 font-medium">OR DATE RANGE</span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>

            {/* From / To */}
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Custom Range</p>
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div>
                <label htmlFor="sh-from" className="block text-xs font-medium text-gray-500 mb-1.5">From</label>
                <input
                  id="sh-from"
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  disabled={!!selectedMonth}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20 disabled:bg-gray-50 disabled:text-gray-300 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label htmlFor="sh-to" className="block text-xs font-medium text-gray-500 mb-1.5">To</label>
                <input
                  id="sh-to"
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  disabled={!!selectedMonth}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20 disabled:bg-gray-50 disabled:text-gray-300 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleClear}
                className="flex-1 py-3 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all"
              >
                Clear All
              </button>
              <button
                onClick={handleApply}
                className="flex-[2] py-3 text-sm font-semibold text-white bg-brand-teal hover:bg-brand-teal/90 rounded-xl shadow-sm transition-all"
              >
                Apply Filter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DESKTOP INLINE ────────────────────────────────── */}
      <div className="hidden lg:flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs font-medium text-brand-teal">
          <Calendar className="h-3.5 w-3.5" />
          <span>Filter:</span>
        </div>

        <select
          value={filterMonth}
          onChange={e => handleMonthChange(e.target.value)}
          className="w-28 rounded border border-gray-300 px-2 py-1 text-xs outline-none focus:border-brand-teal bg-white"
        >
          <option value="">Month</option>
          {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>

        <select
          value={filterYear}
          onChange={e => handleYearChange(e.target.value)}
          className="w-20 rounded border border-gray-300 px-2 py-1 text-xs outline-none focus:border-brand-teal bg-white"
        >
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>

        <span className="text-xs text-gray-400">OR</span>

        <input
          type="date"
          value={startDate}
          onChange={e => setStartDate(e.target.value)}
          disabled={!!selectedMonth}
          className="w-36 rounded border border-gray-300 px-2 py-1 text-xs outline-none focus:border-brand-teal disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
        <span className="text-xs text-gray-400">→</span>
        <input
          type="date"
          value={endDate}
          onChange={e => setEndDate(e.target.value)}
          disabled={!!selectedMonth}
          className="w-36 rounded border border-gray-300 px-2 py-1 text-xs outline-none focus:border-brand-teal disabled:bg-gray-100 disabled:cursor-not-allowed"
        />

        <button
          onClick={handleApply}
          className="px-3 py-1 text-xs font-semibold text-white bg-brand-teal hover:bg-brand-teal/90 rounded transition-all"
        >
          Apply
        </button>

        {hasFilter && (
          <button
            onClick={handleClear}
            className="p-1 text-red-500 hover:bg-red-50 rounded transition-all"
            title="Clear filters"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </>
  );
};

export default DateRangeFilter;
