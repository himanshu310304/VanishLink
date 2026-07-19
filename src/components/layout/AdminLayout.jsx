import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { LayoutDashboard, Users, ShieldAlert, Settings, FileText, LogOut, Shield, Flag, Bell } from 'lucide-react';
import { cn } from '../../utils/cn';
import { ThemeToggle } from '../ui/ThemeToggle';

const SidebarItem = ({ icon: Icon, label, to, active }) => (
  <Link
    to={to}
    className={cn(
      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-1",
      active 
        ? "bg-red-500/10 text-red-400 border border-red-500/20" 
        : "text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:bg-slate-800/50 border border-transparent"
    )}
  >
    <Icon className="w-4 h-4" />
    {label}
  </Link>
);

const AdminLayout = () => {
  const { logout, user } = useAuth();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex text-slate-800 dark:text-slate-200 font-sans">
      <aside className="w-64 bg-slate-50 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 flex flex-col">
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 text-red-500 font-bold text-xl tracking-tight">
            <Shield className="w-6 h-6" />
            <span>VanishLink Admin</span>
          </div>
          <ThemeToggle />
        </div>

        <nav className="flex-1 px-4 py-6 space-y-6">
            <div>
                <p className="px-3 text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">System</p>
                <SidebarItem icon={LayoutDashboard} label="Overview" to="/admin" active={location.pathname === '/admin'} />
                <SidebarItem icon={ShieldAlert} label="Link Management" to="/admin/links" active={location.pathname === '/admin/links'} />
                <SidebarItem icon={Users} label="User Controls" to="/admin/users" active={location.pathname === '/admin/users'} />
            </div>
            <div>
                <p className="px-3 text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Security & Audit</p>
                <SidebarItem icon={Flag} label="Moderation Queue" to="/admin/moderation" active={location.pathname === '/admin/moderation'} />
                <SidebarItem icon={FileText} label="Audit Logs" to="/admin/logs" active={location.pathname === '/admin/logs'} />
                <SidebarItem icon={Shield} label="Security & IPs" to="/admin/security" active={location.pathname === '/admin/security'} />
                <SidebarItem icon={Settings} label="System Config" to="/admin/settings" active={location.pathname === '/admin/settings'} />
            </div>
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3 px-2 mb-4">
                <div className="w-8 h-8 rounded bg-red-900/20 text-red-500 flex items-center justify-center font-bold border border-red-200 dark:border-red-900/30">
                    {user?.avatar || 'AD'}
                </div>
                <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">Administrator</p>
                    <p className="text-xs text-slate-500">Root Access</p>
                </div>
            </div>
          <button 
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white hover:bg-slate-100 dark:bg-slate-800 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-8 bg-[#0B0F17]">
        <div className="max-w-7xl mx-auto space-y-8">
            <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;