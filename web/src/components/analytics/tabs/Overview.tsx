// Overview Tab - Main Analytics Dashboard

'use client';

import { useMemo } from 'react';
import { ProcessedAnalyticsData } from '@/types/analytics';
import StatCard from '../StatCard';
import ChartContainer from '../ChartContainer';
import EmptyState from '../EmptyState';
import SankeyDiagram from '../SankeyDiagram';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

type OverviewProps = {
  data: ProcessedAnalyticsData;
};

export default function Overview({ data }: OverviewProps) {
  const { summary, weeklyTrend, statusDistribution, dayOfWeek, applicationFunnel } = data;

  // Prepare data for charts
  const statusData = Object.entries(statusDistribution)
    .filter(([, value]) => value > 0)
    .map(([status, value]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value,
    }));

  const dayOfWeekData = Object.entries(dayOfWeek).map(([day, value]) => ({
    day,
    applications: value,
  }));

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

  // Prepare Sankey diagram data
  const sankeyData = useMemo(() => {
    const colorMap: Record<string, string> = {
      'Saved': '#6366f1',
      'Applied': '#3b82f6',
      'Screen': '#f59e0b',
      'Interviewing': '#8b5cf6',
      'Offer': '#10b981',
      'Rejected': '#ef4444',
      'Accepted': '#22c55e',
    };

    const nodes = applicationFunnel.map(stage => ({
      name: stage.name,
      value: stage.value,
      color: colorMap[stage.name] || '#6366f1',
    }));

    // Create links between sequential stages
    const links = [];
    for (let i = 0; i < applicationFunnel.length - 1; i++) {
      const current = applicationFunnel[i];
      const next = applicationFunnel[i + 1];

      // Only create link if there's flow (next stage has values)
      if (next.value > 0) {
        links.push({
          source: current.name,
          target: next.name,
          value: next.value,
          color: colorMap[next.name] || '#6366f1',
        });
      }
    }

    return { nodes, links };
  }, [applicationFunnel]);

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
          value={summary.successRate || 0}
          subtitle="Interviews + Offers"
          format="percentage"
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
          </AreaChart>
        </ResponsiveContainer>
      </ChartContainer>

      {/* Application Funnel - Sankey Diagram */}
      <ChartContainer
        title="Application Funnel"
        description="Flow of applications through different stages"
        chartId="application-funnel-chart"
        exportData={{
          name: 'Application Funnel',
          data: applicationFunnel,
          headers: ['name', 'value', 'percentage'],
        }}
      >
        <SankeyDiagram nodes={sankeyData.nodes} links={sankeyData.links} />
      </ChartContainer>

      {/* Status Distribution and Day of Week */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <ChartContainer
          title="Application Status"
          description="Current status of all applications"
          chartId="status-distribution-chart"
          exportData={{
            name: 'Status Distribution',
            data: statusData,
            headers: ['name', 'value'],
          }}
        >
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f1117',
                    border: '1px solid #21262d',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState title="No Status Data" description="No application statuses recorded" />
          )}
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
    </div>
  );
}
