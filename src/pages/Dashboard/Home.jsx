import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/Button';
import { CreateLinkForm } from '../../components/links/CreateLinkForm';
import { APP_BASE_URL } from '../../config/appUrl'; // 🔥 use app base url
import api from '../../services/api';
import { Zap, Link as LinkIcon, Gauge, CheckCircle } from 'lucide-react';

const DashboardHome = () => {
  const navigate = useNavigate();

  // store last created short URL for display + copy
  const [shortUrl, setShortUrl] = useState('');

  // basic stats for overview cards
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    clicks: 0,
    loading: true,
  });

  const handleLinkCreated = (link) => {
    // link comes from CreateLinkForm onSuccess
    const generatedShort = `${APP_BASE_URL}/${link.slug}`; // 🔥 not localhost
    setShortUrl(generatedShort);
  };

  const handleCopyShortUrl = async () => {
    if (!shortUrl) return;
    try {
      await navigator.clipboard.writeText(shortUrl);
      toast.success('Short link copied to clipboard!');
    } catch (err) {
      toast.error('Failed to copy. You can copy it manually.');
    }
  };

  // load link stats for overview
  useEffect(() => {
    const loadStats = async () => {
      try {
        setStats((s) => ({ ...s, loading: true }));
        const res = await api.get('/links');
        const links = Array.isArray(res.data) ? res.data : [];

        const total = links.length;
        const active = links.filter((l) => l.status !== 'expired').length;
        const clicks = links.reduce((sum, l) => sum + (l.clicks || 0), 0);

        setStats({ total, active, clicks, loading: false });
      } catch (err) {
        console.error('Failed to load stats', err);
        setStats({ total: 0, active: 0, clicks: 0, loading: false });
      }
    };

    loadStats();
  }, []);

  return (
    <div className="h-full w-full space-y-8">
      <div className="relative">
        <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">Dashboard</h1>
        <p className="text-lg text-slate-700 dark:text-slate-300">Create and manage your deadman links</p>
        <div className="absolute -top-4 -right-4 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl"></div>
      </div>

      {/* Link Creator */}
      <div className="bg-linear-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl border border-slate-300 dark:border-slate-700/50 p-8 rounded-2xl shadow-2xl shadow-black/20">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-linear-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30 flex items-center justify-center">
            <Zap className="w-5 h-5 text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Create New Link
          </h2>
        </div>

        {/* Single source of truth for link creation */}
        <CreateLinkForm onSuccess={handleLinkCreated} />

        {/* Show result only when we have a short URL */}
        {shortUrl && (
          <div className="mt-6 border border-emerald-500/30 rounded-xl p-5 bg-linear-to-br from-emerald-500/10 to-emerald-600/5 shadow-lg">
            <p className="text-emerald-400 font-semibold mb-3 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Link created successfully
            </p>
            <div className="flex flex-col md:flex-row gap-3 md:items-center">
              <span className="break-all text-sm bg-slate-100 dark:bg-slate-800/80 px-4 py-3 rounded-lg border border-slate-600/50 text-slate-100 font-mono flex-1">
                {shortUrl}
              </span>
              <Button
                type="button"
                onClick={handleCopyShortUrl}
                className="md:w-auto w-full"
              >
                Copy Link
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: 'Total Links', value: stats.loading ? '…' : stats.total, icon: LinkIcon },
          { label: 'Active Links', value: stats.loading ? '…' : stats.active, icon: Zap },
          { label: 'Total Clicks', value: stats.loading ? '…' : stats.clicks.toLocaleString(), icon: Gauge },
        ].map((item) => {
          const Icon = item.icon;
          
          return (
            <div
              key={item.label}
              className="bg-white/5 border border-slate-200/10 p-6 rounded-lg shadow-sm"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  {item.label}
                </span>
                <Icon className="w-5 h-5 text-slate-500" />
              </div>
              <p className="text-3xl font-semibold text-slate-900 dark:text-white">{item.value}</p>
            </div>
          );
        })}
      </div>

      {/* Empty State Action */}
      {stats.loading || stats.total === 0 ? (
        <div className="bg-white/5 border border-slate-200/10 p-12 rounded-lg text-center">
          <div className="w-16 h-16 rounded-lg bg-white/5 flex items-center justify-center mx-auto mb-4">
            <LinkIcon className="w-8 h-8 text-slate-500" />
          </div>
          <h3 className="text-slate-900 dark:text-white text-lg font-semibold mb-2">
            {stats.loading ? 'Loading links...' : 'No links created yet'}
          </h3>
          <p className="text-slate-600 dark:text-slate-400 text-sm mb-6">
            {stats.loading
              ? 'Fetching your link activity.'
              : 'Create your first deadman link to start tracking and monitoring.'}
          </p>
          <Button onClick={() => navigate('/dashboard/links')}>
            Create First Link
          </Button>
        </div>
      ) : null}
    </div>
  );
};

export default DashboardHome;
