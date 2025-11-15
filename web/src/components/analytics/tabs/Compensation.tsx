// Compensation Tab - Salary Analytics

'use client';

import { ProcessedAnalyticsData } from '@/types/analytics';
import ChartContainer from '../ChartContainer';
import EmptyState from '../EmptyState';
import StatCard from '../StatCard';
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

type CompensationProps = {
  data: ProcessedAnalyticsData;
};

export default function Compensation({ data }: CompensationProps) {
  const { salary } = data;

  // Prepare salary distribution data
  const salaryData = Object.entries(salary.all).map(([range, count]) => ({
    range: `$${range}K`,
    all: count,
    hourly: salary.hourly[range as keyof typeof salary.hourly] || 0,
  })).filter(item => item.all > 0 || item.hourly > 0);

  // Calculate average ranges
  const avgSalaryRange = () => {
    const ranges = Object.entries(salary.all);
    let totalJobs = 0;
    let weightedSum = 0;

    ranges.forEach(([range, count]) => {
      if (count === 0) return;
      totalJobs += count;

      // Get midpoint of range
      let midpoint: number;
      if (range === '100+') {
        midpoint = 125; // Assume $125K for 100+
      } else {
        const [min, max] = range.split('-').map(Number);
        midpoint = (min + max) / 2;
      }

      weightedSum += midpoint * count;
    });

    return totalJobs > 0 ? Math.round(weightedSum / totalJobs) : 0;
  };

  const avgRange = avgSalaryRange();

  if (salary.allTotal === 0) {
    return (
      <EmptyState
        title="No Salary Data"
        description="No salary information available for your applications"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Jobs with Salary Info"
          value={salary.allTotal}
          format="number"
        />
        <StatCard
          title="Hourly/Short-term Jobs"
          value={salary.hourlyTotal}
          subtitle={`${Math.round((salary.hourlyTotal / salary.allTotal) * 100)}% of total`}
          format="number"
        />
        <StatCard
          title="Average Salary Range"
          value={avgRange}
          prefix="$"
          suffix="K"
          subtitle="Estimated midpoint"
        />
      </div>

      {/* Salary Distribution Comparison */}
      <ChartContainer
        title="Salary Distribution"
        description="Comparison of all positions vs hourly/short-term only"
        chartId="salary-distribution-chart"
        exportData={{
          name: 'Salary Distribution',
          data: salaryData,
          headers: ['range', 'all', 'hourly'],
        }}
      >
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={salaryData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
            <XAxis
              dataKey="range"
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
            <Bar
              dataKey="all"
              fill="#3b82f6"
              name="All Positions"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="hourly"
              fill="#10b981"
              name="Hourly/Short-term"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>

      {/* Salary Range Breakdown Table */}
      <ChartContainer
        title="Detailed Breakdown"
        description="Distribution across salary ranges"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-default">
                <th className="text-left py-3 px-4 text-sm font-medium text-muted">Salary Range</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-muted">All Positions</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-muted">Hourly/Short-term</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-muted">% of Total</th>
              </tr>
            </thead>
            <tbody>
              {salaryData.map((item, idx) => (
                <tr key={idx} className="border-b border-default/50 hover:bg-white/5 transition-colors">
                  <td className="py-3 px-4 text-sm font-medium">{item.range}</td>
                  <td className="text-right py-3 px-4 text-sm">{item.all}</td>
                  <td className="text-right py-3 px-4 text-sm">{item.hourly}</td>
                  <td className="text-right py-3 px-4 text-sm text-muted">
                    {((item.all / salary.allTotal) * 100).toFixed(1)}%
                  </td>
                </tr>
              ))}
              <tr className="border-t-2 border-default font-semibold">
                <td className="py-3 px-4 text-sm">Total</td>
                <td className="text-right py-3 px-4 text-sm">{salary.allTotal}</td>
                <td className="text-right py-3 px-4 text-sm">{salary.hourlyTotal}</td>
                <td className="text-right py-3 px-4 text-sm">100%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </ChartContainer>
    </div>
  );
}
