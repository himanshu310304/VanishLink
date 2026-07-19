import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Bell, User, LogOut, Settings, ShieldAlert, X } from 'lucide-react';
import { ThemeToggle } from '../ui/ThemeToggle';
import { Link } from 'react-router-dom';

export const Navbar = () => {
  const { user, logout } = useAuth();
  
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);

  const notifRef = useRef(null);
  const profileRef = useRef(null);

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = () => {
    setShowNotifications(!showNotifications);
    setHasUnread(false);
  };

  const handleProfileClick = () => {
    setShowProfileMenu(!showProfileMenu);
  };

  return (
    <header className="h-16 border-b border-slate-300 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-900/60 backdrop-blur-xl sticky top-0 z-50 px-4 md:px-8 flex items-center justify-between shadow-lg shadow-black/10">

      {/* Right Side Actions */}
      <div className="flex items-center gap-4 ml-auto relative">
        <ThemeToggle />
        
        {/* Notification Bell */}
        <div className="relative" ref={notifRef}>
          <button 
            onClick={handleNotificationClick}
            className="relative p-2 text-slate-600 dark:text-slate-400 hover:text-emerald-400 transition-colors hover:bg-slate-700/30 rounded-lg duration-200"
          >
            <Bell className="w-5 h-5" />
            {hasUnread && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-lg shadow-emerald-500/50 animate-pulse"></span>
            )}
          </button>
          
          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl py-2 z-50 overflow-hidden transform origin-top-right transition-all animate-in fade-in zoom-in-95 duration-200">
              <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Notifications</h3>
                <button onClick={() => setShowNotifications(false)} className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="max-h-[300px] overflow-y-auto">
                <div className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800/50 transition-colors cursor-pointer">
                  <div className="flex gap-3">
                    <div className="mt-1 w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <ShieldAlert className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">Welcome to Deadman</p>
                      <p className="text-xs text-slate-500 mt-0.5">Your secure link management system is ready to use.</p>
                      <p className="text-[10px] text-slate-400 mt-1">Just now</p>
                    </div>
                  </div>
                </div>
                <div className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer">
                  <div className="flex gap-3">
                    <div className="mt-1 w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-slate-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">New Login Detected</p>
                      <p className="text-xs text-slate-500 mt-0.5">We noticed a login from this device.</p>
                      <p className="text-[10px] text-slate-400 mt-1">Today</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="h-6 w-px bg-slate-700/50 mx-2 hidden sm:block"></div>

        {/* User Profile */}
        <div className="relative" ref={profileRef}>
          <div className="flex items-center gap-3 cursor-pointer group" onClick={handleProfileClick}>
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-slate-900 dark:text-white leading-none group-hover:text-emerald-500 transition-colors">{user?.name || 'Agent'}</p>
              <p className="text-xs text-slate-500 mt-1 capitalize">{user?.role || 'User'}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-linear-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-slate-900 dark:text-white font-bold text-sm shadow-md group-hover:shadow-emerald-500/30 transition-all group-hover:scale-105 border border-emerald-400/20">
              {user?.name?.[0] || <User className="w-5 h-5" />}
            </div>
          </div>

          {/* Profile Dropdown */}
          {showProfileMenu && (
            <div className="absolute right-0 mt-3 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl py-2 z-50 transform origin-top-right transition-all animate-in fade-in zoom-in-95 duration-200">
              <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-800 mb-2">
                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{user?.name}</p>
                <p className="text-xs text-slate-500 truncate">{user?.email}</p>
              </div>
              
              <Link to="/dashboard/settings" className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors" onClick={() => setShowProfileMenu(false)}>
                <Settings className="w-4 h-4" />
                Profile Settings
              </Link>
              <Link to="/dashboard/settings" className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors" onClick={() => setShowProfileMenu(false)}>
                <ShieldAlert className="w-4 h-4" />
                Security
              </Link>
              
              <div className="h-px bg-slate-200 dark:bg-slate-800 my-2"></div>
              
              <button onClick={() => { setShowProfileMenu(false); logout(); }} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          )}
        </div>

      </div>
    </header>
  );
};