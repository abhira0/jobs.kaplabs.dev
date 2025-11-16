// Analytics Data Processing Utilities

import {
  SimplifyJob,
  SummaryStats,
  SalaryData,
  SalaryRange,
  SalaryRangeData,
  DailyStatsMap,
  LocationStats,
  StatusDistribution,
  CompanyStats,
  DayOfWeekStats,
  ResponseTimeDistribution,
  ResponseTimeRange,
  TrendDataPoint,
  ProcessedAnalyticsData,
  AnalyticsFilters,
} from '@/types/analytics';
import { differenceInDays, format, startOfWeek, startOfMonth } from 'date-fns';

// Helper: Convert UTC timestamp to local date string
const getLocalDateStr = (timestamp: string | undefined): string | null => {
  if (!timestamp) return null;
  const utcDate = new Date(timestamp + 'Z'); // Adding Z suffix to explicitly mark as UTC
  const localDate = new Date(utcDate.getTime() - utcDate.getTimezoneOffset() * 60000);
  return localDate.toISOString().split('T')[0];
};

// Helper: Validate coordinates
const isValidCoordinate = (lat: number, lng: number): boolean => {
  return !isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
};

// Helper: Get salary range
const getSalaryRange = (salary: number): SalaryRange => {
  if (salary <= 20) return '0-20';
  if (salary <= 30) return '21-30';
  if (salary <= 40) return '31-40';
  if (salary <= 50) return '41-50';
  if (salary <= 60) return '51-60';
  if (salary <= 70) return '61-70';
  if (salary <= 80) return '71-80';
  if (salary <= 100) return '81-100';
  return '100+';
};

// Helper: Normalize status to string (handle legacy numeric status codes)
const normalizeStatus = (status: string | number): string => {
  // If already a string, return lowercase
  if (typeof status === 'string') {
    return status.toLowerCase();
  }

  // Handle legacy numeric status codes from backend
  // These should be fixed in the backend, but this provides backwards compatibility
  const statusMap: Record<number, string> = {
    1: 'saved',
    2: 'applied',
    3: 'phone screen',
    4: 'technical screen',
    5: 'onsite',
    6: 'offer',
    7: 'accepted',
    8: 'declined',
    9: 'withdrawn',
    11: 'screen',
    12: 'interviewing',
    23: 'rejected',
  };

  return statusMap[status] || `unknown_${status}`;
};

