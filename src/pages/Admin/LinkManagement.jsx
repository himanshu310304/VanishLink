import React, { useEffect, useState } from 'react';
import {
  Search,
  Filter,
  Trash2,
  ShieldOff,
  RefreshCcw,
  Flag,
  Eye,
  AlertTriangle,
} from 'lucide-react';
import api from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  active: 'bg-emerald-500/10 text-emerald-400',
  expired: 'bg-slate-500/10 text-slate-700 dark:text-slate-300',
  blocked: 'bg-red-500/10 text-red-400',
};

const MODERATION_COLORS = {
  clean: 'bg-slate-700/40 text-slate-800 dark:text-slate-200',
  flagged: 'bg-amber-500/10 text-amber-400',
  removed: 'bg-red-500/10 text-red-400',
};

const LinkManagement = () => {
  const [links, setLinks] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [moderationFilter, setModerationFilter] = useState('');
  const [riskFilter, setRiskFilter] = useState(''); // '' | 'flagged' | 'high'
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const [selectedIds, setSelectedIds] = useState([]);
  const [openRuleForId, setOpenRuleForId] = useState(null);

  const fetchLinks = async (opts = {}) => {
    const nextPage = opts.page ?? page;
    const nextSearch = opts.search ?? search;
    const nextStatus = opts.status ?? statusFilter;
    const nextModeration = opts.moderation ?? moderationFilter;
    const nextRisk = opts.risk ?? riskFilter;

    setLoading(true);
    try {
      const res = await api.get('/admin/links', {
        params: {
          search: nextSearch,
          status: nextStatus || undefined,
          moderation: nextModeration || undefined,
          risk: nextRisk || undefined,
          page: nextPage,
          limit: 20,
        },
      });

      const data = res.data;

      let list = [];
      let totalCount = 0;
      let totalPages = 1;
      let currentPage = nextPage || 1;

      if (Array.isArray(data)) {
        list = data;
        totalCount = data.length;
        totalPages = 1;
        currentPage = 1;
      } else if (data && typeof data === 'object') {
        if (Array.isArray(data.links)) list = data.links;
        else if (Array.isArray(data.items)) list = data.items;
        else if (Array.isArray(data.data)) list = data.data;
        else list = [];

        if (typeof data.totalLinks === 'number') totalCount = data.totalLinks;
        else if (typeof data.total === 'number') totalCount = data.total;
        else totalCount = list.length;

        if (typeof data.totalPages === 'number') totalPages = data.totalPages;
        else if (typeof data.pages === 'number') totalPages = data.pages;
        else totalPages = 1;

        if (typeof data.page === 'number') currentPage = data.page;
      }

      setLinks(list);
      setTotal(totalCount);
      setPages(totalPages || 1);
      setPage(currentPage || 1);

      if (opts.search !== undefined) setSearch(nextSearch);
      if (opts.status !== undefined) setStatusFilter(nextStatus);
      if (opts.moderation !== undefined) setModerationFilter(nextModeration);
      if (opts.risk !== undefined) setRiskFilter(nextRisk);

      setSelectedIds([]);
      setOpenRuleForId(null);
    } catch (err) {
      console.error('Admin links fetch error:', err);
      toast.error(
        err.response?.data?.message || 'Failed to load links'
      );
      setLinks([]);
      setTotal(0);
      setPages(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLinks({ page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchLinks({ page: 1, search });
  };

  const handleStatusChange = (e) => {
    const value = e.target.value;
    fetchLinks({ page: 1, status: value });
  };

  const handleModerationChange = (e) => {
    const value = e.target.value;
    fetchLinks({ page: 1, moderation: value });
  };

  const handleRiskChange = (e) => {
    const value = e.target.value;
    fetchLinks({ page: 1, risk: value });
  };

  const updateStatus = async (id, newStatus) => {
    try {
      const res = await api.patch(`/admin/links/${id}`, {
        status: newStatus,
      });
      setLinks((prev) =>
        prev.map((l) => (l._id === id ? res.data : l))
      );
      toast.success(`Link marked as ${newStatus}`);
    } catch (err) {
      console.error('Update status error:', err);
      toast.error(
        err.response?.data?.message || 'Failed to update status'
      );
    }
  };

  const deleteLink = async (id) => {
    if (!window.confirm('Delete this link permanently?')) return;
    try {
      await api.delete(`/admin/links/${id}`);
      setLinks((prev) => prev.filter((l) => l._id !== id));
      setTotal((t) => Math.max(0, t - 1));
      setSelectedIds((prev) => prev.filter((x) => x !== id));
      if (openRuleForId === id) setOpenRuleForId(null);
      toast.success('Link deleted');
    } catch (err) {
      console.error('Delete link error:', err);
      toast.error(
        err.response?.data?.message || 'Failed to delete link'
      );
    }
  };

  const flagLink = async (id) => {
    const reason =
      window.prompt(
        'Enter a reason for flagging this link (optional):'
      ) || undefined;

    try {
      const res = await api.post(`/admin/links/${id}/flag`, {
        reason,
      });
      setLinks((prev) =>
        prev.map((l) => (l._id === id ? res.data : l))
      );
      toast.success('Link flagged for review');
    } catch (err) {
      console.error('Flag link error:', err);
      toast.error(
        err.response?.data?.message || 'Failed to flag link'
      );
    }
  };

  const handleBulkModeration = async (action) => {
    if (!selectedIds.length) return;

    if (
      action === 'block' &&
      !window.confirm(
        `Block ${selectedIds.length} selected link(s)? They will no longer be accessible.`
      )
    ) {
      return;
    }

    if (
      action === 'flag' &&
      !window.confirm(
        `Flag ${selectedIds.length} selected link(s) for review?`
      )
    ) {
      return;
    }

    let reason;
    if (action === 'flag') {
      reason =
        window.prompt(
          'Reason for flagging these links? (optional):'
        ) || undefined;
    }

    try {
      await api.post('/admin/links/bulk-moderate', {
        ids: selectedIds,
        action,
        reason,
      });

      toast.success(
        action === 'flag'
          ? 'Selected links flagged'
          : 'Selected links blocked'
      );
      fetchLinks({ page });
    } catch (err) {
      console.error('Bulk moderate error:', err);
      toast.error(
        err.response?.data?.message || 'Failed to apply bulk action'
      );
    }
  };

  const formatDate = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString();
  };

  const formatClicks = (link) =>
    typeof link.clicks === 'number' ? link.clicks : 0;

  const onPrevPage = () => {
    if (page > 1) fetchLinks({ page: page - 1 });
  };

  const onNextPage = () => {
    if (page < pages) fetchLinks({ page: page + 1 });
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (!links.length) return;
    if (selectedIds.length === links.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(links.map((l) => l._id));
    }
  };

  const allSelected =
    links.length > 0 && selectedIds.length === links.length;

  const renderRuleSummary = (cr) => {
    if (!cr || !cr.enabled) {
      return (
        <p className="text-xs text-slate-500">
          No dynamic rules configured for this link.
        </p>
      );
    }

    const rows = [];

    if (cr.deviceRules) {
      const dParts = [];
      if (cr.deviceRules.mobileUrl)
        dParts.push(`Mobile → ${cr.deviceRules.mobileUrl}`);
      if (cr.deviceRules.desktopUrl)
        dParts.push(`Desktop → ${cr.deviceRules.desktopUrl}`);
      if (cr.deviceRules.tabletUrl)
        dParts.push(`Tablet → ${cr.deviceRules.tabletUrl}`);
      if (cr.deviceRules.botUrl)
        dParts.push(`Bot → ${cr.deviceRules.botUrl}`);
      if (dParts.length) {
        rows.push({
          label: 'Device rules',
          value: dParts.join(' · '),
        });
      }
    }

    if (cr.dayTypeRules) {
      const dParts = [];
      if (cr.dayTypeRules.weekdayUrl)
        dParts.push(
          `Weekdays (Mon–Fri) → ${cr.dayTypeRules.weekdayUrl}`
        );
      if (cr.dayTypeRules.weekendUrl)
        dParts.push(
          `Weekend (Sat–Sun) → ${cr.dayTypeRules.weekendUrl}`
        );
      if (dParts.length) {
        rows.push({
          label: 'Day-type rules',
          value: dParts.join(' · '),
        });
      }
    }

    if (Array.isArray(cr.timeOfDayRules) && cr.timeOfDayRules.length) {
      rows.push({
        label: 'Time-of-day',
        value: cr.timeOfDayRules
          .map(
            (w) =>
              `[${w.startHour}:00 → ${w.endHour}:00) → ${w.url}`
          )
          .join(' · '),
      });
    }

    if (Array.isArray(cr.clickRules) && cr.clickRules.length) {
      rows.push({
        label: 'Click-count',
        value: cr.clickRules
          .map((r) => {
            const min = r.minClicks ?? 0;
            const max =
              typeof r.maxClicks === 'number'
                ? r.maxClicks
                : '∞';
            return `[${min}–${max}] clicks → ${r.url}`;
          })
          .join(' · '),
      });
    }

    if (!rows.length) {
      return (
        <p className="text-xs text-slate-500">
          Dynamic rules are enabled but no specific rule is configured.
        </p>
      );
    }

    return (
      <div className="space-y-1">
        {rows.map((r, idx) => (
          <div
            key={idx}
            className="flex flex-col md:flex-row md:items-baseline md:gap-2 text-xs"
          >
            <span className="font-medium text-slate-700 dark:text-slate-300 min-w-[110px]">
              {r.label}:
            </span>
            <span className="text-slate-600 dark:text-slate-400">{r.value}</span>
          </div>
        ))}
      </div>
    );
  };

  const renderRiskBadge = (link) => {
    // flagged by AI or admin
    const isFlagged =
      link.isFlagged === true || link.moderationStatus === 'flagged';

    const verdict = link.safetyVerdict || null;
    const score =
      typeof link.safetyScore === 'number' ? link.safetyScore : null;

    if (isFlagged) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-500/10 text-red-400 border border-red-500/40">
          <AlertTriangle className="w-3 h-3" />
          FLAGGED
        </span>
      );
    }

    if (!verdict) {
      return (
        <span className="text-[11px] text-slate-500">
          —
        </span>
      );
    }

    if (verdict === 'low') {
      return (
        <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/40">
          LOW RISK{score !== null ? ` · ${score}` : ''}
        </span>
      );
    }

    if (verdict === 'medium') {
      return (
        <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/40">
          MEDIUM RISK{score !== null ? ` · ${score}` : ''}
        </span>
      );
    }

    // high
    return (
      <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-500/10 text-red-400 border border-red-500/40">
        HIGH RISK{score !== null ? ` · ${score}` : ''}
      </span>
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 relative">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
            Link Management
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Search, audit, and moderate all secure endpoints in the
            system.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchLinks({ page })}
          disabled={loading}
          className="w-fit"
        >
          <RefreshCcw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
        <div className="absolute -top-4 -left-4 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl\"></div>
      </div>

      {/* Filters */}
      <Card className="bg-linear-to-br from-slate-800/90 to-slate-900/90 border border-slate-300 dark:border-slate-700/50">
        <form
          onSubmit={handleSearchSubmit}
          className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
        >
          <div className="flex-1 w-full flex items-center gap-2">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                className="w-full bg-slate-100 dark:bg-slate-800/80 border border-slate-600/50 rounded-lg pl-9 pr-3 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 transition-all"
                placeholder="Search by slug, title, or URL..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Status filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <select
                className="bg-white/5 border border-slate-200/10 rounded-md pl-9 pr-3 py-2 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                value={statusFilter}
                onChange={handleStatusChange}
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>

            {/* Moderation filter */}
            <div className="relative">
              <select
                className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs uppercase tracking-wide text-slate-700 dark:text-slate-300 focus:outline-none focus:border-emerald-500"
                value={moderationFilter}
                onChange={handleModerationChange}
              >
                <option value="">All Moderation</option>
                <option value="flagged">Flagged</option>
                <option value="removed">Removed</option>
              </select>
            </div>

            {/* Risk filter */}
            <div className="relative">
              <AlertTriangle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <select
                className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs uppercase tracking-wide text-slate-700 dark:text-slate-300 focus:outline-none focus:border-emerald-500"
                value={riskFilter}
                onChange={handleRiskChange}
              >
                <option value="">All risk</option>
                <option value="flagged">Flagged only</option>
                <option value="high">High risk only</option>
              </select>
            </div>

            <Button type="submit" size="sm" disabled={loading}>
              Search
            </Button>
          </div>
        </form>
      </Card>

      {/* Bulk actions bar */}
      {selectedIds.length > 0 && (
        <Card className="bg-white dark:bg-slate-900 border border-amber-600/40 flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-4 py-3">
          <div className="text-xs text-amber-200">
            {selectedIds.length} link
            {selectedIds.length > 1 ? 's' : ''} selected for
            moderation.
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              className="border-amber-500/60 text-amber-300 hover:bg-amber-500/10"
              onClick={() => handleBulkModeration('flag')}
              disabled={loading}
            >
              <Flag className="w-3 h-3 mr-1" />
              Flag selected
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-red-500/60 text-red-300 hover:bg-red-500/10"
              onClick={() => handleBulkModeration('block')}
              disabled={loading}
            >
              <ShieldOff className="w-3 h-3 mr-1" />
              Block selected
            </Button>
          </div>
        </Card>
      )}

      {/* Table */}
      <Card className="bg-white dark:bg-slate-900/40 backdrop-blur-xl border-slate-300 dark:border-slate-700/50 hover:border-slate-300 dark:border-slate-700 transition-all duration-300">
        <div className="flex items-center justify-between mb-4 p-6 pb-0">
          <div className="text-sm text-slate-600 dark:text-slate-400">
            Total links:{' '}
            <span className="text-slate-100 font-semibold">
              {total}
            </span>
          </div>
          <div className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-800/50 px-2 py-1 rounded">
            Page {page} of {pages}
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr>
                <th className="px-4 py-2">
                  <input
                    type="checkbox"
                    className="accent-emerald-500"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="px-4 py-2 text-left">Slug</th>
                <th className="px-4 py-2 text-left">Destination</th>
                <th className="px-4 py-2 text-center">Status</th>
                <th className="px-4 py-2 text-center">Moderation</th>
                <th className="px-4 py-2 text-center">Risk</th>
                <th className="px-4 py-2 text-center">Clicks</th>
                <th className="px-4 py-2 text-center">Created</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td
                    colSpan={9}
                    className="py-8 text-center text-slate-500 text-sm"
                  >
                    Loading links…
                  </td>
                </tr>
              )}

              {!loading && links.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="py-8 text-center text-slate-500 text-sm"
                  >
                    No links found. Try adjusting your filters.
                  </td>
                </tr>
              )}

              {!loading &&
                links.map((link) => {
                  const isSelected = selectedIds.includes(link._id);
                  const moderation =
                    link.moderationStatus || 'clean';
                  const hasDynamic =
                    link.conditionalRedirect &&
                    link.conditionalRedirect.enabled;

                  const isOpen = openRuleForId === link._id;

                  return (
                    <React.Fragment key={link._id}>
                      <tr className="border-t border-slate-200 dark:border-slate-800">
                        <td className="px-4 py-2">
                          <input
                            type="checkbox"
                            className="accent-emerald-500"
                            checked={isSelected}
                            onChange={() => toggleSelect(link._id)}
                          />
                        </td>
                        <td className="px-4 py-2 font-mono text-xs text-emerald-400">
                          /{link.slug}
                          {hasDynamic && (
                            <span className="ml-2 inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-300">
                              dynamic
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 max-w-md truncate text-sm text-slate-800 dark:text-slate-200">
                          {link.title || link.targetUrl}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <span
                            className={
                              'inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ' +
                              (STATUS_COLORS[link.status] ||
                                'bg-slate-700 text-slate-100')
                            }
                          >
                            {link.status || 'unknown'}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-center">
                          <span
                            className={
                              'inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ' +
                              (MODERATION_COLORS[moderation] ||
                                MODERATION_COLORS.clean)
                            }
                          >
                            {moderation}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-center">
                          {renderRiskBadge(link)}
                        </td>
                        <td className="px-4 py-2 text-center text-sm">
                          {formatClicks(link)}
                        </td>
                        <td className="px-4 py-2 text-center text-xs text-slate-600 dark:text-slate-400">
                          {formatDate(link.createdAt)}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <div className="flex justify-end gap-2">
                            {hasDynamic && (
                              <Button
                                variant="outline"
                                size="icon"
                                className="border-sky-500/40 text-sky-300 hover:bg-sky-500/10"
                                onClick={() =>
                                  setOpenRuleForId(
                                    isOpen ? null : link._id
                                  )
                                }
                                title="View dynamic rules"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            )}

                            <Button
                              variant="outline"
                              size="icon"
                              className="border-amber-500/40 text-amber-300 hover:bg-amber-500/10"
                              onClick={() => flagLink(link._id)}
                              title="Flag for review"
                            >
                              <Flag className="w-4 h-4" />
                            </Button>

                            {link.status !== 'blocked' ? (
                              <Button
                                variant="outline"
                                size="icon"
                                className="border-red-500/40 text-red-400 hover:bg-red-500/10"
                                onClick={() =>
                                  updateStatus(link._id, 'blocked')
                                }
                                title="Block link"
                              >
                                <ShieldOff className="w-4 h-4" />
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="icon"
                                className="border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
                                onClick={() =>
                                  updateStatus(link._id, 'active')
                                }
                                title="Unblock link"
                              >
                                <ShieldOff className="w-4 h-4 rotate-180" />
                              </Button>
                            )}

                            <Button
                              variant="outline"
                              size="icon"
                              className="border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-red-500/10 hover:text-red-400"
                              onClick={() => deleteLink(link._id)}
                              title="Delete link"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>

                      {/* rules details row */}
                      {hasDynamic && isOpen && (
                        <tr className="border-t border-slate-900 bg-slate-50 dark:bg-slate-950/60">
                          <td
                            className="px-4 py-3 text-xs text-slate-500"
                            colSpan={9}
                          >
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                                  Dynamic redirect rules
                                </span>
                                <button
                                  type="button"
                                  className="text-[11px] text-slate-500 hover:text-slate-700 dark:text-slate-300"
                                  onClick={() =>
                                    setOpenRuleForId(null)
                                  }
                                >
                                  Close
                                </button>
                              </div>
                              {renderRuleSummary(
                                link.conditionalRedirect
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {pages > 1 && (
          <div className="mt-4 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
            <Button
              variant="outline"
              size="sm"
              onClick={onPrevPage}
              disabled={page === 1 || loading}
            >
              Prev
            </Button>
            <span>
              Page {page} of {pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={onNextPage}
              disabled={page === pages || loading}
            >
              Next
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default LinkManagement;
