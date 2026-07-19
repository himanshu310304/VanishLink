import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Flag, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { toast } from 'react-hot-toast';
import api from '../../services/api';

export function ReportOverlay({ linkId, linkSlug, onReported }) {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState('SPAM');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reasons = [
    { value: 'SPAM', label: 'Spam or unwanted content' },
    { value: 'MALWARE', label: 'Malware or virus' },
    { value: 'PHISHING', label: 'Phishing or scam' },
    { value: 'INAPPROPRIATE_CONTENT', label: 'Inappropriate content' },
    { value: 'ILLEGAL_CONTENT', label: 'Illegal content' },
    { value: 'MISLEADING', label: 'Misleading or false information' },
    { value: 'COPYRIGHT_VIOLATION', label: 'Copyright violation' },
    { value: 'OTHER', label: 'Other' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!description.trim()) {
      toast.error('Please provide a description');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/moderation/report', {
        linkId,
        reason,
        description
      });

      toast.success('Report submitted successfully!', {
        duration: 4000,
        style: { background: '#10b981', color: 'white' }
      });

      setIsOpen(false);
      setReason('SPAM');
      setDescription('');
      
      if (onReported) {
        onReported();
      }
    } catch (error) {
      console.error('Failed to submit report:', error);
      toast.error('Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        variant="outline"
        size="sm"
        className="border-orange-600/50 text-orange-400 hover:bg-orange-600/10"
      >
        <Flag className="w-4 h-4 mr-2" />
        Report
      </Button>
    );
  }

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variant="outline"
        size="sm"
        className="border-orange-600/50 text-orange-400 hover:bg-orange-600/10"
      >
        <Flag className="w-4 h-4 mr-2" />
        Report
      </Button>

      {/* Full Screen Overlay - Rendered with Portal */}
      {createPortal(
        <div 
          className="fixed inset-0 bg-slate-50 dark:bg-black/80 backdrop-blur-md z-[999999] flex items-center justify-center p-4"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
          onClick={() => setIsOpen(false)}
        >
          <div 
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-300 dark:border-slate-700 shadow-2xl w-full max-w-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-300 dark:border-slate-700">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Flag className="w-5 h-5 text-orange-400" />
                Report Link
              </h2>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white p-2 hover:bg-slate-100 dark:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Info Banner */}
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4">
              <p className="text-sm text-slate-900 dark:text-white font-medium">
                You are reporting: <span className="text-orange-400 font-mono">/{linkSlug}</span>
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Help us keep the community safe by reporting inappropriate content.
              </p>
            </div>

            {/* Reason Selection */}
            <div>
              <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                What's wrong with this link?
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                required
              >
                {reasons.map(r => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                Tell us more <span className="text-red-400">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Please provide specific details about why you're reporting this link..."
                className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-500 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none"
                rows={5}
                maxLength={500}
                required
              />
              <p className="text-xs text-slate-500 mt-2">
                {description.length}/500 characters
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                onClick={() => setIsOpen(false)}
                variant="outline"
                className="flex-1 border-slate-300 dark:border-slate-700"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-slate-900 dark:text-white"
              >
                {isSubmitting ? 'Submitting...' : (
                  <>
                    <Flag className="w-4 h-4 mr-2" />
                    Submit Report
                  </>
                )}
              </Button>
            </div>

            {/* Privacy Notice */}
            <p className="text-xs text-slate-500 text-center">
              Reports are reviewed by our moderation team. False reports may result in action against your account.
            </p>
          </form>
        </div>
      </div>,
      document.body
      )}
    </>
  );
}
