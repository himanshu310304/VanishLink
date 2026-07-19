import { LayoutDashboard, Link as LinkIcon, LogOut, Settings } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "../../utils/cn";

const Sidebar = () => {
  const links = [
    { name: "Overview", href: "/dashboard", icon: LayoutDashboard, end: true },
    { name: "My Links", href: "/dashboard/links", icon: LinkIcon },
    // { name: "Settings", href: "/dashboard/settings", icon: Settings }, // Future Phase
  ];

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 border-r border-gray-200 bg-white px-4 py-6">
      {/* Logo Area */}
      <div className="mb-8 flex items-center px-2">
        <div className="h-8 w-8 rounded-lg bg-slate-50 dark:bg-black"></div>
        <span className="ml-3 text-lg font-bold">Deadman Link</span>
      </div>

      {/* Navigation Links */}
      <nav className="space-y-1">
        {links.map((link) => (
          <NavLink
            key={link.href}
            to={link.href}
            end={link.end}
            className={({ isActive }) =>
              cn(
                "flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-slate-50 dark:bg-black text-slate-900 dark:text-white"
                  : "text-gray-700 hover:bg-gray-100"
              )
            }
          >
            <link.icon className="mr-3 h-5 w-5" />
            {link.name}
          </NavLink>
        ))}
      </nav>

      {/* Logout Button (Bottom) */}
      <div className="absolute bottom-6 left-0 w-full px-4">
        <button className="flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50">
          <LogOut className="mr-3 h-5 w-5" />
          Logout
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;