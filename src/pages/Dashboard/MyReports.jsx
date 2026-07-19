import { useState, useEffect } from 'react';
import { Flag, Clock, CheckCircle, XCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { APP_BASE_URL } from '../../config/appUrl';

export default function MyReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL'); // ALL, PENDING, APPROVED, REJECTED

  useEffect(() => {
    fetchMyReports();
  }, []);

  const fetchMyReports = async () => {
    try {
      setLoading(true);
      const response = await api.get('/moderation/my-reports');
      setReports(response.data);
    } catch (error) {
      console.error('Failed to fetch reports:', error);
      toast.error('Failed to load your reports');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'APPROVED':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'REJECTED':
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      PENDING: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
      APPROVED: 'bg-green-500/20 text-green-400 border-green-500/50',
      REJECTED: 'bg-red-500/20 text-red-400 border-red-500/50',
    };
    return variants[status] || 'bg-gray-500/20 text-gray-400 border-gray-500/50';
  };

  const getReasonLabel = (reason) => {
    const labels = {
      SPAM: 'Spam',
      MALWARE: 'Malware',
      PHISHING: 'Phishing',
      INAPPROPRIATE_CONTENT: 'Inappropriate Content',
      ILLEGAL_CONTENT: 'Illegal Content',
      MISLEADING: 'Misleading',
      COPYRIGHT_VIOLATION: 'Copyright',
      OTHER: 'Other'
    };
    return labels[reason] || reason;
  };

  const filteredReports = reports.filter(report => 
    filter === 'ALL' || report.status === filter
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500 mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading your reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white mb-1">My Reports</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Track the status of links you've reported
        </p>
      </div>

      {/* Filters */}
      <Card className="bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 p-4">
        <div className="flex gap-2">
          {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === status
                  ? 'bg-emerald-500 text-slate-900 dark:text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-700'
              }`}
            >
              {status}
              {status === 'ALL' && <span className="ml-2 text-xs">({reports.length})</span>}
              {status !== 'ALL' && (
                <span className="ml-2 text-xs">
                  ({reports.filter(r => r.status === status).length})
                </span>
              )}
            </button>
          ))}
        </div>
      </Card>

      {/* Reports List */}
      {filteredReports.length === 0 ? (
        <Card className="bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 p-12 text-center">
          <Flag className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400 text-lg">No reports found</p>
          <p className="text-slate-500 text-sm mt-2">
            {filter === 'ALL' 
              ? "You haven't reported any links yet"
              : `No ${filter.toLowerCase()} reports`
            }
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredReports.map(report => (
            <Card key={report._id} className="bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 p-6 hover:border-slate-300 dark:border-slate-700 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  {/* Header */}
                  <div className="flex items-center gap-3 mb-3">
                    {getStatusIcon(report.status)}
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-slate-900 dark:text-white font-semibold">
                          {report.linkDetails?.title || 'Untitled Link'}
                        </h3>
                        <Badge className={getStatusBadge(report.status)}>
                          {report.status}
                        </Badge>
                      </div>
                      <a
                        href={`${APP_BASE_URL}/${report.linkDetails?.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-400 hover:text-emerald-300 font-mono text-sm flex items-center gap-1 w-fit mt-1"
                      >
                        /{report.linkDetails?.slug}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  {/* Reason & Description */}
                  <div className="space-y-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">Reason:</span>
                      <Badge className="bg-orange-500/20 text-orange-400 text-xs">
                        {getReasonLabel(report.reason)}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {report.description}
                    </p>
                  </div>

                  {/* Review Info */}
                  {report.status !== 'PENDING' && report.reviewedBy && (
                    <div className="bg-slate-100 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg p-3 mb-3">
                      <p className="text-xs text-slate-500 mb-1">Admin Response:</p>
                      {report.reviewNotes ? (
                        <p className="text-sm text-slate-700 dark:text-slate-300">{report.reviewNotes}</p>
                      ) : (
                        <p className="text-sm text-slate-600 dark:text-slate-400 italic">
                          {report.status === 'APPROVED' 
                            ? 'Your report was approved and action has been taken.'
                            : 'Your report was reviewed and closed.'
                          }
                        </p>
                      )}
                      <p className="text-xs text-slate-500 mt-2">
                        Reviewed by {report.reviewedBy} • {new Date(report.reviewedAt).toLocaleString()}
                      </p>
                    </div>
                  )}

                  {/* Link Status */}
                  {report.linkDetails?.status === 'blocked' && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                      <p className="text-xs text-red-400 font-medium">
                        ✓ This link has been blocked
                      </p>
                    </div>
                  )}
                </div>

                {/* Meta Info */}
                <div className="text-right">
                  <p className="text-xs text-slate-500">
                    Reported {new Date(report.createdAt).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-slate-600 mt-1">
                    {new Date(report.createdAt).toLocaleTimeString()}
                  </p>
                  {report.priority && (
                    <Badge className={`mt-2 ${
                      report.priority === 'HIGH' 
                        ? 'bg-red-500/20 text-red-400'
                        : report.priority === 'MEDIUM'
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-slate-500/20 text-slate-600 dark:text-slate-400'
                    }`}>
                      {report.priority}
                    </Badge>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
