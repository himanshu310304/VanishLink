import React from 'react';
import { cn } from '../../utils/cn';

export const Input = ({ label, error, className, icon, ...props }) => {
  return (
    <div className="mb-4">
      {label && (
        <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          className={cn(
            "w-full bg-slate-100 dark:bg-slate-800/80 border border-slate-600/50 rounded-lg px-3.5 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 transition-all duration-200",
            "focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 focus:bg-slate-100 dark:focus:bg-slate-800",
            error && "border-red-500 focus:border-red-500 focus:ring-red-500/30",
            icon && "pl-10", 
            className
          )}
          {...props}
        />
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
            {icon}
          </div>
        )}
      </div>
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  );
};