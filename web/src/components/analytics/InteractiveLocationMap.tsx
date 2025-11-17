// Interactive Location Map with react-leaflet
// Shows world map with job locations and compensation tooltips

'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, useMap } from 'react-leaflet';
import { LocationData, SimplifyJob } from '@/types/analytics';
import 'leaflet/dist/leaflet.css';

type InteractiveLocationMapProps = {
  locations: LocationData[];
  remoteCount: number;
  hybridCount: number;
  jobsData?: SimplifyJob[];
};

// Component to set initial view
function SetViewOnMount({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [map, center, zoom]);
  return null;
}

export default function InteractiveLocationMap({
  locations,
  remoteCount,
  hybridCount,
  jobsData = []
}: InteractiveLocationMapProps) {
  const [hoveredLocation, setHoveredLocation] = useState<LocationData | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate average compensation per location
  const locationCompensation = useMemo(() => {
    const compensationMap = new Map<string, { total: number; count: number; avgPerHour: number }>();

    jobsData.forEach(job => {
      if (!job.coordinates || !job.salary) return;

      job.coordinates.forEach(([lat, lng, name]) => {
        const key = `${lat},${lng}`;

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

  const { minComp, maxComp } = useMemo(() => {
    const comps = Array.from(locationCompensation.values()).map(c => c.avgPerHour);
    return {
      minComp: comps.length > 0 ? Math.min(...comps) : 0,
      maxComp: comps.length > 0 ? Math.max(...comps) : 100,
    };
  }, [locationCompensation]);

  const allLocations = useMemo(() => {
    return locations.filter(loc => {
      const [lat, lng] = loc.coords;
      return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
    });
  }, [locations]);

  const maxCount = Math.max(...allLocations.map(l => l.count), 1);

  const getCompensationColor = (avgHourly: number): string => {
    if (avgHourly === 0) return '#6366f1';

    const normalized = (avgHourly - minComp) / (maxComp - minComp || 1);

    if (normalized < 0.5) {
      const ratio = normalized * 2;
      return `rgb(239, ${Math.round(68 + 217 * ratio)}, 68)`;
    } else {
      const ratio = (normalized - 0.5) * 2;
      return `rgb(${Math.round(239 - 223 * ratio)}, ${Math.round(158 + 27 * ratio)}, ${Math.round(11 + 118 * ratio)})`;
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setMousePosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Map Container */}
      <div
        ref={containerRef}
        className="relative rounded-lg overflow-hidden border border-default bg-gray-950"
        style={{ height: '500px' }}
        onMouseMove={handleMouseMove}
      >
        <MapContainer
          center={[38, -96]}
          zoom={3}
          minZoom={1}
          maxZoom={8}
          style={{ width: '100%', height: '100%' }}
          zoomControl={true}
          scrollWheelZoom={true}
        >
          {/* Dark theme tile layer */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />

          <SetViewOnMount center={[38, -96]} zoom={3} />

          {/* Markers */}
          {allLocations.map((location) => {
            const [lat, lng] = location.coords;
            const size = 4 + (location.count / maxCount) * 12;
            const compensation = locationCompensation.get(location.key);
            const avgHourly = compensation?.avgPerHour || 0;
            const markerColor = getCompensationColor(avgHourly);
            const isHovered = hoveredLocation?.key === location.key;

            return (
              <CircleMarker
                key={location.key}
                center={[lat, lng]}
                radius={size}
                pathOptions={{
                  fillColor: markerColor,
                  fillOpacity: isHovered ? 1 : 0.7,
                  color: '#ffffff',
                  weight: isHovered ? 2 : 1,
                }}
                eventHandlers={{
                  mouseover: () => setHoveredLocation(location),
                  mouseout: () => setHoveredLocation(null),
                }}
              />
            );
          })}
        </MapContainer>

        {/* HTML Tooltip */}
        {hoveredLocation && (
          <div
            className="absolute pointer-events-none z-[1000] px-3 py-2 bg-gray-900/95 backdrop-blur border border-gray-700 rounded-lg text-xs text-white shadow-xl"
            style={{
              left: `${mousePosition.x + 15}px`,
              top: `${mousePosition.y + 15}px`,
            }}
          >
            <div className="font-semibold mb-1">{hoveredLocation.name}</div>
            <div className="text-gray-300">
              {hoveredLocation.count} {hoveredLocation.count === 1 ? 'application' : 'applications'}
            </div>
            {locationCompensation.get(hoveredLocation.key) && (
              <div className="text-green-400 font-semibold mt-1">
                Avg: ${locationCompensation.get(hoveredLocation.key)!.avgPerHour.toFixed(2)}/hr
              </div>
            )}
          </div>
        )}

        {/* Legend */}
        <div className="absolute top-4 right-4 bg-gray-900/95 backdrop-blur rounded-md px-3 py-2 text-xs border border-default z-[1000]">
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
