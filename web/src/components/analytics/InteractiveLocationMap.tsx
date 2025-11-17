// Interactive Location Map with react-simple-maps
// Shows world map with default focus on USA, with job locations and average compensation on hover

'use client';

import { useState, useMemo } from 'react';
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from 'react-simple-maps';
import { LocationData, SimplifyJob } from '@/types/analytics';

type InteractiveLocationMapProps = {
  locations: LocationData[];
  remoteCount: number;
  hybridCount: number;
  jobsData?: SimplifyJob[];
};

// World GeoJSON URL
const WORLD_TOPO_JSON = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

export default function InteractiveLocationMap({
  locations,
  remoteCount,
  hybridCount,
  jobsData = []
}: InteractiveLocationMapProps) {
  const [hoveredLocation, setHoveredLocation] = useState<string | null>(null);

  // Calculate average compensation per location
  const locationCompensation = useMemo(() => {
    const compensationMap = new Map<string, { total: number; count: number; avgPerHour: number }>();

    jobsData.forEach(job => {
      if (!job.coordinates || !job.salary) return;

      job.coordinates.forEach(([lat, lng, name]) => {
        const key = `${lat},${lng}`;

        // Convert salary to hourly rate
        let hourlyRate = 0;
        if (job.salary && job.salary_period) {
          switch (job.salary_period) {
            case 1: hourlyRate = job.salary; break;
            case 2: hourlyRate = job.salary / 8; break;
            case 3: hourlyRate = job.salary / 40; break;
            case 4: hourlyRate = job.salary / 80; break;
            case 5: hourlyRate = job.salary / 173; break;
            case 6: hourlyRate = job.salary / 2080; break;
            default: hourlyRate = 0;
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

  // Calculate min and max for color scaling
  const { minComp, maxComp } = useMemo(() => {
    const comps = Array.from(locationCompensation.values()).map(c => c.avgPerHour);
    return {
      minComp: comps.length > 0 ? Math.min(...comps) : 0,
      maxComp: comps.length > 0 ? Math.max(...comps) : 100,
    };
  }, [locationCompensation]);

  // Filter valid locations
  const allLocations = useMemo(() => {
    return locations.filter(loc => {
      const [lat, lng] = loc.coords;
      return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
    });
  }, [locations]);

  const maxCount = Math.max(...allLocations.map(l => l.count), 1);

  // Get color based on compensation
  const getCompensationColor = (avgHourly: number): string => {
    if (avgHourly === 0) return '#6366f1';

    const normalized = (avgHourly - minComp) / (maxComp - minComp || 1);

    if (normalized < 0.5) {
      const ratio = normalized * 2;
      const r = 239;
      const g = Math.round(68 + (217 * ratio));
      const b = 68;
      return `rgb(${r}, ${g}, ${b})`;
    } else {
      const ratio = (normalized - 0.5) * 2;
      const r = Math.round(239 - (223 * ratio));
      const g = Math.round(158 + (27 * ratio));
      const b = Math.round(11 + (118 * ratio));
      return `rgb(${r}, ${g}, ${b})`;
    }
  };

  return (
    <div className="space-y-4">
      {/* Map Container */}
      <div className="relative rounded-lg overflow-hidden border border-default bg-gray-950 h-[500px]">
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{
            scale: 180,
            center: [-96, 38],
          }}
          width={800}
          height={500}
          style={{
            width: '100%',
            height: '100%',
          }}
        >
          <ZoomableGroup center={[-96, 38]} zoom={1.5} minZoom={1} maxZoom={8}>
            <Geographies geography={WORLD_TOPO_JSON}>
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

            {/* Markers */}
            {allLocations.map((location) => {
              const [lat, lng] = location.coords;
              const size = 4 + (location.count / maxCount) * 12;
              const compensation = locationCompensation.get(location.key);
              const avgHourly = compensation?.avgPerHour || 0;
              const markerColor = getCompensationColor(avgHourly);
              const isHovered = hoveredLocation === location.key;

              return (
                <Marker
                  key={location.key}
                  coordinates={[lng, lat]}
                  onMouseEnter={() => setHoveredLocation(location.key)}
                  onMouseLeave={() => setHoveredLocation(null)}
                >
                  <g>
                    <circle
                      r={size}
                      fill={markerColor}
                      fillOpacity={isHovered ? 1 : 0.7}
                      stroke="#ffffff"
                      strokeWidth={isHovered ? 2 : 1}
                      className="transition-all duration-200"
                      style={{ cursor: 'pointer' }}
                    />
                    {isHovered && (
                      <g>
                        {/* Tooltip background */}
                        <rect
                          x={size + 8}
                          y={-30}
                          width={180}
                          height={avgHourly > 0 ? 60 : 45}
                          fill="#0f1117"
                          stroke="#374151"
                          strokeWidth={1}
                          rx={6}
                          opacity={0.98}
                        />
                        {/* Location name */}
                        <text
                          x={size + 18}
                          y={-10}
                          fontSize={12}
                          fontWeight="600"
                          fill="#ffffff"
                        >
                          {location.name.length > 20 ? location.name.slice(0, 20) + '...' : location.name}
                        </text>
                        {/* Count */}
                        <text
                          x={size + 18}
                          y={6}
                          fontSize={11}
                          fill="#9ca3af"
                        >
                          {location.count} {location.count === 1 ? 'application' : 'applications'}
                        </text>
                        {/* Compensation */}
                        {avgHourly > 0 && (
                          <text
                            x={size + 18}
                            y={22}
                            fontSize={11}
                            fill="#10b981"
                            fontWeight="600"
                          >
                            Avg: ${avgHourly.toFixed(2)}/hr
                          </text>
                        )}
                      </g>
                    )}
                  </g>
                </Marker>
              );
            })}
          </ZoomableGroup>
        </ComposableMap>

        {/* Legend */}
        <div className="absolute top-4 right-4 bg-gray-900/95 backdrop-blur rounded-md px-3 py-2 text-xs border border-default">
          <div className="font-semibold mb-2">Legend</div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-muted">Low pay</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <span className="text-muted">Mid pay</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-muted">High pay</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
              <span className="text-muted">No data</span>
            </div>
          </div>
          <div className="text-muted mt-2 pt-2 border-t border-gray-700">
            Size = # of apps
          </div>
        </div>
      </div>

      {/* Location Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-lg border border-default bg-black/40 p-4">
          <div className="text-sm text-muted">Global Locations</div>
          <div className="text-2xl font-semibold mt-1">{allLocations.length}</div>
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
    </div>
  );
}
