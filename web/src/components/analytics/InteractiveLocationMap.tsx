// Interactive Location Map with react-simple-maps
// Shows USA by default with job locations and average compensation on hover

'use client';

import { useState, useMemo } from 'react';
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from 'react-simple-maps';
import { LocationData, SimplifyJob } from '@/types/analytics';

type InteractiveLocationMapProps = {
  locations: LocationData[];
  remoteCount: number;
  hybridCount: number;
  jobsData?: SimplifyJob[]; // Raw job data to calculate compensation
};

// USA GeoJSON URL from Natural Earth (public domain)
const USA_TOPO_JSON = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json';

export default function InteractiveLocationMap({
  locations,
  remoteCount,
  hybridCount,
  jobsData = []
}: InteractiveLocationMapProps) {
  const [tooltipContent, setTooltipContent] = useState<string>('');
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // Calculate average compensation per location
  const locationCompensation = useMemo(() => {
    const compensationMap = new Map<string, { total: number; count: number; avgPerHour: number }>();

    jobsData.forEach(job => {
      if (!job.coordinates || !job.salary) return;

      job.coordinates.forEach(([lat, lng, name]) => {
        const key = `${lat},${lng}`;

        // Convert salary to hourly rate based on salary_period
        let hourlyRate = 0;
        if (job.salary && job.salary_period) {
          switch (job.salary_period) {
            case 1: // hourly
              hourlyRate = job.salary;
              break;
            case 2: // daily (8 hours)
              hourlyRate = job.salary / 8;
              break;
            case 3: // weekly (40 hours)
              hourlyRate = job.salary / 40;
              break;
            case 4: // biweekly (80 hours)
              hourlyRate = job.salary / 80;
              break;
            case 5: // monthly (173 hours)
              hourlyRate = job.salary / 173;
              break;
            case 6: // yearly (2080 hours)
              hourlyRate = job.salary / 2080;
              break;
            default:
              hourlyRate = 0;
          }
        }

        if (hourlyRate > 0) {
          const existing = compensationMap.get(key) || { total: 0, count: 0, avgPerHour: 0 };
          existing.total += hourlyRate;
          existing.count += 1;
          existing.avgPerHour = existing.total / existing.count;
          compensationMap.set(key, existing);
        }
      });
    });

    return compensationMap;
  }, [jobsData]);

  // Filter locations to only show USA (approximate bounds)
  const usaLocations = useMemo(() => {
    return locations.filter(loc => {
      const [lat, lng] = loc.coords;
      // USA approximate bounds: lat 24-49, lng -125 to -65
      return lat >= 24 && lat <= 49 && lng >= -125 && lng <= -65;
    });
  }, [locations]);

  const maxCount = Math.max(...usaLocations.map(l => l.count), 1);

  const handleMarkerEnter = (location: LocationData, event: React.MouseEvent) => {
    const compensation = locationCompensation.get(location.key);
    const avgHourly = compensation?.avgPerHour || 0;

    const content = `
      ${location.name}
      ${location.count} ${location.count === 1 ? 'application' : 'applications'}
      ${avgHourly > 0 ? `Avg: $${avgHourly.toFixed(2)}/hr` : 'No salary data'}
    `;

    setTooltipContent(content);
    setTooltipPosition({ x: event.clientX, y: event.clientY });
  };

  const handleMarkerLeave = () => {
    setTooltipContent('');
  };

  return (
    <div className="space-y-4">
      {/* Map Container */}
      <div className="relative rounded-lg overflow-hidden border border-default bg-gray-950">
        <ComposableMap
          projection="geoAlbersUsa"
          projectionConfig={{
            scale: 1000,
          }}
          width={800}
          height={500}
          style={{
            width: '100%',
            height: 'auto',
          }}
        >
          <ZoomableGroup center={[-96, 38]} zoom={1}>
            <Geographies geography={USA_TOPO_JSON}>
              {({ geographies }) =>
                geographies.map((geo) => (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill="#1e293b"
                    stroke="#334155"
                    strokeWidth={0.5}
                    style={{
                      default: { outline: 'none' },
                      hover: { outline: 'none', fill: '#334155' },
                      pressed: { outline: 'none' },
                    }}
                  />
                ))
              }
            </Geographies>

            {/* Markers for job locations */}
            {usaLocations.map((location) => {
              const [lat, lng] = location.coords;
              const size = 3 + (location.count / maxCount) * 15;
              const compensation = locationCompensation.get(location.key);
              const hasCompensation = compensation && compensation.avgPerHour > 0;

              return (
                <Marker
                  key={location.key}
                  coordinates={[lng, lat]}
                  onMouseEnter={(event) => handleMarkerEnter(location, event)}
                  onMouseLeave={handleMarkerLeave}
                  style={{ cursor: 'pointer' }}
                >
                  <circle
                    r={size}
                    fill={hasCompensation ? '#3b82f6' : '#6366f1'}
                    fillOpacity={0.7}
                    stroke="#ffffff"
                    strokeWidth={1}
                    className="transition-all duration-200 hover:fill-opacity-100 hover:stroke-width-2"
                  />
                </Marker>
              );
            })}
          </ZoomableGroup>
        </ComposableMap>

        {/* Tooltip */}
        {tooltipContent && (
          <div
            className="fixed pointer-events-none z-50 px-3 py-2 bg-gray-900/95 backdrop-blur border border-gray-700 rounded-lg text-xs text-white shadow-xl"
            style={{
              left: tooltipPosition.x + 10,
              top: tooltipPosition.y + 10,
            }}
          >
            {tooltipContent.split('\n').map((line, i) => (
              <div key={i} className={i === 0 ? 'font-semibold' : ''}>
                {line}
              </div>
            ))}
          </div>
        )}

        {/* Legend */}
        <div className="absolute top-2 right-2 bg-gray-900/90 backdrop-blur rounded-md px-3 py-2 text-xs border border-default">
          <div className="font-semibold mb-1">Legend</div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span>With salary data</span>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
            <span>No salary data</span>
          </div>
          <div className="text-muted mt-1">Size = # of applications</div>
        </div>
      </div>

      {/* Location Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-lg border border-default bg-black/40 p-4">
          <div className="text-sm text-muted">USA Locations</div>
          <div className="text-2xl font-semibold mt-1">{usaLocations.length}</div>
          <div className="text-xs text-muted mt-1">Unique cities/regions</div>
        </div>
        <div className="rounded-lg border border-default bg-black/40 p-4">
          <div className="text-sm text-muted">Remote Positions</div>
          <div className="text-2xl font-semibold mt-1">{remoteCount}</div>
          <div className="text-xs text-muted mt-1">Work from anywhere</div>
        </div>
        <div className="rounded-lg border border-default bg-black/40 p-4">
          <div className="text-sm text-muted">Hybrid Positions</div>
          <div className="text-2xl font-semibold mt-1">{hybridCount}</div>
          <div className="text-xs text-muted mt-1">Mix of remote and office</div>
        </div>
      </div>

      {/* Top Locations List */}
      <div className="rounded-lg border border-default bg-black/40 p-4">
        <h4 className="text-sm font-semibold mb-3">Top Application Locations</h4>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {usaLocations
            .sort((a, b) => b.count - a.count)
            .slice(0, 15)
            .map((location, idx) => {
              const compensation = locationCompensation.get(location.key);
              const avgHourly = compensation?.avgPerHour || 0;

              return (
                <div
                  key={location.key}
                  className="flex items-center justify-between py-2 px-3 rounded-md bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted w-6">{idx + 1}.</span>
                    <div>
                      <div className="text-sm">{location.name}</div>
                      {avgHourly > 0 && (
                        <div className="text-xs text-muted">Avg: ${avgHourly.toFixed(2)}/hr</div>
                      )}
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-blue-400">{location.count}</span>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
