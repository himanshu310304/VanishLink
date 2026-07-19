import { useState } from 'react';
import { Flag, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { toast } from 'react-hot-toast';
import api from '../../services/api';

export function ReportLinkButton({ linkId, linkSlug, onReported }) {
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

      toast.success('Report submitted successfully. Thank you for helping keep the platform safe!', {
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

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="🚩 Report Link">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Info Banner */}
          <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/30 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Flag className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-slate-900 dark:text-white font-medium mb-1">
                  You are reporting: <span className="text-purple-400 font-mono text-base">/{linkSlug}</span>
                </p>
                <p className="text-xs text-gray-400">
                  Help us keep the community safe by reporting inappropriate or harmful content.
                </p>
              </div>
            </div>
          </div>

          {/* Reason Selection */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-3">
              What's wrong with this link?
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all cursor-pointer hover:bg-slate-100 dark:bg-slate-800"
              required
            >
              {reasons.map(r => (
                <option key={r.value} value={r.value} className="bg-white dark:bg-slate-900">
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-3">
              Tell us more <span className="text-red-400">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please provide specific details about why you're reporting this link. The more information you provide, the better we can address the issue..."
              className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all resize-none"
              rows={5}
              maxLength={500}
              required
            />
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-gray-500">
                {description.length}/500 characters
              </p>
              {description.length >= 450 && (
                <p className="text-xs text-orange-400">
                  {500 - description.length} characters remaining
                </p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-slate-300 dark:border-slate-700/50">
            <Button
              type="submit"
              isLoading={isSubmitting}
              disabled={isSubmitting}
              className="flex-1 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-slate-900 dark:text-white font-semibold py-3 rounded-xl shadow-lg shadow-orange-500/20 transition-all"
            >
              {isSubmitting ? (
                <>Submitting...</>
              ) : (
                <>
                  <Flag className="w-4 h-4 mr-2" />
                  Submit Report
                </>
              )}
            </Button>
            <Button
              type="button"
              onClick={() => setIsOpen(false)}
              variant="outline"
              disabled={isSubmitting}
              className="px-6 border-slate-600 hover:bg-slate-100 dark:bg-slate-800 text-gray-300 py-3 rounded-xl"
            >
              Cancel
            </Button>
          </div>

          {/* Privacy Note */}
          <div className="bg-slate-100 dark:bg-slate-800/30 border border-slate-300 dark:border-slate-700/50 rounded-lg p-3">
            <p className="text-xs text-gray-400 text-center">
              🔒 Your report is confidential. Our moderation team will review it promptly.
            </p>
          </div>
        </form>
      </Modal>
    </>
  );
}