// Helper: Get day of week name
const getDayOfWeek = (dateStr: string): keyof DayOfWeekStats => {
  const days: (keyof DayOfWeekStats)[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const date = new Date(dateStr);
  return days[date.getDay()];
};

// Helper: Calculate response time in days
const calculateResponseTime = (appliedDate: string, responseDate: string): number => {
  const applied = new Date(appliedDate);
  const response = new Date(responseDate);
  return differenceInDays(response, applied);
};

// Helper: Get response time range
const getResponseTimeRange = (days: number): ResponseTimeRange => {
  if (days <= 7) return '0-7';
  if (days <= 14) return '8-14';
  if (days <= 30) return '15-30';
  if (days <= 60) return '31-60';
  return '60+';
};

// Apply filters to data
export const applyFilters = (data: SimplifyJob[], filters: AnalyticsFilters): SimplifyJob[] => {
  return data.filter(job => {
    // Date range filter
    if (filters.dateRange !== 'all') {
      const appliedEvent = job.status_events?.find(e => normalizeStatus(e.status) === 'applied');
      if (appliedEvent) {
        const appliedDate = new Date(getLocalDateStr(appliedEvent.timestamp) || '');
        const today = new Date();
        let startDate = new Date();

        if (filters.dateRange === 'custom' && filters.customStartDate && filters.customEndDate) {
          startDate = new Date(filters.customStartDate);
          const endDate = new Date(filters.customEndDate);
          if (appliedDate < startDate || appliedDate > endDate) return false;
        } else {
          const daysMap = { '7d': 7, '14d': 14, '30d': 30, '60d': 60, '90d': 90 };
          const days = daysMap[filters.dateRange as keyof typeof daysMap] || 0;
          startDate.setDate(today.getDate() - days);
          if (appliedDate < startDate) return false;
        }
      }
    }

    // Company filter
    if (filters.companies && filters.companies.length > 0) {
      if (!filters.companies.includes(job.company_id)) return false;
    }

    // Location filter
    if (filters.locations && filters.locations.length > 0) {
      const location = job.job_posting_location?.toLowerCase() || '';
      const matchesLocation = filters.locations.some(loc => location.includes(loc.toLowerCase()));
      if (!matchesLocation) return false;
    }

    // Salary filter
    if (job.salary) {
      if (filters.salaryMin && job.salary < filters.salaryMin) return false;
      if (filters.salaryMax && job.salary > filters.salaryMax) return false;
    }

    // Status filter
    if (filters.statuses && filters.statuses.length > 0) {
      const hasStatus = job.status_events?.some(e => filters.statuses?.includes(normalizeStatus(e.status)));
      if (!hasStatus) return false;
    }

    return true;
  });
};

// Process Summary Statistics
const processSummaryStats = (data: SimplifyJob[]): SummaryStats => {
  const today = new Date().toISOString().split('T')[0];

  const appliedJobs = data.filter(job =>
    job.status_events?.some(event => normalizeStatus(event.status) === 'applied')
  );

  const totalApps = appliedJobs.length;

  const todayApps = appliedJobs.filter(job =>
    job.status_events?.some(
      event => normalizeStatus(event.status) === 'applied' && getLocalDateStr(event.timestamp)?.startsWith(today)
    )
  ).length;

  const totalCompanies = new Set(appliedJobs.map(job => job.company_id)).size;

  const todayCompanies = new Set(
    appliedJobs
      .filter(job =>
        job.status_events?.some(
          event => normalizeStatus(event.status) === 'applied' && getLocalDateStr(event.timestamp)?.startsWith(today)
        )
      )
      .map(job => job.company_id)
  ).size;

  let totalRejections = 0;
  let todayRejections = 0;
  let totalInterviews = 0;
  let totalOffers = 0;
  const totalResponseTimes: number[] = [];

  data.forEach(job => {
    const appliedEvent = job.status_events?.find(e => normalizeStatus(e.status) === 'applied');
    const appliedDate = appliedEvent ? getLocalDateStr(appliedEvent.timestamp) : null;

    job.status_events?.forEach(event => {
      const eventStatus = normalizeStatus(event.status);
      if (eventStatus === 'rejected') {
        totalRejections++;
        if (getLocalDateStr(event.timestamp)?.startsWith(today)) {
          todayRejections++;
        }
        // Calculate response time
        if (appliedDate) {
          const responseTime = calculateResponseTime(appliedDate, getLocalDateStr(event.timestamp) || '');
          totalResponseTimes.push(responseTime);
        }
      }
      // Count all interview-related statuses
      if (eventStatus === 'interviewing' || eventStatus === 'phone screen' ||
          eventStatus === 'technical screen' || eventStatus === 'onsite' ||
          eventStatus === 'screen') {
        totalInterviews++;
      }
      // Count all offer-related statuses
      if (eventStatus === 'offer' || eventStatus === 'accepted' || eventStatus === 'declined') {
        totalOffers++;
      }
    });
  });

  const successRate = totalApps > 0 ? ((totalInterviews + totalOffers) / totalApps) * 100 : 0;
  const avgResponseTime =
    totalResponseTimes.length > 0
      ? totalResponseTimes.reduce((a, b) => a + b, 0) / totalResponseTimes.length
      : 0;

  return {
    todayApps,
    totalApps,
    todayCompanies,
    totalCompanies,
    todayRejections,
    totalRejections,
    successRate: Math.round(successRate * 10) / 10,
    avgResponseTime: Math.round(avgResponseTime),
  };
};

// Process Salary Data
const processSalaryData = (data: SimplifyJob[]): SalaryData => {
  const initRanges = (): SalaryRangeData => ({
    '0-20': 0,
    '21-30': 0,
    '31-40': 0,
    '41-50': 0,
    '51-60': 0,
    '61-70': 0,
    '71-80': 0,
    '81-100': 0,
    '100+': 0,
  });

  const hourly = initRanges();
  const all = initRanges();

  data.forEach(job => {
    if (!job.salary) return;

    const range = getSalaryRange(job.salary);
    all[range]++;

    // salary_period <= 3 means hourly, daily, or weekly
    if (job.salary_period && job.salary_period <= 3) {
      hourly[range]++;
    }
  });

  return {
    hourly,
    all,
    hourlyTotal: Object.values(hourly).reduce((a, b) => a + b, 0),
    allTotal: Object.values(all).reduce((a, b) => a + b, 0),
  };
};

// Process Daily Data
const processDailyData = (data: SimplifyJob[], filters?: AnalyticsFilters): DailyStatsMap => {
  const dailyStats: DailyStatsMap = {};

  // Determine the end date (latest date to show)
  let endDate = new Date();
  if (filters?.dateRange === 'custom' && filters.customEndDate) {
    endDate = new Date(filters.customEndDate);
  }
  endDate.setUTCHours(0, 0, 0, 0);

  // Determine the start date (earliest date to show)
  let startDate = new Date();
  if (filters?.dateRange === 'custom' && filters.customStartDate) {
    startDate = new Date(filters.customStartDate);
  } else if (filters?.dateRange && filters.dateRange !== 'all') {
    const daysMap = { '7d': 7, '14d': 14, '30d': 30, '60d': 60, '90d': 90 };
    const days = daysMap[filters.dateRange as keyof typeof daysMap] || 0;
    startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - days);
  } else {
    // Find earliest date in data
    startDate = new Date();
    data.forEach(job => {
      if (!job.tracked_date) return;
      const jobDate = new Date(job.tracked_date);
      jobDate.setUTCHours(0, 0, 0, 0);
      if (jobDate < startDate) {
        startDate = jobDate;
      }
    });
  }
  startDate.setUTCHours(0, 0, 0, 0);

  // Initialize all dates from start to end
  const currentDate = new Date(endDate);
  while (currentDate >= startDate) {
    const dateStr = currentDate.toISOString().split('T')[0];
    dailyStats[dateStr] = {
      totalApplications: 0,
      uniqueCompanies: new Set(),
      rejections: 0,
      interviews: 0,
      offers: 0,
    };
    currentDate.setUTCDate(currentDate.getUTCDate() - 1);
  }

  // Process status events
  data.forEach(job => {
    job.status_events?.forEach(event => {
      const eventDate = getLocalDateStr(event.timestamp);
      if (!eventDate || !dailyStats[eventDate]) return;

      const eventStatus = normalizeStatus(event.status);
      if (eventStatus === 'applied') {
        dailyStats[eventDate].totalApplications++;
        dailyStats[eventDate].uniqueCompanies.add(job.company_id);
      }
      if (eventStatus === 'rejected') {
        dailyStats[eventDate].rejections++;
      }
      // Count all interview-related statuses
      if (eventStatus === 'interviewing' || eventStatus === 'phone screen' ||
          eventStatus === 'technical screen' || eventStatus === 'onsite' ||
          eventStatus === 'screen') {
        dailyStats[eventDate].interviews = (dailyStats[eventDate].interviews || 0) + 1;
      }
      // Count all offer-related statuses
      if (eventStatus === 'offer' || eventStatus === 'accepted' || eventStatus === 'declined') {
        dailyStats[eventDate].offers = (dailyStats[eventDate].offers || 0) + 1;
      }
    });
  });

  return dailyStats;
};

