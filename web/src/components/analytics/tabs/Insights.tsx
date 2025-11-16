// Insights Tab - Application Flow and Conversion Metrics

'use client';

import { useMemo } from 'react';
import { ProcessedAnalyticsData } from '@/types/analytics';
import ChartContainer from '../ChartContainer';
import StatCard from '../StatCard';
import EmptyState from '../EmptyState';
import dynamic from 'next/dynamic';

// Dynamically import Nivo Sankey to avoid SSR issues
const ResponsiveSankey = dynamic(
  () => import('@nivo/sankey').then((mod) => mod.ResponsiveSankey),
  { ssr: false }
);

type InsightsProps = {
  data: ProcessedAnalyticsData;
};

export default function Insights({ data }: InsightsProps) {
  const { summary, applicationFunnel, statusDistribution } = data;

  // Prepare Sankey diagram data
  const sankeyData = useMemo(() => {
    // Create nodes for each stage
    const nodes = applicationFunnel.map(stage => ({
      id: stage.name,
      nodeColor: getStageColor(stage.name),
    }));

    // Create links between sequential stages based on actual flow
    const links = [];

    // Applied -> Screen
    if (applicationFunnel.find(s => s.name === 'Screen')?.value > 0) {
      links.push({
        source: 'Applied',
        target: 'Screen',
        value: applicationFunnel.find(s => s.name === 'Screen')?.value || 0,
      });
    }

    // Applied -> Rejected (those who got rejected without screen)
    const totalRejected = applicationFunnel.find(s => s.name === 'Rejected')?.value || 0;
    const screenedThenRejected = Math.min(
      applicationFunnel.find(s => s.name === 'Screen')?.value || 0,
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
    if (applicationFunnel.find(s => s.name === 'Interviewing')?.value > 0) {
      links.push({
        source: 'Screen',
        target: 'Interviewing',
        value: applicationFunnel.find(s => s.name === 'Interviewing')?.value || 0,
      });
    }

    // Screen -> Rejected
    if (screenedThenRejected > 0) {
      const interviewingCount = applicationFunnel.find(s => s.name === 'Interviewing')?.value || 0;
      const screenToRejected = Math.max(0, (applicationFunnel.find(s => s.name === 'Screen')?.value || 0) - interviewingCount);

      if (screenToRejected > 0) {
        links.push({
          source: 'Screen',
          target: 'Rejected',
          value: screenToRejected,
        });
      }
    }

    // Interviewing -> Offer
    if (applicationFunnel.find(s => s.name === 'Offer')?.value > 0) {
      links.push({
        source: 'Interviewing',
        target: 'Offer',
        value: applicationFunnel.find(s => s.name === 'Offer')?.value || 0,
      });
    }

    // Interviewing -> Rejected
    const interviewingCount = applicationFunnel.find(s => s.name === 'Interviewing')?.value || 0;
    const offerCount = applicationFunnel.find(s => s.name === 'Offer')?.value || 0;
    const interviewToRejected = Math.max(0, interviewingCount - offerCount);

    if (interviewToRejected > 0) {
      links.push({
        source: 'Interviewing',
        target: 'Rejected',
        value: interviewToRejected,
      });
    }

    // Offer -> Accepted
    if (applicationFunnel.find(s => s.name === 'Accepted')?.value > 0) {
      links.push({
        source: 'Offer',
        target: 'Accepted',
        value: applicationFunnel.find(s => s.name === 'Accepted')?.value || 0,
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

  if (summary.totalApps === 0) {
    return <EmptyState title="No Insights Data" description="No applications to analyze yet" />;
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Overall Success Rate"
          value={successRate.toFixed(1)}
          suffix="%"
          subtitle="Interviews + Offers"
        />
        <StatCard
          title="Screen Rate"
          value={conversionMetrics ? conversionMetrics[1].percentage.toFixed(1) : '0'}
          suffix="%"
          subtitle="Made it to screening"
        />
        <StatCard
          title="Interview Rate"
          value={conversionMetrics ? conversionMetrics[2].percentage.toFixed(1) : '0'}
          suffix="%"
          subtitle="Made it to interview"
        />
        <StatCard
          title="Offer Rate"
          value={conversionMetrics ? conversionMetrics[3].percentage.toFixed(1) : '0'}
          suffix="%"
          subtitle="Received offers"
        />
      </div>

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

      {/* Success Insights */}
      <div className="rounded-lg border border-default bg-black/40 backdrop-blur p-6">
        <h3 className="text-lg font-semibold mb-4">Key Insights</h3>
        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5" />
            <div>
              <span className="font-medium">Success Rate: </span>
              <span className="text-muted">
                {successRate.toFixed(1)}% of your applications reached the interview or offer stage
              </span>
            </div>
          </div>
          {conversionMetrics && conversionMetrics[3].percentage > 0 && (
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5" />
              <div>
                <span className="font-medium">Offer Conversion: </span>
                <span className="text-muted">
                  {(
                    (conversionMetrics[3].count /
                    Math.max(conversionMetrics[2].count, 1)) *
                    100
                  ).toFixed(1)}% of interviews resulted in offers
                </span>
              </div>
            </div>
          )}
          {conversionMetrics && conversionMetrics[5].percentage > 50 && (
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5" />
              <div>
                <span className="font-medium">High Rejection Rate: </span>
                <span className="text-muted">
                  {conversionMetrics[5].percentage.toFixed(1)}% of applications were rejected.
                  Consider refining your application strategy or targeting.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper function to get stage color
function getStageColor(stageName: string): string {
  const colorMap: Record<string, string> = {
    'Saved': '#6366f1',
    'Applied': '#3b82f6',
    'Screen': '#f59e0b',
    'Interviewing': '#8b5cf6',
    'Offer': '#10b981',
    'Rejected': '#ef4444',
    'Accepted': '#22c55e',
  };

  return colorMap[stageName] || '#6366f1';
}
