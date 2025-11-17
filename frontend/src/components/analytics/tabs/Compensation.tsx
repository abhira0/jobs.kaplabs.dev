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

  // Prepare salary distribution data - only showing all positions
  const salaryData = Object.entries(salary.all).map(([range, count]) => ({
    range: `$${range}K`,
    positions: count,
  })).filter(item => item.positions > 0);

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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          title="Positions with Salary Data"
          value={salary.allTotal}
          subtitle="All positions with compensation information"
          format="number"
        />
        <StatCard
          title="Average Salary Range"
          value={avgRange}
          prefix="$"
          suffix="K"
          subtitle="Estimated midpoint across all positions"
        />
      </div>

      {/* Salary Distribution */}
      <ChartContainer
        title="Salary Distribution"
        description="Distribution of positions across salary ranges"
        chartId="salary-distribution-chart"
        exportData={{
          name: 'Salary Distribution',
          data: salaryData,
          headers: ['range', 'positions'],
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
            <Bar
              dataKey="positions"
              fill="#3b82f6"
              name="Positions"
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
                <th className="text-right py-3 px-4 text-sm font-medium text-muted">Positions</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-muted">% of Total</th>
              </tr>
            </thead>
            <tbody>
              {salaryData.map((item, idx) => (
                <tr key={idx} className="border-b border-default/50 hover:bg-white/5 transition-colors">
                  <td className="py-3 px-4 text-sm font-medium">{item.range}</td>
                  <td className="text-right py-3 px-4 text-sm">{item.positions}</td>
                  <td className="text-right py-3 px-4 text-sm text-muted">
                    {((item.positions / salary.allTotal) * 100).toFixed(1)}%
                  </td>
                </tr>
              ))}
              <tr className="border-t-2 border-default font-semibold">
                <td className="py-3 px-4 text-sm">Total</td>
                <td className="text-right py-3 px-4 text-sm">{salary.allTotal}</td>
                <td className="text-right py-3 px-4 text-sm">100%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </ChartContainer>
    </div>
  );
}
