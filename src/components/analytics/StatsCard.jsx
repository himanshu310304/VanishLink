// src/components/analytics/StatsCard.jsx
import React from 'react';
import { Card } from '../ui/Card';

export const StatsCard = ({ title, value, icon: Icon, trend }) => {
  return (
    <Card className="h-full group hover:scale-[1.02] transition-transform duration-300">
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
            {title}
          </span>
          {Icon && (
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <Icon className="w-5 h-5 text-emerald-400" />
            </div>
          )}
        </div>

        <div className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
          {value ?? '0'}
        </div>

        {trend && (
          <div className="text-sm text-emerald-400">
            <span className="font-semibold">↑ {trend}%</span>
            <span className="text-slate-500 ml-1">vs last week</span>
          </div>
        )}
      </div>
    </Card>
  );
};
