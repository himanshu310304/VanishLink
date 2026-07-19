import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import toast from 'react-hot-toast';
import api from '../../services/api';

export const DeleteConfirmationModal = ({
  isOpen,
  onClose,
  link,
  onDeleted,
}) => {
  const [deleting, setDeleting] = useState(false);

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/links/${link._id}`);
      toast.success('Link deleted successfully!');
      onClose();
      if (onDeleted) onDeleted(link._id);
    } catch (error) {
      console.error('Delete error:', error);
      const errorMsg =
        error.response?.data?.message ||
        error.message ||
        'Failed to delete link';
      toast.error(errorMsg);
    } finally {
      setDeleting(false);
    }
  };

  if (!link) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delete Link">
      <div className="space-y-4">
        <div className="flex gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-medium text-red-300 mb-1">Confirm Deletion</h3>
            <p className="text-sm text-red-200/80">
              Are you sure you want to delete this link? This action cannot be
              undone.
            </p>
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-950/50 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
          <p className="text-xs text-slate-500 mb-1">Title</p>
          <p className="text-sm text-slate-800 dark:text-slate-200 font-medium">
            {link.title || 'Untitled'}
          </p>
        </div>

        <div className="flex gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
          <Button
            onClick={onClose}
            className="flex-1 bg-slate-700 hover:bg-slate-600"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDelete}
            disabled={deleting}
            className="flex-1 bg-red-600 hover:bg-red-700"
          >
            {deleting ? 'Deleting...' : 'Delete Link'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
