// src/pages/Admin/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import { Users, Link2, Activity, Smartphone } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { StatsCard } from '../../components/analytics/StatsCard';
import { ClickChart } from '../../components/analytics/ClickChart';
import { useFetch } from '../../hooks/useFetch';
import { useSocket } from '../../context/SocketContext';

const AdminDashboard = () => {
  const { data, loading, error } = useFetch('/admin/overview');
  const socket = useSocket();

  const [liveClicks, setLiveClicks] = useState(0);

  useEffect(() => {
    if (data && data.totalClicks !== undefined) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLiveClicks(data.totalClicks);
    }
  }, [data]);

  useEffect(() => {
    if (!socket) return;
    
    const handleNewClick = () => {
      setLiveClicks(prev => prev + 1);
    };

    socket.on('admin_new_click', handleNewClick);
    return () => socket.off('admin_new_click', handleNewClick);
  }, [socket]);

  const totalLinks = data?.totalLinks ?? 0;
  const totalClicks = liveClicks;
  const activeLinks = data?.activeLinks ?? 0;
  const mobilePercent = data?.mobilePercent ?? 0;
  const timeline = data?.timeline ?? [];
  const recentEvents = data?.recentEvents ?? [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 relative">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">Admin Dashboard</h1>
          <p className="text-lg text-slate-700 dark:text-slate-300">
            System overview and activity monitoring
          </p>
        </div>
        {!loading && data && (
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 border border-emerald-500/30 rounded-full">
            <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse"></div>
            <span className="text-emerald-300 font-medium">Live</span>
          </div>
        )}
        <div className="absolute -top-4 -right-4 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl"></div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
          Failed to load admin overview: {error.message || 'Unknown error'}
        </div>
      )}

      {/* Top stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Clicks"
          value={loading ? '…' : totalClicks.toLocaleString()}
          icon={Activity}
        />
        <StatsCard
          title="Total Links"
          value={loading ? '…' : totalLinks.toLocaleString()}
          icon={Link2}
        />
        <StatsCard
          title="Active Links"
          value={loading ? '…' : activeLinks.toLocaleString()}
          icon={Users}
        />
        <StatsCard
          title="Mobile Share"
          value={loading ? '…' : `${mobilePercent}%`}
          icon={Smartphone}
        />
      </div>

      {/* Charts + alerts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Traffic chart */}
        <div className="lg:col-span-2">
          <ClickChart data={timeline} loading={loading} />
        </div>

        {/* Recent system alerts */}
        <Card className="h-[400px] flex flex-col">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-1">
              Recent Activity
            </h2>
            <p className="text-xs text-slate-500">
              Latest platform events
            </p>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-2">
            {loading && (
              <p className="text-sm text-slate-500">Loading...</p>
            )}

            {!loading && recentEvents.length === 0 && (
              <p className="text-sm text-slate-500">
                No recent activity
              </p>
            )}

            {!loading &&
              recentEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="rounded-md bg-white/5 px-3 py-2"
                >
                  <p className="text-xs text-slate-800 dark:text-slate-200">{ev.message}</p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    {new Date(ev.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
