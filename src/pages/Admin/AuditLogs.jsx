// src/pages/Admin/AuditLogs.jsx
import React, { useEffect, useState } from 'react';
import { Table } from '../../components/ui/Table';
import api from '../../services/api';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Filter, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const ACTION_OPTIONS = [
  { label: 'All Actions', value: '' },
  { label: 'Create Link', value: 'CREATE_LINK' },
  { label: 'Update Link', value: 'UPDATE_LINK' },
  { label: 'Delete Link', value: 'DELETE_LINK' },
  { label: 'Ban User', value: 'BAN_USER' },
  { label: 'Unban User', value: 'UNBAN_USER' },
  { label: 'Update Config', value: 'UPDATE_CONFIG' },
  { label: 'System Event', value: 'SYSTEM_EVENT' },
  { label: 'Login', value: 'LOGIN' },
  { label: 'Logout', value: 'LOGOUT' },
];

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);

  const [actionFilter, setActionFilter] = useState('');
  const [adminFilter, setAdminFilter] = useState('');
  const [searchTarget, setSearchTarget] = useState('');

  const loadLogs = async (opts = {}) => {
    try {
      setLoading(true);

      const params = {
        page: opts.page ?? page,
        limit,
      };

      if (actionFilter) params.action = actionFilter;
      if (adminFilter.trim()) params.admin = adminFilter.trim();
      if (searchTarget.trim()) params.search = searchTarget.trim();

      const res = await api.get('/admin/audit-logs', { params });

      setLogs(res.data.logs || []);
      setPage(res.data.page || 1);
      setTotalPages(res.data.totalPages || 1);
    } catch (err) {
      console.error('Failed to load audit logs', err);
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs({ page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionFilter]);

  const handleApplyFilters = () => {
    loadLogs({ page: 1 });
  };

  const handleResetFilters = () => {
    setActionFilter('');
    setAdminFilter('');
    setSearchTarget('');
    setPage(1);
    // then reload
    setTimeout(() => loadLogs({ page: 1 }), 0);
  };

  const handlePrev = () => {
    if (page <= 1) return;
    const nextPage = page - 1;
    setPage(nextPage);
    loadLogs({ page: nextPage });
  };

  const handleNext = () => {
    if (page >= totalPages) return;
    const nextPage = page + 1;
    setPage(nextPage);
    loadLogs({ page: nextPage });
  };

  // columns for your Table component
  const columns = [
    {
      header: 'Timestamp',
      accessor: 'time',
      className: 'font-mono text-xs text-slate-500',
    },
    {
      header: 'Action',
      accessor: 'action',
      className: 'font-bold text-slate-900 dark:text-white',
    },
    { header: 'Target', accessor: 'target' },
    { header: 'Admin', accessor: 'admin' },
    { header: 'IP Address', accessor: 'ip', className: 'font-mono' },
  ];

  // transform backend logs -> table rows
  const tableData = logs.map((log) => ({
    id: log._id,
    time: new Date(log.createdAt).toLocaleString(),
    action: log.action,
    target: log.target,
    admin: log.adminName || 'System',
    ip: log.ipAddress || 'Unknown',
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          System Audit Logs
        </h1>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => loadLogs({ page })}
            disabled={loading}
            className="flex items-center gap-1"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 text-sm">
          <Filter className="w-4 h-4 text-emerald-400" />
          <span>Filter logs</span>
        </div>

        <div className="grid md:grid-cols-4 gap-3">
          <div className="md:col-span-1">
            <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
              Action
            </label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {ACTION_OPTIONS.map((opt) => (
                <option key={opt.value || 'ALL'} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-1">
            <Input
              label="Admin"
              placeholder="Admin name"
              value={adminFilter}
              onChange={(e) => setAdminFilter(e.target.value)}
            />
          </div>

          <div className="md:col-span-2">
            <Input
              label="Target search"
              placeholder="slug: free-money, user: someone@site.com, etc."
              value={searchTarget}
              onChange={(e) => setSearchTarget(e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleResetFilters}
          >
            Reset
          </Button>
          <Button size="sm" onClick={handleApplyFilters}>
            Apply
          </Button>
        </div>
      </div>

      {/* Table + states */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-600 dark:text-slate-400 text-sm">
            Loading audit logs...
          </div>
        ) : tableData.length === 0 ? (
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-600 dark:text-slate-400 text-sm">
            No audit logs found for this filter.
          </div>
        ) : (
          <Table columns={columns} data={tableData} />
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 mt-2">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handlePrev}
              disabled={page <= 1 || loading}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleNext}
              disabled={page >= totalPages || loading}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditLogs;
