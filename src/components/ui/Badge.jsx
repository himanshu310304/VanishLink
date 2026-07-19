import React from 'react';
import { cn } from '../../utils/cn';

export const Badge = ({ children, variant = 'default', className }) => {
  const variants = {
    default: 'bg-slate-700/60 text-slate-100 border-slate-600/50 shadow-sm',
    success: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-500/10',
    warning: 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-500/10',
    danger: 'bg-red-500/20 text-red-300 border-red-500/40 shadow-sm shadow-red-500/10',
  };

  return (
    <span className={cn(
      "inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors",
      variants[variant],
      className
    )}>
      {children}
    </span>
  );
};