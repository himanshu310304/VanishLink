import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { 
  LayoutDashboard, 
  Link as LinkIcon, 
  BarChart2, 
  LogOut, 
  Settings, 
  Menu, 
  X, 
  Shield,
  Globe,
  Flag
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { Navbar } from './Navbar';

const SidebarItem = ({ icon: Icon, label, to, active, onClick }) => (
  <Link
    to={to}
    onClick={onClick}
    className={cn(
      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 mb-1.5",
      active 
        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-500/10" 
        : "text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:bg-slate-800/40 border border-transparent hover:border-slate-300 dark:border-slate-700/50"
    )}
  >
    <Icon className="w-4 h-4 shrink-0" />
    {label}
  </Link>
);

const DashboardLayout = () => {
  const { logout } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-slate-950 flex text-slate-800 dark:text-slate-200 font-sans relative">
      {/* Ambient background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -left-40 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"></div>
      </div>

      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-50 dark:bg-black/50 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed md:static inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-900/90 backdrop-blur-xl border-r border-slate-300 dark:border-slate-700/50 shadow-2xl shadow-black/20 transition-transform duration-200 ease-in-out flex flex-col",
        "md:translate-x-0 relative",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        
        <div className="h-16 flex items-center px-6 border-b border-slate-300 dark:border-slate-700/50">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xl tracking-tight">
            <Shield className="w-6 h-6" />
            <span>VanishLink</span>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-6 overflow-y-auto">

          {/* OPERATIONS */}
          <div>
            <p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Operations
            </p>

            <SidebarItem 
              icon={LayoutDashboard} 
              label="Overview" 
              to="/dashboard"
              active={location.pathname === '/dashboard'}
              onClick={() => setIsMobileMenuOpen(false)}
            />

            <SidebarItem 
              icon={LinkIcon} 
              label="My Links" 
              to="/dashboard/links"
              active={location.pathname.startsWith('/dashboard/links')}
              onClick={() => setIsMobileMenuOpen(false)}
            />

            <SidebarItem 
              icon={Globe} 
              label="Browse Community" 
              to="/dashboard/browse"
              active={location.pathname.startsWith('/dashboard/browse')}
              onClick={() => setIsMobileMenuOpen(false)}
            />

            <SidebarItem 
              icon={Flag} 
              label="My Reports" 
              to="/dashboard/my-reports"
              active={location.pathname.startsWith('/dashboard/my-reports')}
              onClick={() => setIsMobileMenuOpen(false)}
            />

            <SidebarItem 
              icon={BarChart2} 
              label="Analytics" 
              to="/dashboard/analytics"
              active={location.pathname.startsWith('/dashboard/analytics')}
              onClick={() => setIsMobileMenuOpen(false)}
            />



          </div>

          {/* SYSTEM */}
          <div>
            <p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              System
            </p>

            <SidebarItem 
              icon={Settings} 
              label="Settings" 
              to="/dashboard/settings"
              active={location.pathname === '/dashboard/settings'}
              onClick={() => setIsMobileMenuOpen(false)}
            />
          </div>

        </nav>

        <div className="p-4 border-t border-slate-300 dark:border-slate-700/50">
          <button 
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-red-400 hover:bg-red-500/10 hover:border-red-500/30 rounded-lg transition-all duration-200 border border-transparent"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>

      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">

        {/* Mobile Header */}
        <div className="md:hidden h-16 border-b border-slate-300 dark:border-slate-700/50 flex items-center px-4 justify-between bg-white dark:bg-slate-900/40 backdrop-blur-xl sticky top-0 z-20">
          <div className="flex items-center gap-2 text-emerald-400 font-bold">
            <Shield className="w-5 h-5" />
            <span>VanishLink</span>
          </div>

          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200 transition-colors">
            {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        <Navbar />

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            <Outlet />
          </div>
        </main>

      </div>
    </div>
  );
};

export default DashboardLayout;
