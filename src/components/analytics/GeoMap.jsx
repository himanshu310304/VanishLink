// src/components/analytics/GeoMap.jsx
import React from 'react';
import { Card } from '../ui/Card';
import { Globe } from 'lucide-react';

export const GeoMap = ({ data = [], loading }) => {
  const regions = (data || [])
    .filter((d) => d && d.country)
    .sort((a, b) => (b.clicks || 0) - (a.clicks || 0));

  const hasData = regions.length > 0;

  return (
    <Card className="h-[400px] flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">
          Top Locations
        </h3>
        <Globe className="w-5 h-5 text-slate-500" />
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-slate-600 dark:text-slate-400 text-sm">
          Loading locations...
        </div>
      ) : !hasData ? (
        <div className="flex-1 flex items-center justify-center text-slate-500 text-sm text-center">
          No location data yet
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
          {regions.map((region, idx) => (
            <div
              key={`${region.country}-${idx}`}
              className="flex items-center justify-between py-3 px-4 rounded-md bg-white/5 hover:bg-white/10 transition-colors duration-150"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-500 font-medium w-6">
                  {idx + 1}
                </span>
                <span className="text-sm text-slate-900 dark:text-white">
                  {region.country || 'Unknown'}
                </span>
              </div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {(region.clicks ?? 0).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};
