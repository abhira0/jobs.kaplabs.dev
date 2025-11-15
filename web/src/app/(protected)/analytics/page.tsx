// Analytics Page - Main Dashboard

'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { SimplifyJob, AnalyticsFilters, ProcessedAnalyticsData } from '@/types/analytics';
import { processAnalyticsData, applyFilters } from '@/utils/analytics';
import { buildApiUrl } from '@/utils/api';
import FilterBar from '@/components/analytics/FilterBar';
import LoadingSkeleton from '@/components/analytics/LoadingSkeleton';
import EmptyState from '@/components/analytics/EmptyState';
import Overview from '@/components/analytics/tabs/Overview';
import Applications from '@/components/analytics/tabs/Applications';
import Companies from '@/components/analytics/tabs/Companies';
import Compensation from '@/components/analytics/tabs/Compensation';
import Performance from '@/components/analytics/tabs/Performance';

type Tab = 'overview' | 'applications' | 'companies' | 'compensation' | 'performance';

// Fetcher function for SWR
const fetcher = async (url: string): Promise<SimplifyJob[]> => {
  const token = localStorage.getItem('jwt_token');
  if (!token) throw new Error('No authentication token');

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });

  if (!res.ok) throw new Error('Failed to fetch analytics data');
  return res.json();
};

function AnalyticsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>((searchParams.get('tab') as Tab) || 'overview');
  const [filters, setFilters] = useState<AnalyticsFilters>({
    dateRange: 'all',
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch data with SWR - auto-refresh every 5 minutes
  const {
    data: rawData,
    error,
    isLoading,
    mutate,
  } = useSWR<SimplifyJob[]>(buildApiUrl('/simplify/parsed'), fetcher, {
    refreshInterval: 5 * 60 * 1000, // 5 minutes
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  });

  // Process and filter data
  const processedData: ProcessedAnalyticsData | null = useMemo(() => {
    if (!rawData || rawData.length === 0) return null;

    const filteredData = applyFilters(rawData, filters);
    return processAnalyticsData(filteredData);
  }, [rawData, filters]);

  // Extract unique companies and locations for filters
  const { companies, locations } = useMemo(() => {
    if (!rawData) return { companies: [], locations: [] };

    const uniqueCompanies = Array.from(
      new Set(rawData.map(job => job.company_name || job.company_id).filter(Boolean))
    );

    const uniqueLocations = Array.from(
      new Set(
        rawData
          .map(job => job.job_posting_location)
          .filter(Boolean)
          .flatMap(loc => {
            if (!loc) return [];
            // Extract city/state from location string
            const parts = loc.split(',');
            return parts.length > 0 ? [parts[0].trim()] : [];
          })
      )
    );

    return {
      companies: uniqueCompanies.slice(0, 50), // Limit for performance
      locations: uniqueLocations.slice(0, 30),
    };
  }, [rawData]);

  // Update URL when tab changes
  useEffect(() => {
    const timeout = setTimeout(() => {
      const params = new URLSearchParams();
      if (activeTab !== 'overview') {
        params.set('tab', activeTab);
      }
      const newUrl = params.toString() ? `/analytics?${params.toString()}` : '/analytics';
      router.replace(newUrl);
    }, 100);

    return () => clearTimeout(timeout);
  }, [activeTab, router]);

  // Manual refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // First trigger a data refresh from Simplify backend
      const token = localStorage.getItem('jwt_token');
      await fetch(buildApiUrl('/simplify/refresh'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Then revalidate the SWR cache
      await mutate();
    } catch (error) {
      console.error('Failed to refresh data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Tabs configuration
  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'applications', label: 'Applications' },
    { id: 'companies', label: 'Companies' },
    { id: 'compensation', label: 'Compensation' },
    { id: 'performance', label: 'Performance' },
  ];

  // Loading state
  if (isLoading) {
    return (
      <section className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Analytics</h1>
        </div>
        <LoadingSkeleton />
      </section>
    );
  }

  // Error state
  if (error) {
    return (
      <section className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold">Analytics</h1>
        <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-6">
          <h3 className="text-lg font-medium text-red-500 mb-2">Error Loading Analytics</h3>
          <p className="text-sm text-red-400">
            {error.message || 'Failed to load analytics data. Please try refreshing the page.'}
          </p>
          <button
            onClick={handleRefresh}
            className="mt-4 px-4 py-2 rounded-md bg-red-500/20 hover:bg-red-500/30 text-red-300 text-sm font-medium transition-colors"
          >
            Try Again
          </button>
        </div>
      </section>
    );
  }

  // Empty state
  if (!processedData || !rawData || rawData.length === 0) {
    return (
      <section className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Analytics</h1>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-4 py-2 rounded-md bg-white/10 hover:bg-white/15 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {isRefreshing ? (
              <>
                <span className="inline-block animate-spin mr-2">⟳</span>
                Refreshing...
              </>
            ) : (
              'Refresh Data'
            )}
          </button>
        </div>
        <EmptyState
          title="No Analytics Data Available"
          description="Start applying to jobs to see your analytics dashboard. Data is automatically synced from your Simplify account."
        />
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Analytics Dashboard</h1>
          <p className="text-sm text-muted mt-1">
            Track your job application performance and insights
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="px-4 py-2 rounded-md bg-white/10 hover:bg-white/15 text-sm font-medium transition-colors disabled:opacity-50 whitespace-nowrap"
        >
          {isRefreshing ? (
            <>
              <span className="inline-block animate-spin mr-2">⟳</span>
              Refreshing...
            </>
          ) : (
            <>
              <span className="mr-2">⟳</span>
              Refresh Data
            </>
          )}
        </button>
      </div>

      {/* Filters */}
      <FilterBar
        filters={filters}
        onFiltersChange={setFilters}
        companies={companies}
        locations={locations}
      />

      {/* Tab Navigation */}
      <div className="border-b border-default">
        <nav className="flex gap-2 overflow-x-auto" role="tablist">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors relative ${
                activeTab === tab.id
                  ? 'text-white'
                  : 'text-muted hover:text-white'
              }`}
              role="tab"
              aria-selected={activeTab === tab.id}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div role="tabpanel">
        {activeTab === 'overview' && <Overview data={processedData} />}
        {activeTab === 'applications' && <Applications data={processedData} />}
        {activeTab === 'companies' && <Companies data={processedData} />}
        {activeTab === 'compensation' && <Compensation data={processedData} />}
        {activeTab === 'performance' && <Performance data={processedData} />}
      </div>
    </section>
  );
}

export default function AnalyticsPage() {
  return <AnalyticsPageInner />;
}
