import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import {
  Lock,
  Clock,
  Flame,
  Eye,
  Tag,
  User,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

export const EditLinkForm = ({ link, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');

  const [form, setForm] = useState({
    title: link.title || '',
    targetUrl: link.targetUrl || '',
    creatorName: link.creatorName || '',
    password: link.password || '',
    isOneTime: link.isOneTime || false,
    maxClicks: link.maxClicks || 0,
    expiresAt: link.expiresAt ? link.expiresAt.slice(0, 16) : '',
    showPreview: link.showPreview || false,
    collection: link.collection || 'General',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.title.trim()) {
      toast.error('Title is required');
      return;
    }

    if (!form.targetUrl.trim()) {
      toast.error('Target URL is required');
      return;
    }

    if (
      form.targetUrl &&
      !form.targetUrl.startsWith('http://') &&
      !form.targetUrl.startsWith('https://')
    ) {
      toast.error('URL must start with http:// or https://');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        title: form.title,
        targetUrl: form.targetUrl,
        creatorName: form.creatorName || undefined,
        password: form.password || undefined,
        isOneTime: form.isOneTime,
        maxClicks: form.isOneTime ? 1 : form.maxClicks,
        expiresAt: form.expiresAt || undefined,
        showPreview: form.showPreview,
        collection: form.collection,
      };

      // Strip undefined
      Object.keys(payload).forEach((key) => {
        if (payload[key] === undefined) delete payload[key];
      });

      const response = await api.put(`/links/${link._id}`, payload);
      toast.success('Link updated successfully!');

      if (onSuccess) onSuccess(response.data);
    } catch (error) {
      console.error('Link update error:', error);
      const errorMsg =
        error.response?.data?.message ||
        error.message ||
        'Failed to update link';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 mb-4">
        {['basic', 'security', 'advanced'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
              activeTab === tab
                ? 'text-emerald-500 border-b-2 border-emerald-500'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* BASIC TAB */}
        {activeTab === 'basic' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-left-4">
            <Input
              label="Link Title"
              placeholder="Operation Blackbriar"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />

            <Input
              label="Target URL"
              placeholder="https://target-website.com"
              value={form.targetUrl}
              onChange={(e) => setForm({ ...form, targetUrl: e.target.value })}
              required
            />

            <Input
              label="Creator Name (Optional)"
              placeholder="Your name or team"
              value={form.creatorName}
              onChange={(e) => setForm({ ...form, creatorName: e.target.value })}
              icon={<User className="w-4 h-4" />}
            />

            <div className="relative">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                Collection
              </label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <select
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-10 py-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500 appearance-none"
                  value={form.collection}
                  onChange={(e) =>
                    setForm({ ...form, collection: e.target.value })
                  }
                >
                  <option value="General">General</option>
                  <option value="Intel">Intel</option>
                  <option value="Personal">Personal</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* SECURITY TAB */}
        {activeTab === 'security' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
            <Input
              label="Password Protection"
              type="password"
              placeholder="Leave empty for public access"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              icon={<Lock className="w-4 h-4" />}
            />

            <div className="p-4 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg space-y-4">
              <h4 className="text-sm font-medium text-slate-900 dark:text-white flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-500" /> Destruction Rules
              </h4>

              {/* One-time toggle */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  Burn after reading (1 view)
                </span>
                <input
                  type="checkbox"
                  className="accent-emerald-500 w-4 h-4"
                  checked={form.isOneTime}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      isOneTime: e.target.checked,
                      maxClicks: e.target.checked ? 1 : 0,
                    })
                  }
                />
              </div>

              {/* Multi-use limit */}
              {!form.isOneTime && (
                <div className="space-y-2">
                  <label className="text-xs text-slate-500 uppercase">
                    Max Access Count (0 = unlimited)
                  </label>
                  <input
                    type="number"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded px-3 py-2 text-slate-900 dark:text-white text-sm"
                    placeholder="e.g. 5 (0 for unlimited)"
                    value={form.maxClicks}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        maxClicks: parseInt(e.target.value, 10) || 0,
                      })
                    }
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs text-slate-500 uppercase">
                  Self-Destruct Date
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="datetime-local"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded px-10 py-2 text-slate-900 dark:text-white text-sm [&::-webkit-calendar-picker-indicator]:invert"
                    value={form.expiresAt}
                    onChange={(e) =>
                      setForm({ ...form, expiresAt: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ADVANCED TAB */}
        {activeTab === 'advanced' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
            <div
              className="p-4 border border-slate-200 dark:border-slate-800 rounded-lg flex items-start gap-3 bg-white dark:bg-slate-900/30 hover:border-emerald-500/50 transition-colors cursor-pointer"
              onClick={() =>
                setForm({ ...form, showPreview: !form.showPreview })
              }
            >
              <div
                className={`mt-1 w-5 h-5 rounded border flex items-center justify-center ${
                  form.showPreview
                    ? 'bg-emerald-500 border-emerald-500'
                    : 'border-slate-600'
                }`}
              >
                {form.showPreview && (
                  <Eye className="w-3 h-3 text-slate-950" />
                )}
              </div>
              <div>
                <h4 className="text-sm font-medium text-slate-900 dark:text-white">
                  Safe Preview Mode
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  Show a &quot;Proceed with Caution&quot; page before
                  redirecting.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex gap-2">
          <Button type="submit" isLoading={loading} className="flex-1">
            {loading ? 'Updating...' : 'Update Link'}
          </Button>
        </div>
      </form>
    </div>
  );
};
