// src/pages/Admin/UserControls.jsx
import React, { useEffect, useState } from 'react';
import { Shield, UserX, Search, ChevronDown } from 'lucide-react';
import api from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import toast from 'react-hot-toast';
import { adminSocket } from '../../services/adminSocket';

const ROLE_COLORS = {
  regular: 'bg-slate-700/60 text-slate-100',
  premium: 'bg-indigo-500/20 text-indigo-300',
  admin: 'bg-emerald-500/20 text-emerald-300',
};

const STATUS_COLORS = {
  active: 'text-emerald-400',
  banned: 'text-red-400',
};

const UserControls = () => {
  const [users, setUsers] = useState([]);
  const [rolesMeta, setRolesMeta] = useState([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/users', {
        params: {
          search: search || undefined,
          role: roleFilter || undefined,
          status: statusFilter || undefined,
        },
      });
      setUsers(res.data.users || []);
    } catch (err) {
      console.error('Error fetching admin users:', err);
      toast.error(
        err.response?.data?.message || 'Failed to load users'
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchRolesMeta = async () => {
    try {
      const res = await api.get('/admin/users/roles');
      setRolesMeta(res.data.roles || []);
    } catch (err) {
      console.error('Error fetching role features:', err);
    }
  };

  // Initial load
  useEffect(() => {
    fetchUsers();
    fetchRolesMeta();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 🔴 Real-time socket listeners
  useEffect(() => {
    const handleUserAdded = (user) => {
      setUsers((prev) => {
        if (prev.find((u) => u._id === user._id)) return prev;
        return [user, ...prev];
      });
    };

    const handleUserUpdated = (user) => {
      setUsers((prev) =>
        prev.map((u) => (u._id === user._id ? user : u))
      );
    };

    adminSocket.on('admin:user-added', handleUserAdded);
    adminSocket.on('admin:user-updated', handleUserUpdated);

    return () => {
      adminSocket.off('admin:user-added', handleUserAdded);
      adminSocket.off('admin:user-updated', handleUserUpdated);
    };
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchUsers();
  };

  const handleRoleChange = async (id, newRole) => {
    try {
      setSavingId(id);
      const res = await api.patch(`/admin/users/${id}`, {
        role: newRole,
      });
      setUsers((prev) =>
        prev.map((u) => (u._id === id ? res.data : u))
      );
      toast.success(`Role updated to ${newRole}`);
    } catch (err) {
      console.error('Error updating role:', err);
      toast.error(
        err.response?.data?.message || 'Failed to update role'
      );
    } finally {
      setSavingId(null);
    }
  };

  const handleStatusToggle = async (id) => {
    const user = users.find((u) => u._id === id);
    if (!user) return;

    const nextStatus = user.status === 'active' ? 'banned' : 'active';

    try {
      setSavingId(id);
      const res = await api.patch(`/admin/users/${id}`, {
        status: nextStatus,
      });
      setUsers((prev) =>
        prev.map((u) => (u._id === id ? res.data : u))
      );
      toast.success(
        nextStatus === 'active' ? 'User reactivated' : 'User banned'
      );
    } catch (err) {
      console.error('Error toggling status:', err);
      toast.error(
        err.response?.data?.message || 'Failed to update status'
      );
    } finally {
      setSavingId(null);
    }
  };

  const formatLastLogin = (iso) => {
    if (!iso) return 'Never';
    const d = new Date(iso);
    return d.toLocaleString();
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 relative">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
            User Access Controls
          </h1>
          <p className="text-lg text-slate-700 dark:text-slate-300">
            Manage roles and user permissions
          </p>
        </div>

        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 border border-emerald-500/30 rounded-full\">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse\"></div>\n          <span className="text-emerald-300 font-medium\">Active</span>
        </div>
        <div className="absolute -top-4 -right-4 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl\"></div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left: user list */}
        <Card className="xl:col-span-2 bg-linear-to-br from-slate-800/90 to-slate-900/90 border border-slate-300 dark:border-slate-700/50">
          {/* Filters */}
          <form
            onSubmit={handleSearchSubmit}
            className="flex flex-col md:flex-row gap-3 items-center justify-between mb-4"
          >
            <div className="flex-1 w-full flex items-center gap-2">
              <div className="relative w-full max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  className="w-full bg-slate-100 dark:bg-slate-800/80 border border-slate-600/50 rounded-lg pl-9 pr-3 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 transition-all"
                  placeholder="Search by name or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <select
                className="bg-slate-100 dark:bg-slate-800/80 border border-slate-600/50 rounded-lg px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 transition-all"
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setTimeout(fetchUsers, 0);
                }}
              >
                <option value="">All Roles</option>
                <option value="regular">Regular</option>
                <option value="premium">Premium</option>
                <option value="admin">Admin</option>
              </select>

              <select
                className="bg-white/5 border border-slate-200/10 rounded-md px-3 py-2 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:border-emerald-500"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setTimeout(fetchUsers, 0);
                }}
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="banned">Banned</option>
              </select>

              <Button type="submit" size="sm" disabled={loading}>
                Apply
              </Button>
            </div>
          </form>

          {/* User list */}
          <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40">
            <div className="divide-y divide-slate-800">
              {loading && (
                <div className="py-6 text-center text-sm text-slate-500">
                  Loading users…
                </div>
              )}

              {!loading && users.length === 0 && (
                <div className="py-6 text-center text-sm text-slate-500">
                  No users found. Add admin users to the database to
                  manage access.
                </div>
              )}

              {!loading &&
                users.map((user) => (
                  <div
                    key={user._id}
                    className="flex items-center justify-between px-4 py-3 hover:bg-white dark:bg-slate-900/60"
                  >
                    <div>
                      <div className="text-sm font-medium text-slate-100">
                        {user.name}
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-400">
                        {user.email}
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      {/* Role */}
                      <div className="flex flex-col items-start">
                        <span className="text-[11px] text-slate-500 mb-1">
                          Role
                        </span>
                        <div className="relative inline-flex items-center">
                          <select
                            value={user.role}
                            disabled={savingId === user._id}
                            onChange={(e) =>
                              handleRoleChange(user._id, e.target.value)
                            }
                            className={
                              'appearance-none bg-white dark:bg-slate-900/80 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 pr-7 text-xs font-medium ' +
                              (ROLE_COLORS[user.role] ||
                                'bg-slate-100 dark:bg-slate-800 text-slate-100')
                            }
                          >
                            <option value="regular">Regular</option>
                            <option value="premium">Premium</option>
                            <option value="admin">Admin</option>
                          </select>
                          <ChevronDown className="w-3 h-3 text-slate-600 dark:text-slate-400 absolute right-2 pointer-events-none" />
                        </div>
                      </div>

                      {/* Status */}
                      <div className="flex flex-col items-start">
                        <span className="text-[11px] text-slate-500 mb-1">
                          Status
                        </span>
                        <button
                          onClick={() => handleStatusToggle(user._id)}
                          disabled={savingId === user._id}
                          className="inline-flex items-center gap-1 text-xs"
                        >
                          <span
                            className={
                              STATUS_COLORS[user.status] ||
                              'text-slate-700 dark:text-slate-300'
                            }
                          >
                            {user.status === 'active'
                              ? 'Active'
                              : 'Banned'}
                          </span>
                          <UserX className="w-3 h-3 text-slate-500" />
                        </button>
                      </div>

                      {/* Last login */}
                      <div className="hidden md:flex flex-col items-end">
                        <span className="text-[11px] text-slate-500 mb-1">
                          Last login
                        </span>
                        <span className="text-xs text-slate-700 dark:text-slate-300">
                          {formatLastLogin(user.lastLoginAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </Card>

        {/* Right: role → feature matrix */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <div className="mb-3">
            <h2 className="text-sm font-semibold text-slate-100">
              Role Feature Matrix
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Each role comes with a fixed set of capabilities. Updating a
              user’s role instantly changes what they can do in Deadman.
            </p>
          </div>

          <div className="space-y-4">
            {rolesMeta.map((role) => (
              <div
                key={role.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 p-3"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge
                      className={
                        ROLE_COLORS[role.id] ||
                        'bg-slate-700/60 text-slate-100'
                      }
                    >
                      {role.label}
                    </Badge>
                  </div>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                  {role.description}
                </p>
                <ul className="space-y-1">
                  {role.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {rolesMeta.length === 0 && (
              <p className="text-xs text-slate-500">
                No role definitions loaded yet.
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default UserControls;
