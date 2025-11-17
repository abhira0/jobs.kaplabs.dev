// Overview Tab - Main Analytics Dashboard

'use client';

import { useMemo } from 'react';
import { ProcessedAnalyticsData } from '@/types/analytics';
import StatCard from '../StatCard';
import ChartContainer from '../ChartContainer';
import EmptyState from '../EmptyState';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Brush,
} from 'recharts';

type OverviewProps = {
  data: ProcessedAnalyticsData;
};

export default function Overview({ data }: OverviewProps) {
  const { summary, weeklyTrend, dayOfWeek, applicationFunnel } = data;

  // Prepare data for charts
  const dayOfWeekData = Object.entries(dayOfWeek).map(([day, value]) => ({
    day,
    applications: value,
  }));

  // Calculate conversion metrics (percentage of each stage relative to total applications)
  const conversionMetrics = useMemo(() => {
    const totalApps = summary.totalApps;
    if (totalApps === 0) return null;

    return [
      {
        stage: 'Applications Submitted',
        count: totalApps,
        percentage: 100,
        color: '#3b82f6',
      },
      {
        stage: 'Ghosted (No Response)',
        count: applicationFunnel.find(s => s.name === 'Ghosted')?.value || 0,
        percentage: ((applicationFunnel.find(s => s.name === 'Ghosted')?.value || 0) / totalApps) * 100,
        color: '#64748b',
      },
      {
        stage: 'Screening Stage',
        count: applicationFunnel.find(s => s.name === 'Screen')?.value || 0,
        percentage: ((applicationFunnel.find(s => s.name === 'Screen')?.value || 0) / totalApps) * 100,
        color: '#f59e0b',
      },
      {
        stage: 'Interviewing',
        count: applicationFunnel.find(s => s.name === 'Interviewing')?.value || 0,
        percentage: ((applicationFunnel.find(s => s.name === 'Interviewing')?.value || 0) / totalApps) * 100,
        color: '#8b5cf6',
      },
      {
        stage: 'Offers Received',
        count: applicationFunnel.find(s => s.name === 'Offer')?.value || 0,
        percentage: ((applicationFunnel.find(s => s.name === 'Offer')?.value || 0) / totalApps) * 100,
        color: '#10b981',
      },
      {
        stage: 'Offers Accepted',
        count: applicationFunnel.find(s => s.name === 'Accepted')?.value || 0,
        percentage: ((applicationFunnel.find(s => s.name === 'Accepted')?.value || 0) / totalApps) * 100,
        color: '#22c55e',
      },
      {
        stage: 'Rejected',
        count: applicationFunnel.find(s => s.name === 'Rejected')?.value || 0,
        percentage: ((applicationFunnel.find(s => s.name === 'Rejected')?.value || 0) / totalApps) * 100,
        color: '#ef4444',
      },
    ];
  }, [summary, applicationFunnel]);

  // Calculate overall success rate (interviews + offers / total apps)
  const successRate = useMemo(() => {
    if (summary.totalApps === 0) return 0;
    const interviews = applicationFunnel.find(s => s.name === 'Interviewing')?.value || 0;
    const offers = applicationFunnel.find(s => s.name === 'Offer')?.value || 0;
    const accepted = applicationFunnel.find(s => s.name === 'Accepted')?.value || 0;
    return ((interviews + offers + accepted) / summary.totalApps) * 100;
  }, [summary, applicationFunnel]);

  if (!weeklyTrend || weeklyTrend.length === 0) {
    return <EmptyState title="No Data" description="No analytics data available yet. Start applying to jobs to see insights!" />;
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Applications"
          value={summary.totalApps}
          subtitle={`${summary.todayApps} today`}
          format="number"
        />
        <StatCard
          title="Companies"
          value={summary.totalCompanies}
          subtitle={`${summary.todayCompanies} today`}
          format="number"
        />
        <StatCard
          title="Success Rate"
          value={successRate.toFixed(1)}
          suffix="%"
          subtitle="Interviews + Offers"
        />
        <StatCard
          title="Avg Response Time"
          value={summary.avgResponseTime || 0}
          suffix="days"
          subtitle="From application to response"
        />
      </div>

      {/* Weekly Trend */}
      <ChartContainer
        title="Application Trend"
        description="Weekly application volume"
        chartId="weekly-trend-chart"
        exportData={{
          name: 'Weekly Trend',
          data: weeklyTrend,
          headers: ['date', 'value', 'label'],
        }}
      >
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={weeklyTrend}>
            <defs>
              <linearGradient id="colorApplications" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
            <XAxis
              dataKey="label"
              stroke="#8b949e"
              style={{ fontSize: '12px' }}
            />
            <YAxis stroke="#8b949e" style={{ fontSize: '12px' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f1117',
                border: '1px solid #21262d',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#3b82f6"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorApplications)"
            />
            <Brush
              dataKey="label"
              height={30}
              stroke="#3b82f6"
              fill="#1e293b"
              travellerWidth={10}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartContainer>

      {/* Conversion Metrics Breakdown */}
      <ChartContainer
        title="Conversion Metrics"
        description="Percentage of applications reaching each stage"
      >
        <div className="space-y-4">
          {conversionMetrics?.map((metric, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: metric.color }}
                  />
                  <span className="font-medium">{metric.stage}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-muted">{metric.count} apps</span>
                  <span className="font-semibold min-w-[4rem] text-right">
                    {metric.percentage.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="w-full bg-white/5 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${metric.percentage}%`,
                    backgroundColor: metric.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </ChartContainer>

      {/* Day of Week Distribution */}
      <ChartContainer
        title="Applications by Day"
        description="Which days you apply most"
        chartId="day-of-week-chart"
        exportData={{
          name: 'Day of Week',
          data: dayOfWeekData,
          headers: ['day', 'applications'],
        }}
      >
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={dayOfWeekData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
            <XAxis
              dataKey="day"
              stroke="#8b949e"
              style={{ fontSize: '12px' }}
              tickFormatter={(value) => value.slice(0, 3)}
            />
            <YAxis stroke="#8b949e" style={{ fontSize: '12px' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f1117',
                border: '1px solid #21262d',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Bar dataKey="applications" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
}