// Process Location Data
const processLocationData = (data: SimplifyJob[]): LocationStats => {
  const locationCounts = new Map<string, { count: number; name: string; coords: [number, number] }>();
  let remoteCount = 0;
  let hybridCount = 0;
  let totalCount = 0;

  data.forEach(job => {
    const location = job.job_posting_location;
    const coordinates = job.coordinates;

    if (!location) return;

    if (location.toLowerCase().includes('remote')) {
      remoteCount++;
      return;
    }
    if (location.toLowerCase().includes('hybrid')) {
      hybridCount++;
      return;
    }

    if (coordinates) {
      coordinates.forEach(coord => {
        const [lat, lng, name] = coord;
        if (isValidCoordinate(lat, lng)) {
          totalCount++;
          const key = `${lat},${lng}`;
          if (!locationCounts.has(key)) {
            locationCounts.set(key, {
              count: 0,
              name,
              coords: [lat, lng],
            });
          }
          const existing = locationCounts.get(key)!;
          existing.count++;
        }
      });
    }
  });

  return {
    locations: Array.from(locationCounts.entries()).map(([key, value]) => ({
      ...value,
      key,
    })),
    remoteCount,
    hybridCount,
    totalCount,
  };
};

// Process Status Distribution - Get CURRENT status of each job
const processStatusDistribution = (data: SimplifyJob[]): StatusDistribution => {
  const distribution: StatusDistribution = {
    applied: 0,
    rejected: 0,
    interviewing: 0,
    offer: 0,
    accepted: 0,
    withdrawn: 0,
    pending: 0,
  };

  data.forEach(job => {
    if (!job.status_events || job.status_events.length === 0) {
      return;
    }

    // Sort events by timestamp to get the latest status
    const sortedEvents = [...job.status_events].sort((a, b) =>
      b.timestamp.localeCompare(a.timestamp)
    );

    const latestEvent = sortedEvents[0];
    const currentStatus = normalizeStatus(latestEvent.status);

    // If latest status is "applied" with only one event, it's pending (no response yet)
    if (currentStatus === 'applied' && job.status_events.length === 1) {
      distribution.pending++;
    }
    // If latest status is "applied" but there are multiple events, check if there's a non-applied status
    else if (currentStatus === 'applied') {
      const hasOtherStatus = job.status_events.some(e => normalizeStatus(e.status) !== 'applied');
      if (hasOtherStatus) {
        // This shouldn't normally happen (applied shouldn't be latest if other statuses exist)
        // But if it does, count as pending
        distribution.pending++;
      } else {
        distribution.pending++;
      }
    }
    // Map status to distribution
    else if (currentStatus === 'rejected' || currentStatus === 'rejection') {
      distribution.rejected++;
    }
    // All interview stages count as interviewing
    else if (currentStatus === 'interviewing' || currentStatus === 'interview' ||
             currentStatus === 'phone screen' || currentStatus === 'technical screen' ||
             currentStatus === 'onsite' || currentStatus === 'screen') {
      distribution.interviewing++;
    }
    // Offers (received but not yet accepted/declined)
    else if (currentStatus === 'offer' || currentStatus === 'offered') {
      distribution.offer++;
    }
    else if (currentStatus === 'accepted') {
      distribution.accepted++;
    }
    else if (currentStatus === 'withdrawn' || currentStatus === 'withdraw' || currentStatus === 'declined') {
      distribution.withdrawn++;
    }
    else {
      // Unknown status, count as pending
      distribution.pending++;
    }
  });

  return distribution;
};

