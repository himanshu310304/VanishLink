// src/pages/Dashboard/Analytics.jsx
import React from 'react';
import { BarChart3, Globe, MousePointer2, Smartphone, TrendingUp } from 'lucide-react';
import { StatsCard } from '../../components/analytics/StatsCard';
import { ClickChart } from '../../components/analytics/ClickChart';
import { GeoMap } from '../../components/analytics/GeoMap';
import { useFetch } from '../../hooks/useFetch';

const Analytics = () => {
  // Backend: GET /api/analytics -> { total, activeLinks, mobile, topLocation, timeline, geo }
  const { data, loading, error } = useFetch('/analytics');

  // Normalize data safely
  const totalClicks   = typeof data?.total === 'number' ? data.total : 0;
  const activeLinks   = typeof data?.activeLinks === 'number' ? data.activeLinks : 0;
  const mobilePercent = typeof data?.mobile === 'number' ? data.mobile : 0;
  const topLocation   = data?.topLocation || 'Unknown';

  const timeline = Array.isArray(data?.timeline) ? data.timeline : [];
  const geo      = Array.isArray(data?.geo) ? data.geo : [];

  if (import.meta.env.DEV) {
    console.log('Analytics data from API:', data);
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 relative">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">Analytics Dashboard</h1>
          <p className="text-lg text-slate-700 dark:text-slate-300">Track your link performance and engagement</p>
        </div>
        {!loading && data && (
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 border border-emerald-500/30 rounded-full">
            <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse"></div>
            <span className="text-emerald-300 font-medium">Live</span>
          </div>
        )}
        <div className="absolute -top-4 -left-4 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl"></div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
          Failed to load analytics: {error.message || 'Unknown error'}
        </div>
      )}

      {/* Top Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Clicks"
          value={loading ? '…' : totalClicks.toLocaleString()}
          icon={MousePointer2}
        />
        <StatsCard
          title="Active Links"
          value={loading ? '…' : activeLinks.toString()}
          icon={BarChart3}
        />
        <StatsCard
          title="Top Location"
          value={loading ? '…' : topLocation}
          icon={Globe}
        />
        <StatsCard
          title="Mobile Traffic"
          value={loading ? '…' : `${mobilePercent}%`}
          icon={Smartphone}
        />
      </div>

      {/* Chart + Geo map */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <ClickChart data={timeline} loading={loading} />
        </div>
        <div>
          <GeoMap data={geo} loading={loading} />
        </div>
      </div>
    </div>
  );
};

export default Analytics;
