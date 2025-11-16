// Loading Skeleton for Analytics

export default function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 bg-white/10 rounded"></div>
        <div className="h-10 w-32 bg-white/10 rounded"></div>
      </div>

      {/* Stat Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-lg border border-default bg-black/40 p-5">
            <div className="h-4 w-24 bg-white/10 rounded mb-3"></div>
            <div className="h-8 w-32 bg-white/10 rounded"></div>
          </div>
        ))}
      </div>

      {/* Chart Skeletons */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-lg border border-default bg-black/40 p-6">
            <div className="h-6 w-40 bg-white/10 rounded mb-4"></div>
            <div className="h-64 bg-white/5 rounded"></div>
          </div>
        ))}
      </div>
    </div>
  );
}
