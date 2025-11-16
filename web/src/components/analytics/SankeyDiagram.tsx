// Sankey Diagram for Application Funnel

'use client';

import { useMemo } from 'react';

type SankeyNode = {
  name: string;
  value: number;
  color: string;
};

type SankeyLink = {
  source: string;
  target: string;
  value: number;
  color: string;
};

type SankeyDiagramProps = {
  nodes: SankeyNode[];
  links: SankeyLink[];
};

export default function SankeyDiagram({ nodes, links }: SankeyDiagramProps) {
  // Calculate total for normalization
  const maxValue = useMemo(() => {
    return Math.max(...nodes.map(n => n.value), 1);
  }, [nodes]);

  // Calculate node heights based on values
  const nodeHeights = useMemo(() => {
    return nodes.map(node => ({
      ...node,
      height: (node.value / maxValue) * 100, // percentage
    }));
  }, [nodes, maxValue]);

  return (
    <div className="w-full">
      {/* Nodes */}
      <div className="flex items-center justify-between gap-4 mb-8">
        {nodeHeights.map((node, index) => (
          <div key={index} className="flex-1 flex flex-col items-center gap-2">
            <div className="text-xs font-medium text-center text-muted">
              {node.name}
            </div>
            <div
              className="w-full rounded transition-all duration-500"
              style={{
                backgroundColor: node.color,
                height: `${Math.max(node.height, 20)}px`,
                opacity: 0.8,
              }}
            />
            <div className="text-sm font-semibold text-center">
              {node.value}
            </div>
            <div className="text-xs text-muted text-center">
              {((node.value / maxValue) * 100).toFixed(0)}%
            </div>
          </div>
        ))}
      </div>

      {/* Flow visualization - simplified */}
      <div className="space-y-3 mt-8">
        <div className="text-xs text-muted font-semibold mb-2">Application Flow</div>
        {links.map((link, index) => {
          const percentage = (link.value / maxValue) * 100;
          return (
            <div key={index} className="flex items-center gap-3">
              <div className="text-xs text-muted min-w-[120px]">
                {link.source} → {link.target}
              </div>
              <div className="flex-1 bg-white/5 rounded-full h-4 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: link.color,
                  }}
                />
              </div>
              <div className="text-sm font-medium min-w-[60px] text-right">
                {link.value}
              </div>
              <div className="text-xs text-muted min-w-[45px] text-right">
                {percentage.toFixed(0)}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
