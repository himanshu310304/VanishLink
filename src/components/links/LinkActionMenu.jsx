import React, { useState } from 'react';
import {
  Copy,
  Share2,
  Edit,
  Trash2,
  Mail,
  MessageCircle,
  Twitter,
  Linkedin,
  QrCode,
  Flag,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useClipboard } from '../../hooks/useClipboard';
import toast from 'react-hot-toast';

export const LinkActionMenu = ({
  link,
  url,
  onEdit,
  onDelete,
  isDeleting = false,
}) => {
  const [shareOpen, setShareOpen] = useState(false);
  const { copy } = useClipboard();

  const handleCopyLink = async () => {
    await copy(url);
    toast.success('Link copied!');
    setShareOpen(false);
  };

  const handleShareEmail = () => {
    const subject = encodeURIComponent(`Check out: ${link.title || 'Deadman Link'}`);
    const body = encodeURIComponent(`I wanted to share this with you:\n\n${url}`);
    window.open(`https://mail.google.com/mail/?view=cm&fs=1&su=${subject}&body=${body}`, '_blank');
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(`Check this out: ${url}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleShareLinkedIn = () => {
    const encodedUrl = encodeURIComponent(url);
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      '_blank'
    );
  };

  const handleShareTwitter = () => {
    const text = encodeURIComponent(`Check this out: ${url}`);
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
  };

  return (
    <>
      <div className="flex gap-2">
        <button
          onClick={() => setShareOpen(true)}
          className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors"
          title="Share link"
        >
          <Share2 className="w-4 h-4 text-emerald-400" />
        </button>

        <button
          onClick={onEdit}
          className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors"
          title="Edit link"
        >
          <Edit className="w-4 h-4 text-blue-400" />
        </button>

        <button
          onClick={onDelete}
          disabled={isDeleting}
          className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
          title="Delete link"
        >
          <Trash2 className="w-4 h-4 text-red-400" />
        </button>
      </div>

      <Modal
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        title="Share Link"
      >
        <div className="space-y-4">
          <div className="bg-slate-50 dark:bg-slate-950/50 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
            <p className="text-xs text-slate-500 mb-2 uppercase">Short URL</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={url}
                readOnly
                className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-1.5 text-xs text-slate-800 dark:text-slate-200 font-mono"
              />
              <button
                onClick={handleCopyLink}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 rounded text-xs font-medium text-white transition-colors"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-slate-600 dark:text-slate-400 uppercase font-medium">
              Share Via
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleShareEmail}
                className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors text-sm text-slate-800 dark:text-slate-200"
              >
                <Mail className="w-4 h-4" />
                Gmail
              </button>
              <button
                onClick={handleShareTwitter}
                className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors text-sm text-slate-800 dark:text-slate-200"
              >
                <Twitter className="w-4 h-4" />
                Twitter
              </button>
              <button
                onClick={handleShareWhatsApp}
                className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors text-sm text-slate-800 dark:text-slate-200"
              >
                <MessageCircle className="w-4 h-4" />
                WhatsApp
              </button>
              <button
                onClick={handleShareLinkedIn}
                className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors text-sm text-slate-800 dark:text-slate-200"
              >
                <Linkedin className="w-4 h-4" />
                LinkedIn
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};
