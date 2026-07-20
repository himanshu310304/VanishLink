import React, { useMemo } from 'react';
import { Sparkles, TrendingUp, AlertCircle, Info } from 'lucide-react';

export const AIInsightsCard = ({ data, loading }) => {
  const insights = useMemo(() => {
    if (loading || !data) return [];
    
    const results = [];
    const { total = 0, mobile = 0, topLocation = 'Unknown', timeline = [] } = data;
    
    if (total === 0) {
      return [{
        type: 'info',
        icon: Info,
        title: 'Need More Data',
        description: 'Share your links to generate AI insights.'
      }];
    }

    // 1. Analyze Timeline Spikes
    if (timeline.length > 0) {
      const sortedByClicks = [...timeline].sort((a, b) => b.clicks - a.clicks);
      const topDay = sortedByClicks[0];
      const avgClicks = total / timeline.length;
      
      if (topDay.clicks > avgClicks * 1.5 && topDay.clicks > 5) {
        results.push({
          type: 'success',
          icon: TrendingUp,
          title: 'Unusual Traffic Spike',
          description: `Traffic peaked heavily on ${new Date(topDay.date).toLocaleDateString()} with ${topDay.clicks} clicks.`
        });
      }
    }

    // 2. Mobile usage
    if (mobile > 60) {
      results.push({
        type: 'info',
        icon: Sparkles,
        title: 'Mobile Dominance',
        description: `Your audience is highly mobile (${mobile}%). Ensure your destination is responsive.`
      });
    } else if (mobile < 20 && total > 20) {
      results.push({
        type: 'info',
        icon: Sparkles,
        title: 'Desktop Heavy Audience',
        description: `Only ${mobile}% of users are on mobile devices. Desktop users are driving engagement.`
      });
    }

    // 3. Location info
    if (topLocation !== 'Unknown' && topLocation !== 'Localhost') {
      results.push({
        type: 'info',
        icon: Sparkles,
        title: 'Geographic Concentration',
        description: `The majority of your recent traffic originates from ${topLocation}.`
      });
    }

    // 4. Default fallback if not enough interesting things found
    if (results.length === 0) {
      results.push({
        type: 'info',
        icon: Sparkles,
        title: 'Steady Traffic',
        description: 'Traffic is flowing at a steady, predictable rate with no major anomalies.'
      });
    }

    return results;
  }, [data, loading]);

  if (loading) {
    return (
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 animate-pulse">
        <div className="h-6 w-48 bg-slate-700/50 rounded mb-4"></div>
        <div className="space-y-3">
          <div className="h-20 w-full bg-slate-700/30 rounded-lg"></div>
          <div className="h-20 w-full bg-slate-700/30 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-linear-to-br from-indigo-900/40 to-slate-800/80 border border-indigo-500/20 rounded-xl p-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
        <Sparkles className="w-24 h-24 text-indigo-400" />
      </div>
      
      <div className="flex items-center gap-2 mb-6">
        <div className="p-2 bg-indigo-500/20 rounded-lg">
          <Sparkles className="w-5 h-5 text-indigo-400" />
        </div>
        <h2 className="text-xl font-bold text-white">AI Insights</h2>
      </div>

      <div className="space-y-4 relative z-10">
        {insights.map((insight, idx) => {
          const Icon = insight.icon;
          const isSuccess = insight.type === 'success';
          return (
            <div key={idx} className="flex gap-4 p-4 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:bg-slate-750 transition-colors">
              <div className={`mt-1 \${isSuccess ? 'text-emerald-400' : 'text-indigo-400'}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-200 mb-1">{insight.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{insight.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
