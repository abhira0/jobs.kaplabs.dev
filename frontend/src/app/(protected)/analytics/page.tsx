// Analytics Page - Main Dashboard

'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { SimplifyJob, AnalyticsFilters, ProcessedAnalyticsData, Snapshot, SnapshotWithData } from '@/types/analytics';
import { processAnalyticsData, applyFilters } from '@/utils/analytics';
import { buildApiUrl } from '@/utils/api';
import FilterBar from '@/components/analytics/FilterBar';
import LoadingSkeleton from '@/components/analytics/LoadingSkeleton';
import EmptyState from '@/components/analytics/EmptyState';
import SnapshotModal from '@/components/analytics/SnapshotModal';
import Overview from '@/components/analytics/tabs/Overview';
import Applications from '@/components/analytics/tabs/Applications';
import Companies from '@/components/analytics/tabs/Companies';
import Compensation from '@/components/analytics/tabs/Compensation';

type Tab = 'overview' | 'applications' | 'companies' | 'compensation';

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
  const [isSnapshotModalOpen, setIsSnapshotModalOpen] = useState(false);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [viewingSnapshot, setViewingSnapshot] = useState<SimplifyJob[] | null>(null);
  const [snapshotName, setSnapshotName] = useState<string | null>(null);
  const [currentSnapshotId, setCurrentSnapshotId] = useState<string | null>(null);

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

  // Determine which data to display (snapshot or current)
  const displayData = viewingSnapshot || rawData;

  // Process and filter data
  const processedData: ProcessedAnalyticsData | null = useMemo(() => {
    if (!displayData || displayData.length === 0) return null;

    const filteredData = applyFilters(displayData, filters);
    return processAnalyticsData(filteredData, filters);
  }, [displayData, filters]);

  // Extract unique companies and locations for filters
  const { companies, locations } = useMemo(() => {
    if (!rawData) return { companies: [], locations: [] };

    const uniqueCompanies = Array.from(
      new Set(rawData.map(job => job.company?.name || job.company_name || job.company_id).filter(Boolean))
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

  // Fetch snapshots
  const fetchSnapshots = async () => {
    try {
      const token = localStorage.getItem('jwt_token');
      const res = await fetch(buildApiUrl('/analytics/snapshots'), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setSnapshots(data);
      }
    } catch (error) {
      console.error('Failed to fetch snapshots:', error);
    }
  };

  // Fetch saved filters (snapshot-specific or default)
  const fetchSavedFilters = async (snapshotId: string | null = null) => {
    try {
      const token = localStorage.getItem('jwt_token');

      // Build URL with optional snapshot_id parameter
      let url = '/analytics/filters';
      if (snapshotId) {
        url += `?snapshot_id=${snapshotId}`;
      }

      const res = await fetch(buildApiUrl(url), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        // Apply the loaded filters
        setFilters({
          dateRange: data.date_range || 'all',
          customStartDate: data.custom_start_date,
          customEndDate: data.custom_end_date,
        });
      }
    } catch (error) {
      console.error('Failed to fetch saved filters:', error);
    }
  };

  // Fetch snapshots and restore snapshot view if needed
  useEffect(() => {
    const init = async () => {
      await fetchSnapshots();

      // Check if we were viewing a snapshot before refresh
      const savedSnapshotId = localStorage.getItem('viewing_snapshot_id');
      if (savedSnapshotId) {
        // Restore snapshot view
        await handleViewSnapshot(savedSnapshotId);
      } else {
        // Load default filters
        await fetchSavedFilters(null);
      }
    };

    init();
  }, []);

  // Auto-load first snapshot if no current data
  useEffect(() => {
    const autoLoadSnapshot = async () => {
      // Only auto-load if:
      // 1. We're not already viewing a snapshot
      // 2. There's no current data
      // 3. We have snapshots available
      // 4. Data has finished loading
      if (!viewingSnapshot && (!rawData || rawData.length === 0) && !isLoading && snapshots.length > 0) {
        // Load the most recent snapshot (first in the list)
        await handleViewSnapshot(snapshots[0].id);
      }
    };

    autoLoadSnapshot();
  }, [rawData, isLoading, snapshots, viewingSnapshot]);

  // View snapshot
  const handleViewSnapshot = async (snapshotId: string) => {
    try {
      const token = localStorage.getItem('jwt_token');
      const res = await fetch(buildApiUrl(`/analytics/snapshots/${snapshotId}`), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const snapshotData: SnapshotWithData = await res.json();
        setViewingSnapshot(snapshotData.data);
        setSnapshotName(snapshotData.name);
        setCurrentSnapshotId(snapshotId);

        // Save to localStorage so we can restore on refresh
        localStorage.setItem('viewing_snapshot_id', snapshotId);

        // Load snapshot-specific saved filters
        await fetchSavedFilters(snapshotId);
        setIsSnapshotModalOpen(false);
      }
    } catch (error) {
      console.error('Failed to fetch snapshot:', error);
    }
  };

  // Exit snapshot view
  const handleExitSnapshotView = () => {
    setViewingSnapshot(null);
    setSnapshotName(null);
    setCurrentSnapshotId(null);

    // Remove from localStorage
    localStorage.removeItem('viewing_snapshot_id');

    // Reload default filters (no snapshot ID)
    fetchSavedFilters(null);
  };

  // Tabs configuration
  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'applications', label: 'Applications' },
    { id: 'companies', label: 'Companies' },
    { id: 'compensation', label: 'Compensation' },
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
          <h1 className="text-2xl font-semibold">
            {viewingSnapshot ? (
              <>
                Analytics Dashboard <span className="text-blue-400">• Viewing: {snapshotName}</span>
              </>
            ) : (
              'Analytics Dashboard'
            )}
          </h1>
          <p className="text-sm text-muted mt-1">
            {viewingSnapshot
              ? 'Viewing snapshot data - changes to filters will not affect snapshot'
              : 'Track your job application performance and insights'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {viewingSnapshot ? (
            <button
              onClick={handleExitSnapshotView}
              className="px-4 py-2 rounded-md bg-white/10 hover:bg-white/15 text-sm font-medium transition-colors whitespace-nowrap"
            >
              Exit Snapshot View
            </button>
          ) : (
            <>
              <button
                onClick={() => setIsSnapshotModalOpen(true)}
                className="px-4 py-2 rounded-md bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-sm font-medium transition-colors whitespace-nowrap"
              >
                📸 Snapshots ({snapshots.length}/5)
              </button>
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
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <FilterBar
        filters={filters}
        onFiltersChange={setFilters}
        companies={companies}
        locations={locations}
        snapshotId={currentSnapshotId}
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
        {activeTab === 'companies' && <Companies data={processedData} rawData={displayData || []} />}
        {activeTab === 'compensation' && <Compensation data={processedData} />}
      </div>

      {/* Snapshot Modal */}
      <SnapshotModal
        isOpen={isSnapshotModalOpen}
        onClose={() => setIsSnapshotModalOpen(false)}
        snapshots={snapshots}
        onSnapshotCreated={fetchSnapshots}
        onSnapshotDeleted={fetchSnapshots}
        onSnapshotView={handleViewSnapshot}
        currentFilters={filters}
      />
    </section>
  );
}

export default function AnalyticsPage() {
  return <AnalyticsPageInner />;
}
