// Global Filter Bar for Analytics

'use client';

import { useState, useEffect } from 'react';
import { AnalyticsFilters, DateRange } from '@/types/analytics';
import { buildApiUrl } from '@/utils/api';

type FilterBarProps = {
  filters: AnalyticsFilters;
  onFiltersChange: (filters: AnalyticsFilters) => void;
  companies: string[];
  locations: string[];
  isSnapshotView?: boolean;
};

export default function FilterBar({ filters, onFiltersChange, companies, locations, isSnapshotView = false }: FilterBarProps) {
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [customStartDate, setCustomStartDate] = useState(filters.customStartDate || '');
  const [customEndDate, setCustomEndDate] = useState(filters.customEndDate || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const dateRangeOptions: { value: DateRange; label: string }[] = [
    { value: '7d', label: 'Last 7 days' },
    { value: '14d', label: 'Last 14 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '60d', label: 'Last 60 days' },
    { value: '90d', label: 'Last 90 days' },
    { value: 'all', label: 'All time' },
    { value: 'custom', label: 'Custom range' },
  ];

  const handleDateRangeChange = (range: DateRange) => {
    if (range === 'custom') {
      setShowCustomDatePicker(true);
      onFiltersChange({ ...filters, dateRange: range });
    } else {
      setShowCustomDatePicker(false);
      onFiltersChange({
        ...filters,
        dateRange: range,
        customStartDate: undefined,
        customEndDate: undefined,
      });
    }
  };

  const handleCustomDateApply = () => {
    if (customStartDate && customEndDate) {
      onFiltersChange({
        ...filters,
        dateRange: 'custom',
        customStartDate,
        customEndDate,
      });
    }
  };

  const handleSaveFilters = async () => {
    setIsSaving(true);
    setSaveMessage(null);

    try {
      const token = localStorage.getItem('jwt_token');
      if (!token) throw new Error('Not authenticated');

      const res = await fetch(buildApiUrl('/auth/me/analytics-filters'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          dateRange: filters.dateRange,
          customStartDate: filters.customStartDate,
          customEndDate: filters.customEndDate,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to save filters');
      }

      setSaveMessage('Filters saved successfully!');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : 'Failed to save filters');
      setTimeout(() => setSaveMessage(null), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setShowCustomDatePicker(false);
    setCustomStartDate('');
    setCustomEndDate('');
    onFiltersChange({
      dateRange: 'all',
      companies: [],
      locations: [],
      statuses: [],
    });
  };

  const hasActiveFilters =
    filters.dateRange !== 'all' ||
    (filters.companies && filters.companies.length > 0) ||
    (filters.locations && filters.locations.length > 0) ||
    (filters.salaryMin !== undefined) ||
    (filters.salaryMax !== undefined);

  return (
    <div className="rounded-lg border border-default bg-black/40 backdrop-blur p-4">
      <div className="flex flex-col gap-4">
        {/* Date Range Filter */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-3 flex-1">
            <span className="text-sm text-muted whitespace-nowrap">Time period:</span>
            <select
              value={filters.dateRange}
              onChange={(e) => handleDateRangeChange(e.target.value as DateRange)}
              disabled={isSnapshotView}
              className="px-3 py-2 rounded-md bg-white/10 border border-default text-sm font-medium transition-colors hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed min-w-[160px]"
            >
              {dateRangeOptions.map((option) => (
                <option key={option.value} value={option.value} className="bg-gray-900">
                  {option.label}
                </option>
              ))}
            </select>

            {!isSnapshotView && (
              <>
                <button
                  onClick={handleSaveFilters}
                  disabled={isSaving}
                  className="px-4 py-2 rounded-md bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  title="Save current filter settings"
                >
                  {isSaving ? 'Saving...' : 'Save Filters'}
                </button>

                {hasActiveFilters && (
                  <button
                    onClick={handleReset}
                    className="px-4 py-2 rounded-md bg-white/5 hover:bg-white/10 text-sm font-medium transition-colors whitespace-nowrap"
                  >
                    Reset
                  </button>
                )}
              </>
            )}
          </div>

          {saveMessage && (
            <div
              className={`text-xs px-3 py-1 rounded-md ${
                saveMessage.includes('success')
                  ? 'bg-green-500/20 text-green-300'
                  : 'bg-red-500/20 text-red-300'
              }`}
            >
              {saveMessage}
            </div>
          )}
        </div>

        {/* Custom Date Range Picker */}
        {showCustomDatePicker && (
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3 p-4 rounded-lg border border-default bg-black/20">
            <div className="flex-1">
              <label htmlFor="start-date" className="block text-xs text-muted mb-1">
                Start Date
              </label>
              <input
                id="start-date"
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-white/10 border border-default text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex-1">
              <label htmlFor="end-date" className="block text-xs text-muted mb-1">
                End Date
              </label>
              <input
                id="end-date"
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-white/10 border border-default text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={handleCustomDateApply}
              disabled={!customStartDate || !customEndDate}
              className="px-4 py-2 rounded-md bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Apply
            </button>
          </div>
        )}

        {isSnapshotView && (
          <div className="text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-md px-3 py-2">
            You are viewing a snapshot. Filters are disabled. Exit snapshot view to modify filters.
          </div>
        )}
      </div>
    </div>
  );
}
