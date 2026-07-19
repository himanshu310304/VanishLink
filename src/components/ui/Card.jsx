import React from 'react';
import { cn } from '../../utils/cn';

export const Card = ({ children, className, ...props }) => {
  return (
    <div 
      className={cn(
        'rounded-xl border border-slate-300 dark:border-slate-700/50 bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl p-6 shadow-2xl shadow-black/20 hover:shadow-emerald-500/10 hover:border-slate-600/50 transition-all duration-300',
        className
      )} 
      {...props}
    >
      {children}
    </div>
  );
};