// Process Company Statistics
const processCompanyStats = (data: SimplifyJob[]): CompanyStats[] => {
  const companyMap = new Map<string, CompanyStats>();

  data.forEach(job => {
    // Skip jobs without company_id or status_events
    // NOTE: If Top Companies chart is empty, check that:
    // 1. Jobs have company_id field populated
    // 2. Jobs have status_events with at least an 'applied' status
    if (!job.company_id || !job.status_events || job.status_events.length === 0) return;

    if (!companyMap.has(job.company_id)) {
      companyMap.set(job.company_id, {
        company_id: job.company_id,
        company_name: job.company_name,
        totalApplications: 0,
        rejections: 0,
        interviews: 0,
        offers: 0,
        successRate: 0,
      });
    }

    const stats = companyMap.get(job.company_id)!;

    const hasApplied = job.status_events?.some(e => normalizeStatus(e.status) === 'applied');
    if (hasApplied) {
      stats.totalApplications++;
    }

    // Get current status (latest event)
    const sortedEvents = [...job.status_events].sort((a, b) =>
      b.timestamp.localeCompare(a.timestamp)
    );
    const currentStatus = normalizeStatus(sortedEvents[0].status);

    // Only count CURRENT status, not historical
    if (currentStatus === 'rejected' || currentStatus === 'rejection') {
      stats.rejections++;
    }
    // All interview stages
    if (currentStatus === 'interviewing' || currentStatus === 'interview' ||
        currentStatus === 'phone screen' || currentStatus === 'technical screen' ||
        currentStatus === 'onsite' || currentStatus === 'screen') {
      stats.interviews++;
    }
    // All offer stages
    if (currentStatus === 'offer' || currentStatus === 'offered' || currentStatus === 'accepted') {
      stats.offers++;
    }

    // Calculate response time (time from applied to current status)
    const appliedEvent = job.status_events?.find(e => normalizeStatus(e.status) === 'applied');
    const appliedDate = appliedEvent ? getLocalDateStr(appliedEvent.timestamp) : null;

    // Only calculate response time if there's a response (current status is not applied/pending)
    if (appliedDate && currentStatus !== 'applied' && sortedEvents[0]) {
      const responseDate = getLocalDateStr(sortedEvents[0].timestamp);
      if (responseDate) {
        const responseTime = calculateResponseTime(appliedDate, responseDate);
        if (!stats.avgResponseTime) {
          stats.avgResponseTime = responseTime;
        } else {
          // Running average
          const currentCount = stats.rejections + stats.interviews + stats.offers;
          stats.avgResponseTime = Math.round(
            (stats.avgResponseTime * (currentCount - 1) + responseTime) / currentCount
          );
        }
      }
    }
  });

  // Calculate success rates
  companyMap.forEach(stats => {
    if (stats.totalApplications > 0) {
      stats.successRate = Math.round(((stats.interviews + stats.offers) / stats.totalApplications) * 100);
    }
  });

  // Sort by total applications and return top companies
  return Array.from(companyMap.values())
    .sort((a, b) => b.totalApplications - a.totalApplications)
    .slice(0, 20); // Top 20 companies
};

