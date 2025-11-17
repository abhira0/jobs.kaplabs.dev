// Export Utilities for Analytics

import { saveAs } from 'file-saver';
import { ChartData } from '@/types/analytics';

// Export data to CSV
export const exportToCSV = (data: ChartData): void => {
  const { name, data: rows, headers } = data;

  if (!rows || rows.length === 0) {
    console.warn('No data to export');
    return;
  }

  // Generate headers from first row if not provided
  const csvHeaders = headers || Object.keys(rows[0]);

  // Create CSV content
  const csvContent = [
    csvHeaders.join(','),
    ...rows.map(row =>
      csvHeaders
        .map(header => {
          const value = row[header];
          // Handle values with commas or quotes
          if (value === null || value === undefined) return '';
          const stringValue = String(value);
          if (stringValue.includes(',') || stringValue.includes('"')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        })
        .join(',')
    ),
  ].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
  saveAs(blob, `${name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
};

// Export chart as PNG (using html2canvas)
export const exportChartToPNG = async (elementId: string, chartName: string): Promise<void> => {
  try {
    // Dynamically import html2canvas to reduce bundle size
    const html2canvas = (await import('html2canvas')).default;

    const element = document.getElementById(elementId);
    if (!element) {
      console.error(`Element with id ${elementId} not found`);
      return;
    }

    const canvas = await html2canvas(element, {
      backgroundColor: '#0b0c10',
      scale: 2, // Higher quality
    });

    canvas.toBlob(blob => {
      if (blob) {
        saveAs(blob, `${chartName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.png`);
      }
    });
  } catch (error) {
    console.error('Error exporting chart to PNG:', error);
  }
};

// Export data to JSON
export const exportToJSON = (data: unknown, name: string): void => {
  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8' });
  saveAs(blob, `${name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`);
};

// Format number with commas
export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('en-US').format(num);
};

// Format currency
export const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Format percentage
export const formatPercentage = (value: number, decimals: number = 1): string => {
  return `${value.toFixed(decimals)}%`;
};

// Format date
export const formatDate = (dateStr: string, options?: Intl.DateTimeFormatOptions): string => {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('en-US', options || { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
};

// Shorten large numbers (e.g., 1000 -> 1K)
export const shortenNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};
