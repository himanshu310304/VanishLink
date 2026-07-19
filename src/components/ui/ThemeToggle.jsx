import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

export const ThemeToggle = ({ className = '' }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`relative p-2 rounded-lg text-slate-500 hover:text-emerald-500 hover:bg-slate-200 dark:hover:bg-slate-100 dark:bg-slate-800 transition-colors duration-200 focus:outline-none ${className}`}
      aria-label="Toggle Dark Mode"
    >
      {theme === 'dark' ? (
        <Sun className="w-5 h-5 animate-in fade-in zoom-in duration-300" />
      ) : (
        <Moon className="w-5 h-5 animate-in fade-in zoom-in duration-300" />
      )}
    </button>
  );
};