// Process Day of Week Statistics
const processDayOfWeekStats = (data: SimplifyJob[]): DayOfWeekStats => {
  const stats: DayOfWeekStats = {
    Monday: 0,
    Tuesday: 0,
    Wednesday: 0,
    Thursday: 0,
    Friday: 0,
    Saturday: 0,
    Sunday: 0,
  };

  data.forEach(job => {
    const appliedEvent = job.status_events?.find(e => normalizeStatus(e.status) === 'applied');
    if (appliedEvent) {
      const dateStr = getLocalDateStr(appliedEvent.timestamp);
      if (dateStr) {
        const day = getDayOfWeek(dateStr);
        stats[day]++;
      }
    }
  });

  return stats;
};

// Process Response Time Distribution
const processResponseTimeDistribution = (data: SimplifyJob[]): ResponseTimeDistribution => {
  const distribution: ResponseTimeDistribution = {
    '0-7': 0,
    '8-14': 0,
    '15-30': 0,
    '31-60': 0,
    '60+': 0,
    'No Response': 0,
  };

  data.forEach(job => {
    const appliedEvent = job.status_events?.find(e => normalizeStatus(e.status) === 'applied');
    if (!appliedEvent) return;

    const appliedDate = getLocalDateStr(appliedEvent.timestamp);
    if (!appliedDate) return;

    const responseEvents = job.status_events?.filter(
      e => normalizeStatus(e.status) !== 'applied' && e.timestamp > appliedEvent.timestamp
    );

    if (!responseEvents || responseEvents.length === 0) {
      distribution['No Response']++;
      return;
    }

    const firstResponse = responseEvents.sort((a, b) => a.timestamp.localeCompare(b.timestamp))[0];
    const responseDate = getLocalDateStr(firstResponse.timestamp);
    if (!responseDate) return;

    const days = calculateResponseTime(appliedDate, responseDate);
    const range = getResponseTimeRange(days);
    distribution[range]++;
  });

  return distribution;
};

// Process Weekly Trend
const processWeeklyTrend = (dailyStats: DailyStatsMap): TrendDataPoint[] => {
  const weeklyMap = new Map<string, number>();

  Object.entries(dailyStats).forEach(([date, stats]) => {
    const weekStart = format(startOfWeek(new Date(date)), 'yyyy-MM-dd');
    weeklyMap.set(weekStart, (weeklyMap.get(weekStart) || 0) + stats.totalApplications);
  });

  return Array.from(weeklyMap.entries())
    .map(([date, value]) => ({
      date,
      value,
      label: format(new Date(date), 'MMM d'),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
};

// Process Monthly Trend
const processMonthlyTrend = (dailyStats: DailyStatsMap): TrendDataPoint[] => {
  const monthlyMap = new Map<string, number>();

  Object.entries(dailyStats).forEach(([date, stats]) => {
    const monthStart = format(startOfMonth(new Date(date)), 'yyyy-MM-dd');
    monthlyMap.set(monthStart, (monthlyMap.get(monthStart) || 0) + stats.totalApplications);
  });

  return Array.from(monthlyMap.entries())
    .map(([date, value]) => ({
      date,
      value,
      label: format(new Date(date), 'MMM yyyy'),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
};

// Process Success Rate Trend
const processSuccessRateTrend = (dailyStats: DailyStatsMap): TrendDataPoint[] => {
  const weeklySuccessMap = new Map<string, { apps: number; success: number }>();

  Object.entries(dailyStats).forEach(([date, stats]) => {
    const weekStart = format(startOfWeek(new Date(date)), 'yyyy-MM-dd');
    const existing = weeklySuccessMap.get(weekStart) || { apps: 0, success: 0 };
    existing.apps += stats.totalApplications;
    existing.success += (stats.interviews || 0) + (stats.offers || 0);
    weeklySuccessMap.set(weekStart, existing);
  });

  return Array.from(weeklySuccessMap.entries())
    .map(([date, { apps, success }]) => ({
      date,
      value: apps > 0 ? Math.round((success / apps) * 100) : 0,
      label: format(new Date(date), 'MMM d'),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
};

// Main processing function
export const processAnalyticsData = (data: SimplifyJob[], filters?: AnalyticsFilters): ProcessedAnalyticsData => {
  const daily = processDailyData(data, filters);

  return {
    summary: processSummaryStats(data),
    salary: processSalaryData(data),
    daily,
    location: processLocationData(data),
    statusDistribution: processStatusDistribution(data),
    topCompanies: processCompanyStats(data),
    dayOfWeek: processDayOfWeekStats(data),
    responseTimeDistribution: processResponseTimeDistribution(data),
    weeklyTrend: processWeeklyTrend(daily),
    monthlyTrend: processMonthlyTrend(daily),
    successRateTrend: processSuccessRateTrend(daily),
  };
};
