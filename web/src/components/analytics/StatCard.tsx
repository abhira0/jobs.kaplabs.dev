// Stat Card Component for Analytics

import { formatNumber, formatPercentage } from '@/utils/export';

type StatCardProps = {
  title: string;
  value: number | string;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  icon?: React.ReactNode;
  format?: 'number' | 'percentage' | 'currency' | 'text';
  prefix?: string;
  suffix?: string;
};

export default function StatCard({
  title,
  value,
  subtitle,
  trend,
  icon,
  format = 'number',
  prefix,
  suffix,
}: StatCardProps) {
  const formatValue = (val: number | string): string => {
    if (typeof val === 'string') return val;

    switch (format) {
      case 'percentage':
        return formatPercentage(val);
      case 'currency':
        return `$${formatNumber(val)}`;
      case 'number':
        return formatNumber(val);
      default:
        return String(val);
    }
  };

  return (
    <div className="rounded-lg border border-default bg-black/40 backdrop-blur p-4 sm:p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-muted mb-1">{title}</p>
          <div className="flex items-baseline gap-2">
            {prefix && <span className="text-lg text-muted">{prefix}</span>}
            <p className="text-2xl sm:text-3xl font-semibold">
              {formatValue(value)}
            </p>
            {suffix && <span className="text-lg text-muted">{suffix}</span>}
          </div>
          {subtitle && (
            <p className="text-xs text-muted mt-1">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              <span
                className={`text-xs font-medium ${
                  trend.isPositive ? 'text-green-500' : 'text-red-500'
                }`}
              >
                {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
              </span>
              <span className="text-xs text-muted">vs last period</span>
            </div>
          )}
        </div>
        {icon && (
          <div className="ml-4 p-2 rounded-lg bg-white/5">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
