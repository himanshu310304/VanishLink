import { useState, useEffect } from 'react';
import { Shield, Flag, CheckCircle, XCircle, Trash2, Ban, AlertTriangle } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { toast } from 'react-hot-toast';
import api from '../../services/api';

export default function Moderation() {
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedReports, setSelectedReports] = useState([]);
  const [filters, setFilters] = useState({
    status: 'PENDING',
    priority: '',
    reason: ''
  });
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [reviewingId, setReviewingId] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');

  useEffect(() => {
    fetchReports();
    fetchStats();
  }, [filters, pagination.page]);

  const fetchStats = async () => {
    try {
      const response = await api.get('/moderation/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchReports = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page,
        limit: 20,
        ...filters
      });
      
      const response = await api.get(`/moderation/reports?${params}`);
      setReports(response.data.reports);
      setPagination(response.data.pagination);
    } catch (error) {
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (reportId, status, actionTaken) => {
    try {
      await api.patch(`/moderation/reports/${reportId}`, {
        status,
        actionTaken,
        reviewNotes
      });
      
      toast.success(`Report ${status.toLowerCase()}`, {
        style: { background: '#10b981', color: 'white' }
      });
      
      setReviewingId(null);
      setReviewNotes('');
      fetchReports();
      fetchStats();
    } catch (error) {
      toast.error('Failed to review report');
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedReports.length === 0) {
      toast.error('No reports selected');
      return;
    }

    try {
      const response = await api.post('/moderation/reports/bulk', {
        reportIds: selectedReports,
        action,
        reviewNotes: `Bulk ${action.toLowerCase()}`
      });

      toast.success(response.data.message, {
        style: { background: '#10b981', color: 'white' }
      });

      setSelectedReports([]);
      fetchReports();
      fetchStats();
    } catch (error) {
      toast.error('Failed to perform bulk action');
    }
  };

  const toggleSelectReport = (reportId) => {
    setSelectedReports(prev => 
      prev.includes(reportId) 
        ? prev.filter(id => id !== reportId)
        : [...prev, reportId]
    );
  };

  const selectAll = () => {
    if (selectedReports.length === reports.length) {
      setSelectedReports([]);
    } else {
      setSelectedReports(reports.map(r => r._id));
    }
  };

  const getReasonColor = (reason) => {
    const colors = {
      SPAM: 'bg-yellow-500/20 text-yellow-400',
      MALWARE: 'bg-red-500/20 text-red-400',
      PHISHING: 'bg-red-500/20 text-red-400',
      INAPPROPRIATE_CONTENT: 'bg-orange-500/20 text-orange-400',
      ILLEGAL_CONTENT: 'bg-red-600/20 text-red-500',
      MISLEADING: 'bg-yellow-500/20 text-yellow-400',
      COPYRIGHT_VIOLATION: 'bg-purple-500/20 text-purple-400',
      OTHER: 'bg-gray-500/20 text-gray-400'
    };
    return colors[reason] || colors.OTHER;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      LOW: 'bg-blue-500/20 text-blue-400',
      MEDIUM: 'bg-yellow-500/20 text-yellow-400',
      HIGH: 'bg-orange-500/20 text-orange-400',
      CRITICAL: 'bg-red-500/20 text-red-400'
    };
    return colors[priority];
  };

  const formatReason = (reason) => {
    return reason.replace(/_/g, ' ').toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-red-400 bg-clip-text text-transparent">
              Content Moderation
            </h1>
            <p className="text-gray-400 mt-2">Review and manage flagged content</p>
          </div>
          <Shield className="w-12 h-12 text-purple-400" />
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gray-800/50 border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Reports</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white">{stats.totalReports || 0}</p>
              </div>
              <Flag className="w-10 h-10 text-blue-400" />
            </div>
          </Card>
          <Card className="bg-gray-800/50 border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Pending Review</p>
                <p className="text-3xl font-bold text-yellow-400">{stats.pendingReports || 0}</p>
              </div>
              <AlertTriangle className="w-10 h-10 text-yellow-400" />
            </div>
          </Card>
          <Card className="bg-gray-800/50 border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Under Review</p>
                <p className="text-3xl font-bold text-orange-400">{stats.underReview || 0}</p>
              </div>
              <Shield className="w-10 h-10 text-orange-400" />
            </div>
          </Card>
          <Card className="bg-gray-800/50 border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">High Priority</p>
                <p className="text-3xl font-bold text-red-400">{stats.highPriority || 0}</p>
              </div>
              <AlertTriangle className="w-10 h-10 text-red-400" />
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-gray-800/50 border-gray-700 p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500"
              >
                <option value="">All</option>
                <option value="PENDING">Pending</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Priority</label>
              <select
                value={filters.priority}
                onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500"
              >
                <option value="">All</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Reason</label>
              <select
                value={filters.reason}
                onChange={(e) => setFilters({ ...filters, reason: e.target.value })}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500"
              >
                <option value="">All</option>
                <option value="SPAM">Spam</option>
                <option value="MALWARE">Malware</option>
                <option value="PHISHING">Phishing</option>
                <option value="INAPPROPRIATE_CONTENT">Inappropriate Content</option>
                <option value="ILLEGAL_CONTENT">Illegal Content</option>
                <option value="MISLEADING">Misleading</option>
                <option value="COPYRIGHT_VIOLATION">Copyright Violation</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Bulk Actions */}
        {selectedReports.length > 0 && (
          <Card className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 border-purple-700 p-4">
            <div className="flex items-center justify-between">
              <p className="text-slate-900 dark:text-white font-medium">
                {selectedReports.length} report{selectedReports.length > 1 ? 's' : ''} selected
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleBulkAction('APPROVE')}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve All
                </Button>
                <Button
                  onClick={() => handleBulkAction('BLOCK_LINKS')}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  <Ban className="w-4 h-4 mr-2" />
                  Block Links
                </Button>
                <Button
                  onClick={() => handleBulkAction('DELETE_LINKS')}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Links
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Reports List */}
        <Card className="bg-gray-800/50 border-gray-700">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Flagged Reports</h2>
              <Button
                onClick={selectAll}
                variant="outline"
                className="border-gray-600 text-gray-300"
              >
                {selectedReports.length === reports.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
                <p className="text-gray-400 mt-4">Loading reports...</p>
              </div>
            ) : reports.length === 0 ? (
              <div className="text-center py-12">
                <Flag className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No reports found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reports.map((report) => (
                  <Card key={report._id} className="bg-gray-900/50 border-gray-700 p-4">
                    <div className="flex items-start gap-4">
                      <input
                        type="checkbox"
                        checked={selectedReports.includes(report._id)}
                        onChange={() => toggleSelectReport(report._id)}
                        className="mt-1 w-5 h-5 rounded border-gray-600 bg-gray-800 text-purple-600 focus:ring-purple-500"
                      />
                      
                      <div className="flex-1 space-y-3">
                        {/* Header */}
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge className={getPriorityColor(report.priority)}>
                                {report.priority}
                              </Badge>
                              <Badge className={getReasonColor(report.reason)}>
                                {formatReason(report.reason)}
                              </Badge>
                              <Badge className={
                                report.status === 'PENDING' ? 'bg-yellow-500/20 text-yellow-400' :
                                report.status === 'APPROVED' ? 'bg-green-500/20 text-green-400' :
                                report.status === 'REJECTED' ? 'bg-red-500/20 text-red-400' :
                                'bg-blue-500/20 text-blue-400'
                              }>
                                {report.status}
                              </Badge>
                            </div>
                            
                            <div className="text-slate-900 dark:text-white">
                              <span className="font-semibold">Link:</span>{' '}
                              <span className="text-purple-400">/{report.linkId?.slug}</span>
                              {report.linkId?.originalUrl && (
                                <span className="text-gray-400 ml-2">
                                  → {report.linkId.originalUrl.substring(0, 50)}...
                                </span>
                              )}
                            </div>
                            
                            <p className="text-gray-300">{report.description}</p>
                            
                            <div className="text-sm text-gray-400">
                              Reported by: {report.reporterEmail || 'Anonymous'} • {
                                new Date(report.createdAt).toLocaleString()
                              }
                            </div>

                            {report.reviewedBy && (
                              <div className="text-sm text-gray-400">
                                Reviewed by: {report.reviewedBy.email} • {
                                  new Date(report.reviewedAt).toLocaleString()
                                }
                                {report.reviewNotes && (
                                  <span className="block mt-1">Notes: {report.reviewNotes}</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Review Actions */}
                        {report.status === 'PENDING' && (
                          <div className="border-t border-gray-700 pt-3 space-y-3">
                            {reviewingId === report._id ? (
                              <>
                                <textarea
                                  value={reviewNotes}
                                  onChange={(e) => setReviewNotes(e.target.value)}
                                  placeholder="Add review notes (optional)..."
                                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-slate-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500"
                                  rows={2}
                                />
                                <div className="flex gap-2">
                                  <Button
                                    onClick={() => handleReview(report._id, 'APPROVED', 'NONE')}
                                    className="bg-green-600 hover:bg-green-700"
                                  >
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Approve (No Action)
                                  </Button>
                                  <Button
                                    onClick={() => handleReview(report._id, 'APPROVED', 'BLOCKED')}
                                    className="bg-orange-600 hover:bg-orange-700"
                                  >
                                    <Ban className="w-4 h-4 mr-2" />
                                    Block Link
                                  </Button>
                                  <Button
                                    onClick={() => handleReview(report._id, 'APPROVED', 'DELETED')}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete Link
                                  </Button>
                                  <Button
                                    onClick={() => handleReview(report._id, 'REJECTED', 'NONE')}
                                    variant="outline"
                                    className="border-gray-600"
                                  >
                                    <XCircle className="w-4 h-4 mr-2" />
                                    Reject
                                  </Button>
                                  <Button
                                    onClick={() => {
                                      setReviewingId(null);
                                      setReviewNotes('');
                                    }}
                                    variant="outline"
                                    className="border-gray-600"
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </>
                            ) : (
                              <Button
                                onClick={() => setReviewingId(report._id)}
                                className="bg-purple-600 hover:bg-purple-700"
                              >
                                Review Report
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex justify-center gap-2 mt-6">
                <Button
                  onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                  disabled={pagination.page === 1}
                  variant="outline"
                  className="border-gray-600"
                >
                  Previous
                </Button>
                <span className="text-gray-400 px-4 py-2">
                  Page {pagination.page} of {pagination.pages}
                </span>
                <Button
                  onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                  disabled={pagination.page === pagination.pages}
                  variant="outline"
                  className="border-gray-600"
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
