// Chart Container with Export Functionality

'use client';

import { useState } from 'react';
import { exportToCSV, exportChartToPNG } from '@/utils/export';
import { ChartData } from '@/types/analytics';

type ChartContainerProps = {
  title: string;
  children: React.ReactNode;
  exportData?: ChartData;
  chartId?: string;
  description?: string;
  actions?: React.ReactNode;
};

export default function ChartContainer({
  title,
  children,
  exportData,
  chartId,
  description,
  actions,
}: ChartContainerProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExportCSV = () => {
    if (exportData) {
      exportToCSV(exportData);
    }
  };

  const handleExportPNG = async () => {
    if (chartId) {
      setIsExporting(true);
      await exportChartToPNG(chartId, title);
      setIsExporting(false);
    }
  };

  return (
    <div className="rounded-lg border border-default bg-black/40 backdrop-blur p-4 sm:p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold">{title}</h3>
          {description && (
            <p className="text-xs text-muted mt-1">{description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 ml-4">
          {actions}
          {(exportData || chartId) && (
            <div className="relative group">
              <button
                className="p-2 rounded-md bg-white/5 hover:bg-white/10 transition-colors"
                title="Export options"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                  />
                </svg>
              </button>
              <div className="absolute right-0 top-full mt-1 w-40 bg-gray-900 border border-default rounded-lg shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                {exportData && (
                  <button
                    onClick={handleExportCSV}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-white/5 rounded-t-lg transition-colors"
                  >
                    Export CSV
                  </button>
                )}
                {chartId && (
                  <button
                    onClick={handleExportPNG}
                    disabled={isExporting}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-white/5 rounded-b-lg transition-colors disabled:opacity-50"
                  >
                    {isExporting ? 'Exporting...' : 'Export PNG'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      <div id={chartId}>
        {children}
      </div>
    </div>
  );
}
