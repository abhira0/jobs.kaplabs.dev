// Location Map Visualization
// Simple geographic distribution using coordinates

'use client';

import { LocationData } from '@/types/analytics';
import { useEffect, useRef } from 'react';

type LocationMapProps = {
  locations: LocationData[];
  remoteCount: number;
  hybridCount: number;
};

export default function LocationMap({ locations, remoteCount, hybridCount }: LocationMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || locations.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, width, height);

    // Draw world map outline (simple)
    ctx.strokeStyle = '#21262d';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = '#161b22';
    for (let i = 0; i < 10; i++) {
      ctx.beginPath();
      ctx.moveTo((width / 10) * i, 0);
      ctx.lineTo((width / 10) * i, height);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, (height / 10) * i);
      ctx.lineTo(width, (height / 10) * i);
      ctx.stroke();
    }

    // Draw locations as points
    const maxCount = Math.max(...locations.map(l => l.count));

    locations.forEach(location => {
      const [lat, lng] = location.coords;

      // Convert lat/lng to canvas coordinates
      // Simple mercator-ish projection
      const x = ((lng + 180) / 360) * width;
      const y = ((90 - lat) / 180) * height;

      // Size based on count
      const radius = 3 + (location.count / maxCount) * 12;

      // Draw point
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, 'rgba(59, 130, 246, 0.9)');
      gradient.addColorStop(1, 'rgba(59, 130, 246, 0.2)');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();

      // Draw border
      ctx.strokeStyle = 'rgba(59, 130, 246, 1)';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

  }, [locations]);

  if (locations.length === 0 && remoteCount === 0 && hybridCount === 0) {
    return (
      <div className="flex items-center justify-center h-80 text-sm text-muted">
        No location data available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Canvas Map */}
      <div className="relative rounded-lg overflow-hidden border border-default">
        <canvas
          ref={canvasRef}
          width={800}
          height={400}
          className="w-full h-auto bg-gray-950"
        />
        <div className="absolute top-2 right-2 bg-gray-900/90 backdrop-blur rounded-md px-3 py-2 text-xs border border-default">
          <div className="font-semibold mb-1">Legend</div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span>Application locations</span>
          </div>
          <div className="text-muted mt-1">Size = number of applications</div>
        </div>
      </div>

      {/* Location Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-lg border border-default bg-black/40 p-4">
          <div className="text-sm text-muted">Specific Locations</div>
          <div className="text-2xl font-semibold mt-1">{locations.length}</div>
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
          {locations
            .sort((a, b) => b.count - a.count)
            .slice(0, 15)
            .map((location, idx) => (
              <div
                key={location.key}
                className="flex items-center justify-between py-2 px-3 rounded-md bg-white/5 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted w-6">{idx + 1}.</span>
                  <span className="text-sm">{location.name}</span>
                </div>
                <span className="text-sm font-semibold text-blue-400">{location.count}</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
