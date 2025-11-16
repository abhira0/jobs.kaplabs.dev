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

  // Prepare Sankey diagram data
  const sankeyData = useMemo(() => {
    const colorMap: Record<string, string> = {
      'Saved': '#6366f1',
      'Applied': '#3b82f6',
      'Ghosted': '#64748b',
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

    // Create links for the flow
    const links = [];

    // Applied -> Ghosted (those with no response)
    const ghostedStage = applicationFunnel.find(s => s.name === 'Ghosted');
    if (ghostedStage && ghostedStage.value > 0) {
      links.push({
        source: 'Applied',
        target: 'Ghosted',
        value: ghostedStage.value,
        color: colorMap['Ghosted'] || '#64748b',
      });
    }

    // Applied -> Screen
    const screenStage = applicationFunnel.find(s => s.name === 'Screen');
    if (screenStage && screenStage.value > 0) {
      links.push({
        source: 'Applied',
        target: 'Screen',
        value: screenStage.value,
        color: colorMap['Screen'] || '#f59e0b',
      });
    }

    // Screen -> Interviewing
    const interviewingStage = applicationFunnel.find(s => s.name === 'Interviewing');
    if (interviewingStage && interviewingStage.value > 0) {
      links.push({
        source: 'Screen',
        target: 'Interviewing',
        value: interviewingStage.value,
        color: colorMap['Interviewing'] || '#8b5cf6',
      });
    }

    // Interviewing -> Offer
    const offerStage = applicationFunnel.find(s => s.name === 'Offer');
    if (offerStage && offerStage.value > 0) {
      links.push({
        source: 'Interviewing',
        target: 'Offer',
        value: offerStage.value,
        color: colorMap['Offer'] || '#10b981',
      });
    }

    // Rejected can come from Applied, Screen, or Interviewing
    const rejectedStage = applicationFunnel.find(s => s.name === 'Rejected');
    if (rejectedStage && rejectedStage.value > 0) {
      links.push({
        source: 'Applied',
        target: 'Rejected',
        value: rejectedStage.value,
        color: colorMap['Rejected'] || '#ef4444',
      });
    }

    // Offer -> Accepted
    const acceptedStage = applicationFunnel.find(s => s.name === 'Accepted');
    if (acceptedStage && acceptedStage.value > 0) {
      links.push({
        source: 'Offer',
        target: 'Accepted',
        value: acceptedStage.value,
        color: colorMap['Accepted'] || '#22c55e',
      });
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
