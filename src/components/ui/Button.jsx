import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

export const Button = ({ 
  children, 
  isLoading, 
  variant = 'primary', 
  size = 'md',
  className, 
  ...props 
}) => {
  const baseStyles = "rounded-md font-medium transition-colors duration-150 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed";
  
  const sizes = {
    sm: "py-1.5 px-3 text-xs",
    md: "py-2 px-4 text-sm",
    lg: "py-2.5 px-6 text-base"
  };
  
  const variants = {
    primary: "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-slate-900 dark:text-white shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/40 hover:scale-[1.02]",
    secondary: "bg-slate-700/50 hover:bg-slate-600/50 text-slate-100 border border-slate-600/50 hover:border-slate-500/50 shadow-lg shadow-black/20",
    danger: "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-slate-900 dark:text-white shadow-lg shadow-red-500/25 hover:scale-[1.02]",
    ghost: "bg-transparent hover:bg-slate-700/30 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:text-white",
    outline: "bg-transparent border-2 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-400 hover:text-emerald-300 shadow-lg shadow-emerald-500/10"
  };

  return (
    <button 
      className={cn(baseStyles, sizes[size], variants[variant], className)} 
      disabled={isLoading} 
      {...props}
    >
      {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
      {children}
    </button>
  );
};