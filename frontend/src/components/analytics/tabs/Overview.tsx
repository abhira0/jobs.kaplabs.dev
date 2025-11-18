// Overview Tab - Main Analytics Dashboard
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck

'use client';

import { useMemo } from 'react';
import { ProcessedAnalyticsData } from '@/types/analytics';
import StatCard from '../StatCard';
import ChartContainer from '../ChartContainer';
import EmptyState from '../EmptyState';
import dynamic from 'next/dynamic';
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

// Dynamically import Nivo Sankey to avoid SSR issues
const ResponsiveSankey = dynamic(
  () => import('@nivo/sankey').then((mod) => mod.ResponsiveSankey),
  { ssr: false }
);

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
    const funnel = applicationFunnel;

    // Create nodes for each stage, ensuring we have "Applied" as the starting node
    const allStageNames = ['Applied', ...funnel!.map(s => s.name)];
    const uniqueStages = Array.from(new Set(allStageNames));

    const nodes = uniqueStages.map(stageName => ({
      id: stageName,
      nodeColor: getStageColor(stageName),
    }));

    // Create links between sequential stages based on actual flow
    const links = [];

    // Applied -> Ghosted (no response)
    if (funnel!.find(s => s.name === 'Ghosted')?.value > 0) {
      links.push({
        source: 'Applied',
        target: 'Ghosted',
        value: funnel!.find(s => s.name === 'Ghosted')?.value || 0,
      });
    }

    // Applied -> Screen
    if (funnel!.find(s => s.name === 'Screen')?.value > 0) {
      links.push({
        source: 'Applied',
        target: 'Screen',
        value: funnel!.find(s => s.name === 'Screen')?.value || 0,
      });
    }

    // Applied -> Rejected (those who got rejected without screen)
    const totalRejected = funnel!.find(s => s.name === 'Rejected')?.value || 0;
    const screenedThenRejected = Math.min(
      funnel!.find(s => s.name === 'Screen')?.value || 0,
      totalRejected
    );
    const directlyRejected = totalRejected - screenedThenRejected;

    if (directlyRejected > 0) {
      links.push({
        source: 'Applied',
        target: 'Rejected',
        value: directlyRejected,
      });
    }

    // Screen -> Interviewing
    if (funnel!.find(s => s.name === 'Interviewing')?.value > 0) {
      links.push({
        source: 'Screen',
        target: 'Interviewing',
        value: funnel!.find(s => s.name === 'Interviewing')?.value || 0,
      });
    }

    // Screen -> Rejected
    if (screenedThenRejected > 0) {
      const interviewingCount = funnel!.find(s => s.name === 'Interviewing')?.value || 0;
      const screenToRejected = Math.max(0, (funnel!.find(s => s.name === 'Screen')?.value || 0) - interviewingCount);

      if (screenToRejected > 0) {
        links.push({
          source: 'Screen',
          target: 'Rejected',
          value: screenToRejected,
        });
      }
    }

    // Interviewing -> Offer
    if (funnel!.find(s => s.name === 'Offer')?.value > 0) {
      links.push({
        source: 'Interviewing',
        target: 'Offer',
        value: funnel!.find(s => s.name === 'Offer')?.value || 0,
      });
    }

    // Interviewing -> Rejected
    const interviewingCount = funnel!.find(s => s.name === 'Interviewing')?.value || 0;
    const offerCount = funnel!.find(s => s.name === 'Offer')?.value || 0;
    const interviewToRejected = Math.max(0, interviewingCount - offerCount);

    if (interviewToRejected > 0) {
      links.push({
        source: 'Interviewing',
        target: 'Rejected',
        value: interviewToRejected,
      });
    }

    // Offer -> Accepted
    if (funnel!.find(s => s.name === 'Accepted')?.value > 0) {
      links.push({
        source: 'Offer',
        target: 'Accepted',
        value: funnel!.find(s => s.name === 'Accepted')?.value || 0,
      });
    }

    return { nodes, links };
  }, [applicationFunnel]);

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

      {/* Key Conversion Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Screen Rate"
          value={conversionMetrics ? conversionMetrics[2].percentage.toFixed(1) : '0'}
          suffix="%"
          subtitle="Made it to screening"
        />
        <StatCard
          title="Interview Rate"
          value={conversionMetrics ? conversionMetrics[3].percentage.toFixed(1) : '0'}
          suffix="%"
          subtitle="Made it to interview"
        />
        <StatCard
          title="Offer Rate"
          value={conversionMetrics ? conversionMetrics[4].percentage.toFixed(1) : '0'}
          suffix="%"
          subtitle="Received offers"
        />
        <StatCard
          title="Ghosted Rate"
          value={conversionMetrics ? conversionMetrics[1].percentage.toFixed(1) : '0'}
          suffix="%"
          subtitle="No response"
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

      {/* Interactive Sankey Diagram */}
      <ChartContainer
        title="Application Flow Diagram"
        description="Interactive visualization of how applications move through different stages"
        chartId="sankey-flow-chart"
      >
        <div className="h-[500px]">
          <ResponsiveSankey
            data={sankeyData}
            margin={{ top: 20, right: 160, bottom: 20, left: 160 }}
            align="justify"
            colors={{ scheme: 'category10' }}
            nodeOpacity={1}
            nodeHoverOthersOpacity={0.35}
            nodeThickness={18}
            nodeSpacing={24}
            nodeBorderWidth={0}
            nodeBorderColor={{
              from: 'color',
              modifiers: [['darker', 0.8]],
            }}
            nodeBorderRadius={3}
            linkOpacity={0.5}
            linkHoverOthersOpacity={0.1}
            linkContract={3}
            enableLinkGradient={true}
            labelPosition="outside"
            labelOrientation="horizontal"
            labelPadding={16}
            labelTextColor={{
              from: 'color',
              modifiers: [['darker', 1]],
            }}
            theme={{
              text: {
                fill: '#ffffff',
                fontSize: 12,
              },
              tooltip: {
                container: {
                  background: '#0f1117',
                  color: '#ffffff',
                  fontSize: 12,
                  borderRadius: '8px',
                  border: '1px solid #21262d',
                },
              },
            }}
          />
        </div>
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

// Helper function to get stage color
function getStageColor(stageName: string): string {
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

  return colorMap[stageName] || '#6366f1';
}
