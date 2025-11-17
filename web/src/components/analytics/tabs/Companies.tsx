// Companies Tab - Company-Level Analytics

'use client';

import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { ProcessedAnalyticsData, SimplifyJob } from '@/types/analytics';
import ChartContainer from '../ChartContainer';
import EmptyState from '../EmptyState';
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

// Dynamically import the map component to avoid SSR issues with Leaflet
const InteractiveLocationMap = dynamic(() => import('../InteractiveLocationMap'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[500px] bg-gray-950 rounded-lg border border-default">
      <div className="text-muted text-sm">Loading map...</div>
    </div>
  ),
});

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

  // Calculate average compensation per location
  const locationCompensation = useMemo(() => {
    const compensationMap = new Map<string, { total: number; count: number; avgPerHour: number }>();

    rawData.forEach(job => {
      const location = job.job_posting_location;
      if (!location || !job.salary || !job.salary_period) return;

      // Skip remote and hybrid for location compensation
      if (location.toLowerCase().includes('remote') || location.toLowerCase().includes('hybrid')) return;

      // Extract location name (first part before comma)
      const locationName = location.split(',')[0].trim();

      // Convert salary to hourly rate based on salary_period
      let hourlyRate = 0;
      switch (job.salary_period) {
        case 1: hourlyRate = job.salary; break; // hourly
        case 2: hourlyRate = job.salary / 8; break; // daily (8 hours)
        case 3: hourlyRate = job.salary / 40; break; // weekly (40 hours)
        case 4: hourlyRate = job.salary / 80; break; // biweekly (80 hours)
        case 5: hourlyRate = job.salary / 173; break; // monthly (173 hours)
        case 6: hourlyRate = job.salary / 2080; break; // yearly (2080 hours)
        default: hourlyRate = 0;
      }

      if (hourlyRate > 0) {
        const existing = compensationMap.get(locationName) || { total: 0, count: 0, avgPerHour: 0 };
        existing.total += hourlyRate;
        existing.count += 1;
        existing.avgPerHour = existing.total / existing.count;
        compensationMap.set(locationName, existing);
      }
    });

    return compensationMap;
  }, [rawData]);

  // Location data with compensation
  const topLocations = useMemo(() => {
    const sorted = [...location.locations]
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    return [
      ...sorted.map(loc => {
        const comp = locationCompensation.get(loc.name);
        return {
          name: loc.name,
          count: loc.count,
          avgCompensation: comp?.avgPerHour || 0,
        };
      }),
      { name: 'Remote', count: location.remoteCount, avgCompensation: 0 },
      { name: 'Hybrid', count: location.hybridCount, avgCompensation: 0 },
    ].filter(l => l.count > 0);
  }, [location, locationCompensation]);


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
        description="Most common job locations with average compensation"
        chartId="top-locations-chart"
        exportData={{
          name: 'Top Locations',
          data: topLocations,
          headers: ['name', 'count', 'avgCompensation'],
        }}
      >
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={topLocations} layout="vertical" margin={{ top: 5, right: 100, bottom: 5, left: 5 }}>
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
              content={({ active, payload }) => {
                if (active && payload && payload.length > 0) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-[#0f1117] border border-[#21262d] rounded-lg px-3 py-2 text-xs">
                      <div className="font-semibold mb-1">{data.name}</div>
                      <div className="text-muted">Jobs: {data.count}</div>
                      {data.avgCompensation > 0 && (
                        <div className="text-green-400 font-semibold mt-1">
                          Avg: ${data.avgCompensation.toFixed(2)}/hr (${(data.avgCompensation * 2080).toLocaleString()}/year)
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar
              dataKey="count"
              fill="#8b5cf6"
              name="Jobs"
              radius={[0, 4, 4, 0]}
              label={({ x, y, width, height, index }) => {
                const data = topLocations[index];
                if (!data || data.avgCompensation <= 0) return null;

                return (
                  <text
                    x={Number(x) + Number(width) + 5}
                    y={Number(y) + Number(height) / 2 + 4}
                    fill="#10b981"
                    fontSize="11"
                    fontWeight="600"
                    textAnchor="start"
                  >
                    ${data.avgCompensation.toFixed(0)}/hr
                  </text>
                );
              }}
            />
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
