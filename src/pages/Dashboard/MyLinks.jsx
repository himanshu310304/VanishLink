import React, { useState, useEffect } from 'react';
import {
  Plus,
  ExternalLink,
  Copy,
  QrCode,
  Lock,
  Flame,
  Eye,
  FolderOpen,
  Star,
  Filter,
  Search,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { CreateLinkForm } from '../../components/links/CreateLinkForm';
import { EditLinkForm } from '../../components/links/EditLinkForm';
import { LinkActionMenu } from '../../components/links/LinkActionMenu';
import { DeleteConfirmationModal } from '../../components/links/DeleteConfirmationModal';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { useClipboard } from '../../hooks/useClipboard';
import { QRPopup } from '../../components/links/QRPopup';
import { ReportLinkButton } from '../../components/links/ReportLinkButton';
import api from '../../services/api';
import { APP_BASE_URL } from '../../config/appUrl'; // uses env + origin
import { useAuth } from '../../hooks/useAuth';

const StatusBadges = ({ link }) => {
  const badges = [];
  const now = new Date();

  const isExpired =
    link.status === 'expired' ||
    (link.expiresAt && new Date(link.expiresAt) < now);

  if (isExpired) {
    badges.push(
      <span
        key="expired"
        className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-500/10 text-red-300 border border-red-500/40"
      >
        Expired
      </span>,
    );
  }

  if (link.scheduleStart && new Date(link.scheduleStart) > now) {
    badges.push(
      <span
        key="scheduled"
        className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/40"
      >
        Scheduled
      </span>,
    );
  }

  if (link.isOneTime || (link.maxClicks && link.maxClicks > 0)) {
    badges.push(
      <span
        key="burn"
        className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-orange-500/10 text-orange-300 border border-orange-500/40"
      >
        Burn-on-open
      </span>,
    );
  }

  if (link.password) {
    badges.push(
      <span
        key="locked"
        className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-500/10 text-slate-800 dark:text-slate-200 border border-slate-500/40"
      >
        Locked
      </span>,
    );
  }

  if (link.showPreview) {
    badges.push(
      <span
        key="preview"
        className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/40"
      >
        Preview
      </span>,
    );
  }

  if (badges.length === 0) return null;

  return <div className="flex flex-wrap gap-1 mt-1">{badges}</div>;
};

const getLinkAvatar = (link) => {
  const seed = encodeURIComponent(
    link.title || link.slug || link.targetUrl || 'Deadman Agent',
  );
  return `https://api.dicebear.com/7.x/bottts/svg?seed=${seed}`;
};

// Build the public URL for a slug safely
const buildLinkUrl = (slug) => {
  const base = APP_BASE_URL || window.location.origin;
  const cleanBase = base.replace(/\/+$/, '');
  return `${cleanBase}/${slug}`;
};

const MyLinks = () => {
  const { user } = useAuth();
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [editingLink, setEditingLink] = useState(null);
  const [deleteLink, setDeleteLink] = useState(null);
  const [qrLink, setQrLink] = useState(null);
  const [filter, setFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);

  const { copy } = useClipboard();

  // Fetch user's links only (backend filters by authenticated user)
  const loadLinks = async () => {
    try {
      setLoading(true);
      const res = await api.get('/links');
      setLinks(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to load links', err);
      setLinks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = async (link) => {
    try {
      const res = await api.patch(`/links/${link._id}/favorite`);
      setLinks((prev) =>
        prev.map((l) => (l._id === link._id ? res.data : l))
      );
    } catch (err) {
      console.error('Failed to toggle favorite', err);
    }
  };

  useEffect(() => {
    loadLinks();
  }, []);

  const handleLinkCreated = () => {
    setCreateOpen(false);
    loadLinks();
  };

  const handleEditLink = (link) => {
    setEditingLink(link);
  };

  const handleEditSuccess = (updatedLink) => {
    // Update the link in the list
    setLinks((prev) =>
      prev.map((l) => (l._id === updatedLink._id ? updatedLink : l))
    );
    setEditingLink(null);
  };

  const handleDeleteLink = (link) => {
    setDeleteLink(link);
  };

  const handleDeletedLink = (linkId) => {
    setLinks((prev) => prev.filter((l) => l._id !== linkId));
    setDeleteLink(null);
  };

  // Apply collection filter and search
  const filteredLinks = Array.isArray(links)
    ? links.filter((link) => {
        // Collection filter
        if (filter !== 'All') {
          const collection =
            link.collectionName || link.collection || 'General';
          if (collection !== filter) return false;
        }
        
        // Search filter
        if (searchTerm) {
          const search = searchTerm.toLowerCase();
          return (
            link.title?.toLowerCase().includes(search) ||
            link.slug?.toLowerCase().includes(search) ||
            link.targetUrl?.toLowerCase().includes(search)
          );
        }
        
        return true;
      })
    : [];

  // Calculate collection counts
  const collectionCounts = {
    All: links.length,
    General: links.filter((l) => (l.collection || 'General') === 'General')
      .length,
    Intel: links.filter((l) => (l.collection || 'General') === 'Intel')
      .length,
    Personal: links.filter((l) => (l.collection || 'General') === 'Personal')
      .length,
  };

  const columns = [
    {
      header: 'Identity',
      className: 'w-1/3',
      cell: (row) => (
        <div className="flex items-center gap-3">
          {/* Favorite button */}
          <button
            onClick={() => handleToggleFavorite(row)}
            className={`transition-colors ${
              row.isFavorite
                ? 'text-yellow-400'
                : 'text-slate-600 hover:text-yellow-400'
            }`}
            title={row.isFavorite ? 'Remove from favorites' : 'Mark as favorite'}
          >
            <Star
              className="w-4 h-4"
              fill={row.isFavorite ? 'currentColor' : 'none'}
            />
          </button>

          {/* Link avatar */}
          <img
            src={getLinkAvatar(row)}
            alt={row.title || 'Link avatar'}
            className="w-9 h-9 rounded-full border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 object-cover shrink-0"
          />

          {/* Icon + title + url + badges + creator */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 shrink-0 border border-slate-300 dark:border-slate-700">
                {row.status === 'expired' ? (
                  <Flame className="w-5 h-5 text-red-500" />
                ) : (
                  <ExternalLink className="w-5 h-5" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-slate-800 dark:text-slate-200 truncate">
                  {row.title || 'Untitled Operation'}
                </div>
                <div className="text-xs text-slate-500 truncate max-w-[200px]">
                  {row.targetUrl}
                </div>
                {row.creatorName && (
                  <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    by {row.creatorName}
                  </div>
                )}
              </div>
            </div>
            <StatusBadges link={row} />
          </div>
        </div>
      ),
    },
    {
      header: 'Security',
      cell: (row) => (
        <div className="flex gap-2">
          {row.password && (
            <Lock
              className="w-4 h-4 text-emerald-500"
              title="Password Protected"
            />
          )}
          {(row.isOneTime || (row.maxClicks && row.maxClicks > 0)) && (
            <Flame
              className="w-4 h-4 text-orange-500"
              title="Self-Destruct / Limited Clicks"
            />
          )}
          {row.showPreview && (
            <Eye
              className="w-4 h-4 text-blue-500"
              title="Safe Preview Enabled"
            />
          )}
        </div>
      ),
    },
    {
      header: 'Short Link',
      cell: (row) => {
        const url = buildLinkUrl(row.slug);

        return (
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950/50 p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 w-fit">
            <span className="font-mono text-[11px] text-emerald-400 pl-1">
              /{row.slug}
            </span>
            <div className="h-4 w-px bg-slate-100 dark:bg-slate-800 mx-1" />
            <button
              onClick={(e) => {
                e.stopPropagation();
                copy(url);
              }}
              className="hover:text-slate-900 dark:text-white text-slate-500"
              title="Copy Link"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setQrLink(url);
              }}
              className="hover:text-slate-900 dark:text-white text-slate-500"
              title="Get QR Code"
            >
              <QrCode className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      },
    },
    {
      header: 'Status',
      cell: (row) => {
        const now = new Date();
        const isExpired =
          row.status === 'expired' ||
          (row.expiresAt && new Date(row.expiresAt) < now);
        const isScheduled =
          row.scheduleStart && new Date(row.scheduleStart) > now;

        let label = 'Active';
        if (isExpired) label = 'Expired';
        else if (isScheduled) label = 'Scheduled';

        return <Badge variant={isExpired ? 'danger' : 'success'}>{label}</Badge>;
      },
    },
    {
      header: 'Clicks',
      accessor: 'clicks',
      className: 'text-center font-mono text-slate-600 dark:text-slate-400',
    },
    {
      header: 'Created',
      cell: (row) => (
        <span className="text-slate-500 text-xs">
          {row.createdAt
            ? new Date(row.createdAt).toLocaleDateString()
            : '--'}
        </span>
      ),
    },
    {
      header: 'Actions',
      cell: (row) => {
        const url = buildLinkUrl(row.slug);
        return (
          <div className="flex items-center gap-2">
            <LinkActionMenu
              link={row}
              url={url}
              onEdit={() => handleEditLink(row)}
              onDelete={() => handleDeleteLink(row)}
            />
            <ReportLinkButton 
              linkId={row._id} 
              linkSlug={row.slug}
            />
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white mb-1">My Links</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Manage and track your secure endpoints
          </p>
        </div>
        <div className="flex gap-3 flex-col sm:flex-row">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search links..."
              className="bg-white/5 border border-slate-200/10 text-slate-800 dark:text-slate-200 text-sm rounded-md pl-9 pr-4 py-2 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 w-full sm:w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <select
              className="bg-white/5 border border-slate-200/10 text-slate-800 dark:text-slate-200 text-sm rounded-md pl-9 pr-4 py-2 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 appearance-none"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="All">
                All Collections ({collectionCounts.All})
              </option>
              <option value="General">
                General ({collectionCounts.General})
              </option>
              <option value="Intel">
                Intel ({collectionCounts.Intel})
              </option>
              <option value="Personal">
                Personal ({collectionCounts.Personal})
              </option>
            </select>
          </div>
          <Button
            onClick={() => setCreateOpen(true)}
            className="w-full sm:w-auto px-6"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Link
          </Button>
        </div>
      </div>

      <Table columns={columns} data={filteredLinks} isLoading={loading} />

      <Modal
        isOpen={isCreateOpen}
        onClose={() => setCreateOpen(false)}
        title="Create Secure Link"
      >
        <CreateLinkForm onSuccess={handleLinkCreated} />
      </Modal>

      <Modal
        isOpen={!!editingLink}
        onClose={() => setEditingLink(null)}
        title="Edit Link"
      >
        {editingLink && (
          <EditLinkForm
            link={editingLink}
            onSuccess={handleEditSuccess}
          />
        )}
      </Modal>

      <DeleteConfirmationModal
        isOpen={!!deleteLink}
        onClose={() => setDeleteLink(null)}
        link={deleteLink}
        onDeleted={handleDeletedLink}
      />

      <QRPopup
        isOpen={!!qrLink}
        onClose={() => setQrLink(null)}
        url={qrLink || ''}
      />
    </div>
  );
};

export default MyLinks;
