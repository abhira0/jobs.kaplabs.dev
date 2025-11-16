// Applications Tab - Detailed Application Analytics

'use client';

import { useState, useMemo } from 'react';
import { ProcessedAnalyticsData } from '@/types/analytics';
import ChartContainer from '../ChartContainer';
import StatCard from '../StatCard';
import EmptyState from '../EmptyState';
import {
  ComposedChart,
  Line,
  Bar,
  BarChart,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';

type ApplicationsProps = {
  data: ProcessedAnalyticsData;
};

export default function Applications({ data }: ApplicationsProps) {
  const { daily, monthlyTrend, summary, statusDistribution } = data;

  // Convert daily stats to array and sort by date
  const dailyDataArray = useMemo(() => {
    const entries = Object.entries(daily).map(([date, stats]) => ({
      date,
      applications: stats.totalApplications,
      companies: stats.uniqueCompanies.size,
      rejections: stats.rejections,
      interviews: stats.interviews || 0,
      offers: stats.offers || 0,
    }));

    // Sort by date - no filtering, global filter handles this
    entries.sort((a, b) => a.date.localeCompare(b.date));

    return entries;
  }, [daily]);

  // Format data for charts
  const chartData = dailyDataArray.map(item => ({
    ...item,
    label: format(new Date(item.date), 'MMM d'),
  }));

  // Calculate cumulative applications
  const cumulativeData = useMemo(() => {
    let cumulative = 0;
    return chartData.map(item => {
      cumulative += item.applications;
      return {
        ...item,
        cumulative,
      };
    });
  }, [chartData]);

  // Response time data
  const responseData = Object.entries(data.responseTimeDistribution).map(([range, count]) => ({
    range,
    count,
  }));

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

  if (dailyDataArray.length === 0) {
    return <EmptyState title="No Application Data" description="No application history available" />;
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Avg Response Time"
          value={summary.avgResponseTime || 0}
          suffix="days"
          subtitle="Time to hear back"
        />
        <StatCard
          title="Interview Rate"
          value={conversionMetrics?.interviewRate || '0'}
          suffix="%"
          subtitle="Of total applications"
        />
        <StatCard
          title="Success Rate"
          value={summary.successRate || 0}
          format="percentage"
          subtitle="Interviews + Offers"
        />
        <StatCard
          title="Offer Rate"
          value={conversionMetrics?.offerRate || '0'}
          suffix="%"
          subtitle="Of total applications"
        />
      </div>

      {/* Daily Applications Trend */}
      <ChartContainer
        title="Daily Application Activity"
        description="Applications, unique companies, and rejections per day"
        chartId="daily-applications-chart"
        exportData={{
          name: 'Daily Applications',
          data: chartData,
          headers: ['date', 'applications', 'companies', 'rejections'],
        }}
      >
        <ResponsiveContainer width="100%" height={350}>
          <ComposedChart data={chartData}>
            <defs>
              <linearGradient id="colorApps" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorCompanies" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
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
            <Legend />
            <Bar dataKey="applications" fill="#6366f1" name="Applications" radius={[4, 4, 0, 0]} />
            <Bar dataKey="companies" fill="#10b981" name="Companies" radius={[4, 4, 0, 0]} />
            <Line
              type="monotone"
              dataKey="rejections"
              stroke="#ef4444"
              strokeWidth={2}
              name="Rejections"
              dot={{ r: 3 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartContainer>

      {/* Cumulative Progress, Response Time, and Monthly Volume */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cumulative Applications */}
        <ChartContainer
          title="Cumulative Progress"
          description="Total applications over time"
          chartId="cumulative-chart"
          exportData={{
            name: 'Cumulative Applications',
            data: cumulativeData,
            headers: ['date', 'cumulative'],
          }}
        >
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={cumulativeData}>
              <defs>
                <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
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
                dataKey="cumulative"
                stroke="#3b82f6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorCumulative)"
                name="Total Applications"
              />
            </AreaChart>
          </ResponsiveContainer>
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

      {/* Response Time Distribution */}
      <ChartContainer
        title="Response Time Distribution"
        description="How long it takes to hear back"
        chartId="response-time-chart"
        exportData={{
          name: 'Response Time',
          data: responseData,
          headers: ['range', 'count'],
        }}
      >
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={responseData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
            <XAxis
              dataKey="range"
              stroke="#8b949e"
              style={{ fontSize: '11px' }}
              angle={-45}
              textAnchor="end"
              height={80}
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
            <Bar dataKey="count" fill="#f59e0b" name="Applications" radius={[4, 4, 0, 0]} />
          </ComposedChart>
        </ResponsiveContainer>
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
