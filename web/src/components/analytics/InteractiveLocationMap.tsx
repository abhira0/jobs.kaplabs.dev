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
  jobsData?: SimplifyJob[]; // Raw job data to calculate compensation
};

// World GeoJSON URL from Natural Earth (public domain)
const WORLD_TOPO_JSON = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

export default function InteractiveLocationMap({
  locations,
  remoteCount,
  hybridCount,
  jobsData = []
}: InteractiveLocationMapProps) {
  const [tooltipContent, setTooltipContent] = useState<string>('');
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [hoveredLocation, setHoveredLocation] = useState<string | null>(null);

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

  // Calculate min and max compensation for color scaling
  const { minComp, maxComp } = useMemo(() => {
    const comps = Array.from(locationCompensation.values()).map(c => c.avgPerHour);
    return {
      minComp: comps.length > 0 ? Math.min(...comps) : 0,
      maxComp: comps.length > 0 ? Math.max(...comps) : 100,
    };
  }, [locationCompensation]);

  // Show all locations globally
  const allLocations = useMemo(() => {
    return locations.filter(loc => {
      const [lat, lng] = loc.coords;
      // Basic validation: ensure coordinates are within valid ranges
      return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
    });
  }, [locations]);

  const maxCount = Math.max(...allLocations.map(l => l.count), 1);

  // Helper function to get color based on compensation
  const getCompensationColor = (avgHourly: number): string => {
    if (avgHourly === 0) return '#6366f1'; // Indigo for no data

    // Normalize compensation to 0-1 scale
    const normalized = (avgHourly - minComp) / (maxComp - minComp || 1);

    // Color gradient from red (low) -> yellow (mid) -> green (high)
    if (normalized < 0.5) {
      // Red to Yellow
      const ratio = normalized * 2;
      const r = 239; // ef
      const g = Math.round(68 + (217 * ratio)); // 44 to f5
      const b = 68; // 44
      return `rgb(${r}, ${g}, ${b})`;
    } else {
      // Yellow to Green
      const ratio = (normalized - 0.5) * 2;
      const r = Math.round(239 - (223 * ratio)); // f5 to 10
      const g = Math.round(158 + (27 * ratio)); // 9e to b9
      const b = Math.round(11 + (118 * ratio)); // 0b to 81
      return `rgb(${r}, ${g}, ${b})`;
    }
  };

  const handleMarkerEnter = (location: LocationData, event: React.MouseEvent) => {
    const compensation = locationCompensation.get(location.key);
    const avgHourly = compensation?.avgPerHour || 0;

    const content = `
      ${location.name}
      ${location.count} ${location.count === 1 ? 'application' : 'applications'}
      ${avgHourly > 0 ? `Avg: $${avgHourly.toFixed(2)}/hr` : 'No salary data'}
    `;

    setTooltipContent(content);
    // Position tooltip closer to cursor
    setTooltipPosition({ x: event.pageX, y: event.pageY });
    setHoveredLocation(location.key);
  };

  const handleMarkerMove = (event: React.MouseEvent) => {
    if (tooltipContent) {
      // Use pageX/pageY for more accurate positioning
      setTooltipPosition({ x: event.pageX, y: event.pageY });
    }
  };

  const handleMarkerLeave = () => {
    setTooltipContent('');
    setHoveredLocation(null);
  };

  return (
    <div className="space-y-4">
      {/* Map Container */}
      <div className="relative rounded-lg overflow-hidden border border-default bg-gray-950">
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{
            scale: 180,
            center: [-96, 38], // Center on USA
          }}
          width={800}
          height={500}
          style={{
            width: '100%',
            height: 'auto',
          }}
        >
          <ZoomableGroup
            center={[-96, 38]}
            zoom={1.5}
            minZoom={1}
            maxZoom={8}
          >
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

            {/* Markers for job locations */}
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
                  onMouseEnter={(event) => handleMarkerEnter(location, event)}
                  onMouseMove={handleMarkerMove}
                  onMouseLeave={handleMarkerLeave}
                  style={{ cursor: 'pointer' }}
                >
                  <circle
                    r={size}
                    fill={markerColor}
                    fillOpacity={isHovered ? 1 : 0.7}
                    stroke="#ffffff"
                    strokeWidth={isHovered ? 2 : 1}
                    className="transition-all duration-200"
                  />
                </Marker>
              );
            })}
          </ZoomableGroup>
        </ComposableMap>

        {/* Tooltip */}
        {tooltipContent && (
          <div
            className="absolute pointer-events-none z-50 px-3 py-2 bg-gray-900/95 backdrop-blur border border-gray-700 rounded-lg text-xs text-white shadow-xl"
            style={{
              left: tooltipPosition.x - 250,
              top: tooltipPosition.y - 400,
              transform: 'translate(15px, 15px)',
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
        <div className="absolute top-2 right-2 bg-gray-900/95 backdrop-blur rounded-md px-3 py-2 text-xs border border-default max-w-[180px]">
          <div className="font-semibold mb-2">Legend</div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-muted">Low compensation</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <span className="text-muted">Mid compensation</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-muted">High compensation</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
              <span className="text-muted">No salary data</span>
            </div>
          </div>
          <div className="text-muted mt-2 pt-2 border-t border-gray-700">Size = # of applications</div>
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
