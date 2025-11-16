// Analytics Data Types

export type StatusEvent = {
  status: 'applied' | 'rejected' | 'interviewing' | 'offer' | 'accepted' | 'withdrawn' | string;
  timestamp: string; // ISO timestamp
};

export type Coordinate = [number, number, string]; // [lat, lng, location_name]

export type SimplifyJob = {
  company_id: string;
  company_name?: string;
  title?: string;
  job_posting_location?: string;
  coordinates?: Coordinate[];
  salary?: number;
  salary_period?: number; // 1=hourly, 2=daily, 3=weekly, 4=biweekly, 5=monthly, 6=yearly
  tracked_date?: string; // ISO timestamp
  status_events?: StatusEvent[];
  url?: string;
  date_posted?: string;
};

// Summary Statistics
export type SummaryStats = {
  todayApps: number;
  totalApps: number;
  todayCompanies: number;
  totalCompanies: number;
  todayRejections: number;
  totalRejections: number;
  successRate?: number;
  avgResponseTime?: number; // in days
};

// Salary Data
export type SalaryRange = '0-20' | '21-30' | '31-40' | '41-50' | '51-60' | '61-70' | '71-80' | '81-100' | '100+';

export type SalaryRangeData = Record<SalaryRange, number>;

export type SalaryData = {
  hourly: SalaryRangeData;
  all: SalaryRangeData;
  hourlyTotal: number;
  allTotal: number;
};

// Daily Statistics
export type DailyStats = {
  totalApplications: number;
  uniqueCompanies: Set<string>;
  rejections: number;
  interviews?: number;
  offers?: number;
};

export type DailyStatsMap = Record<string, DailyStats>; // date string -> stats

// Location Data
export type LocationData = {
  count: number;
  name: string;
  coords: [number, number];
  key: string;
};

export type LocationStats = {
  locations: LocationData[];
  remoteCount: number;
  hybridCount: number;
  totalCount: number;
};

// Application Status Distribution
export type StatusDistribution = {
  applied: number;
  rejected: number;
  interviewing: number;
  offer: number;
  accepted: number;
  withdrawn: number;
  pending: number; // applied but no response
};

// Company Statistics
export type CompanyStats = {
  company_id: string;
  company_name?: string;
  totalApplications: number;
  rejections: number;
  interviews: number;
  offers: number;
  successRate: number;
  avgResponseTime?: number;
};

// Day of Week Statistics
export type DayOfWeekStats = {
  Monday: number;
  Tuesday: number;
  Wednesday: number;
  Thursday: number;
  Friday: number;
  Saturday: number;
  Sunday: number;
};

// Response Time Distribution
export type ResponseTimeRange = '0-7' | '8-14' | '15-30' | '31-60' | '60+' | 'No Response';
export type ResponseTimeDistribution = Record<ResponseTimeRange, number>;

// Trend Data (for time series)
export type TrendDataPoint = {
  date: string;
  value: number;
  label?: string;
};

// Complete Processed Analytics Data
export type ProcessedAnalyticsData = {
  summary: SummaryStats;
  salary: SalaryData;
  daily: DailyStatsMap;
  location: LocationStats;
  statusDistribution: StatusDistribution;
  topCompanies: CompanyStats[];
  dayOfWeek: DayOfWeekStats;
  responseTimeDistribution: ResponseTimeDistribution;
  weeklyTrend: TrendDataPoint[];
  monthlyTrend: TrendDataPoint[];
  successRateTrend: TrendDataPoint[];
};

// Filter Options
export type DateRange = '7d' | '14d' | '30d' | '60d' | '90d' | 'all' | 'custom';

export type AnalyticsFilters = {
  dateRange: DateRange;
  customStartDate?: string;
  customEndDate?: string;
  companies?: string[];
  locations?: string[];
  salaryMin?: number;
  salaryMax?: number;
  statuses?: string[];
};

// Chart Export Types
export type ExportFormat = 'csv' | 'png' | 'json';

export type ChartData = {
  name: string;
  data: Record<string, string | number>[];
  headers?: string[];
};

// Snapshot Types
export type Snapshot = {
  id: string;
  username: string;
  name: string;
  description?: string;
  created_at: string;
  data_count: number;
  filters?: AnalyticsFilters;
};

export type SnapshotWithData = {
  id: string;
  username: string;
  name: string;
  description?: string;
  created_at: string;
  data: SimplifyJob[];
  filters?: AnalyticsFilters;
};

export type SnapshotCreate = {
  name: string;
  description?: string;
  filters?: AnalyticsFilters;
};
