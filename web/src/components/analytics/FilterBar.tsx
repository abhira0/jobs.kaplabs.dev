// Global Filter Bar for Analytics

'use client';

import { AnalyticsFilters, DateRange } from '@/types/analytics';

type FilterBarProps = {
  filters: AnalyticsFilters;
  onFiltersChange: (filters: AnalyticsFilters) => void;
  companies: string[];
  locations: string[];
};

export default function FilterBar({ filters, onFiltersChange, companies, locations }: FilterBarProps) {
  const dateRanges: { value: DateRange; label: string }[] = [
    { value: '7d', label: 'Last 7 days' },
    { value: '14d', label: 'Last 14 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '60d', label: 'Last 60 days' },
    { value: '90d', label: 'Last 90 days' },
    { value: 'all', label: 'All time' },
  ];

  const handleDateRangeChange = (range: DateRange) => {
    onFiltersChange({ ...filters, dateRange: range });
  };

  const handleReset = () => {
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
      <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
        {/* Date Range Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted whitespace-nowrap">Time period:</span>
          <div className="flex flex-wrap gap-2">
            {dateRanges.map(range => (
              <button
                key={range.value}
                onClick={() => handleDateRangeChange(range.value)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  filters.dateRange === range.value
                    ? 'bg-white/15 text-white'
                    : 'bg-white/5 text-muted hover:bg-white/10'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>

        {/* Reset Button */}
        {hasActiveFilters && (
          <button
            onClick={handleReset}
            className="ml-auto px-4 py-1.5 rounded-md bg-white/5 hover:bg-white/10 text-xs font-medium transition-colors whitespace-nowrap"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Advanced Filters - Could be expanded in the future */}
      {/* <div className="mt-4 pt-4 border-t border-default">
        <details className="group">
          <summary className="text-sm text-muted cursor-pointer hover:text-white transition-colors">
            Advanced Filters
          </summary>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            ... additional filter controls
          </div>
        </details>
      </div> */}
    </div>
  );
}
