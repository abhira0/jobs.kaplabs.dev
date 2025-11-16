// Performance Tab - Success Metrics and Trends

'use client';

import { useMemo } from 'react';
import { ProcessedAnalyticsData } from '@/types/analytics';
import ChartContainer from '../ChartContainer';
import StatCard from '../StatCard';
import EmptyState from '../EmptyState';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

type PerformanceProps = {
  data: ProcessedAnalyticsData;
};

export default function Performance({ data }: PerformanceProps) {
  const { summary, successRateTrend, monthlyTrend, statusDistribution } = data;

  // Calculate velocity (apps per week)
  const velocity = useMemo(() => {
    if (monthlyTrend.length === 0) return 0;

    const recentMonth = monthlyTrend[monthlyTrend.length - 1];
    return Math.round(recentMonth.value / 4.33); // Average weeks per month
  }, [monthlyTrend]);

  // Calculate conversion rates
  const conversionMetrics = useMemo(() => {
    const total = summary.totalApps;
    if (total === 0) return null;

    const interviews = statusDistribution.interviewing || 0;
    const offers = statusDistribution.offer || 0;
    const rejections = statusDistribution.rejected || 0;

    return {
      interviewRate: ((interviews / total) * 100).toFixed(1),
      offerRate: ((offers / total) * 100).toFixed(1),
      rejectionRate: ((rejections / total) * 100).toFixed(1),
    };
  }, [summary, statusDistribution]);

  // Funnel data - show current status breakdown
  const funnelData = [
    {
      stage: 'Applied',
      count: summary.totalApps,
      color: '#3b82f6',
      percentage: 100,
    },
    {
      stage: 'Pending Response',
      count: statusDistribution.pending || 0,
      color: '#6366f1',
      percentage: summary.totalApps > 0 ? Math.round(((statusDistribution.pending || 0) / summary.totalApps) * 100) : 0,
    },
    {
      stage: 'Interviewing',
      count: statusDistribution.interviewing || 0,
      color: '#f59e0b',
      percentage: summary.totalApps > 0 ? Math.round(((statusDistribution.interviewing || 0) / summary.totalApps) * 100) : 0,
    },
    {
      stage: 'Offers',
      count: (statusDistribution.offer || 0) + (statusDistribution.accepted || 0),
      color: '#10b981',
      percentage: summary.totalApps > 0 ? Math.round((((statusDistribution.offer || 0) + (statusDistribution.accepted || 0)) / summary.totalApps) * 100) : 0,
    },
    {
      stage: 'Rejected',
      count: statusDistribution.rejected || 0,
      color: '#ef4444',
      percentage: summary.totalApps > 0 ? Math.round(((statusDistribution.rejected || 0) / summary.totalApps) * 100) : 0,
    },
  ];

  if (summary.totalApps === 0) {
    return <EmptyState title="No Performance Data" description="No applications to analyze yet" />;
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Success Rate"
          value={summary.successRate || 0}
          format="percentage"
          subtitle="Interviews + Offers"
        />
        <StatCard
          title="Interview Rate"
          value={conversionMetrics?.interviewRate || '0'}
          suffix="%"
          subtitle="Of total applications"
        />
        <StatCard
          title="Application Velocity"
          value={velocity}
          suffix="/week"
          subtitle="Recent average"
        />
        <StatCard
          title="Avg Response Time"
          value={summary.avgResponseTime || 0}
          suffix="days"
          subtitle="Time to hear back"
        />
      </div>

      {/* Success Rate Trend and Monthly Volume */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Success Rate Trend */}
        <ChartContainer
          title="Success Rate Trend"
          description="Weekly success rate over time"
          chartId="success-trend-chart"
          exportData={{
            name: 'Success Rate Trend',
            data: successRateTrend,
            headers: ['date', 'value', 'label'],
          }}
        >
          {successRateTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={successRateTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                <XAxis
                  dataKey="label"
                  stroke="#8b949e"
                  style={{ fontSize: '12px' }}
                />
                <YAxis
                  stroke="#8b949e"
                  style={{ fontSize: '12px' }}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f1117',
                    border: '1px solid #21262d',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value: number) => [`${value}%`, 'Success Rate']}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  name="Success Rate"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState title="No Trend Data" description="Not enough data points for trend analysis" />
          )}
        </ChartContainer>

        {/* Monthly Application Volume */}
        <ChartContainer
          title="Monthly Application Volume"
          description="Applications submitted per month"
          chartId="monthly-volume-chart"
          exportData={{
            name: 'Monthly Volume',
            data: monthlyTrend,
            headers: ['date', 'value', 'label'],
          }}
        >
          {monthlyTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyTrend}>
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
                <Bar
                  dataKey="value"
                  fill="#3b82f6"
                  name="Applications"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState title="No Monthly Data" description="Not enough data for monthly analysis" />
          )}
        </ChartContainer>
      </div>

      {/* Application Status Breakdown */}
      <ChartContainer
        title="Application Status Breakdown"
        description="Current status of all applications"
        chartId="funnel-chart"
        exportData={{
          name: 'Application Status',
          data: funnelData,
          headers: ['stage', 'count', 'percentage'],
        }}
      >
        <div className="space-y-4">
          {funnelData.map((item, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="font-medium">{item.stage}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-muted">{item.count} apps</span>
                  <span className="font-semibold min-w-[3rem] text-right">{item.percentage}%</span>
                </div>
              </div>
              <div className="w-full bg-white/5 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${item.percentage}%`,
                    backgroundColor: item.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </ChartContainer>

      {/* Conversion Metrics Summary */}
      {conversionMetrics && (
        <div className="rounded-lg border border-default bg-black/40 backdrop-blur p-6">
          <h3 className="text-lg font-semibold mb-4">Conversion Metrics</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted">Interview Rate</span>
                <span className="text-lg font-semibold">{conversionMetrics.interviewRate}%</span>
              </div>
              <div className="w-full bg-white/5 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{ width: `${conversionMetrics.interviewRate}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted">Offer Rate</span>
                <span className="text-lg font-semibold">{conversionMetrics.offerRate}%</span>
              </div>
              <div className="w-full bg-white/5 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all"
                  style={{ width: `${conversionMetrics.offerRate}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted">Rejection Rate</span>
                <span className="text-lg font-semibold">{conversionMetrics.rejectionRate}%</span>
              </div>
              <div className="w-full bg-white/5 rounded-full h-2">
                <div
                  className="bg-red-500 h-2 rounded-full transition-all"
                  style={{ width: `${conversionMetrics.rejectionRate}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
