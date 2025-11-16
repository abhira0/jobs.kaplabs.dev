// Companies Tab - Company-Level Analytics

'use client';

import { useState, useMemo } from 'react';
import { ProcessedAnalyticsData, SimplifyJob } from '@/types/analytics';
import ChartContainer from '../ChartContainer';
import EmptyState from '../EmptyState';
import InteractiveLocationMap from '../InteractiveLocationMap';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

type CompaniesProps = {
  data: ProcessedAnalyticsData;
  rawData?: SimplifyJob[];
};

export default function Companies({ data, rawData = [] }: CompaniesProps) {
  const { topCompanies, location } = data;
  const [showCount, setShowCount] = useState<10 | 20>(10);

  const topCompaniesByApps = useMemo(() => {
    return topCompanies.slice(0, showCount);
  }, [topCompanies, showCount]);

  // Location data
  const topLocations = useMemo(() => {
    const sorted = [...location.locations]
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    return [
      ...sorted.map(loc => ({ name: loc.name, count: loc.count })),
      { name: 'Remote', count: location.remoteCount },
      { name: 'Hybrid', count: location.hybridCount },
    ].filter(l => l.count > 0);
  }, [location]);


  if (topCompanies.length === 0) {
    return <EmptyState title="No Company Data" description="No company analytics available" />;
  }

  return (
    <div className="space-y-6">
      {/* Top Companies by Applications */}
      <ChartContainer
        title="Top Companies by Applications"
        description="Companies you've applied to most"
        chartId="top-companies-chart"
        exportData={{
          name: 'Top Companies',
          data: topCompaniesByApps,
          headers: ['company_name', 'totalApplications', 'rejections', 'interviews', 'offers'],
        }}
        actions={
          <div className="flex gap-2">
            <button
              onClick={() => setShowCount(10)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                showCount === 10
                  ? 'bg-white/15 text-white'
                  : 'bg-white/5 text-muted hover:bg-white/10'
              }`}
            >
              Top 10
            </button>
            <button
              onClick={() => setShowCount(20)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                showCount === 20
                  ? 'bg-white/15 text-white'
                  : 'bg-white/5 text-muted hover:bg-white/10'
              }`}
            >
              Top 20
            </button>
          </div>
        }
      >
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={topCompaniesByApps} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
            <XAxis type="number" stroke="#8b949e" style={{ fontSize: '12px' }} />
            <YAxis
              type="category"
              dataKey="company_name"
              stroke="#8b949e"
              style={{ fontSize: '11px' }}
              width={150}
              tickFormatter={(value) => value?.length > 20 ? value.slice(0, 20) + '...' : value || 'Unknown'}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f1117',
                border: '1px solid #21262d',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Legend />
            <Bar dataKey="totalApplications" fill="#3b82f6" name="Applications" radius={[0, 4, 4, 0]} />
            <Bar dataKey="interviews" fill="#10b981" name="Interviews" radius={[0, 4, 4, 0]} />
            <Bar dataKey="offers" fill="#f59e0b" name="Offers" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>

      {/* Top Locations */}
      <ChartContainer
        title="Top Job Locations"
        description="Most common job locations"
        chartId="top-locations-chart"
        exportData={{
          name: 'Top Locations',
          data: topLocations,
          headers: ['name', 'count'],
        }}
      >
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={topLocations} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
            <XAxis type="number" stroke="#8b949e" style={{ fontSize: '12px' }} />
            <YAxis
              type="category"
              dataKey="name"
              stroke="#8b949e"
              style={{ fontSize: '11px' }}
              width={100}
              tickFormatter={(value) => value?.length > 15 ? value.slice(0, 15) + '...' : value}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f1117',
                border: '1px solid #21262d',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Bar dataKey="count" fill="#8b5cf6" name="Jobs" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>

      {/* Geographic Distribution Map */}
      <ChartContainer
        title="Geographic Distribution"
        description="Where you're applying to jobs"
        chartId="location-map"
      >
        <InteractiveLocationMap
          locations={location.locations}
          remoteCount={location.remoteCount}
          hybridCount={location.hybridCount}
          jobsData={rawData}
        />
      </ChartContainer>

    </div>
  );
}
