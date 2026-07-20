import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '../../utils/cn';

export const Input = ({ label, error, className, icon, type = 'text', ...props }) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className="mb-4">
      {label && (
        <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          type={inputType}
          className={cn(
            "w-full bg-slate-100 dark:bg-slate-800/80 border border-slate-600/50 rounded-lg py-2.5 text-slate-900 dark:text-white placeholder-slate-400 transition-all duration-200",
            "focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 focus:bg-slate-100 dark:focus:bg-slate-800",
            error && "border-red-500 focus:border-red-500 focus:ring-red-500/30",
            icon ? "pl-10" : "pl-3.5",
            isPassword ? "pr-10" : "pr-3.5",
            className
          )}
          {...props}
        />
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
            {icon}
          </div>
        )}
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  );
};