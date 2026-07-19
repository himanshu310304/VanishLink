// File: src/pages/Admin/SystemSettings.jsx
import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Shield, Globe, Zap, Save, Clock, Flag, X, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const SystemSettings = () => {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [settings, setSettings] = useState({
    maxLinkTTL: 30,
    slugRegex: '^[a-zA-Z0-9-_]+$',
    allowAnonymousLinks: true,
    ipBlockingEnabled: true,
    suspiciousThreshold: 500,
    blockDuration: 10,
    rateLimitGeneral: { max: 1000 },
    rateLimitAuth: { max: 20 },
    rateLimitLinkCreation: { max: 100 },
    bannedKeywords: [],
    autoFlagBannedKeywords: true,
  });
  const [newKeyword, setNewKeyword] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setFetching(true);
      const res = await api.get('/admin/settings');
      setSettings(res.data);
    } catch (err) {
      console.error('Failed to fetch settings:', err);
      toast.error('Failed to load settings');
    } finally {
      setFetching(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      console.log('🔄 Saving settings:', settings);
      const response = await api.patch('/admin/settings', settings);
      console.log('✅ Settings saved:', response.data);
      toast.success("✅ Settings updated! Changes are now active.", {
        duration: 4000,
        style: {
          background: '#10b981',
          color: '#fff',
        },
      });
      await fetchSettings(); // Reload to confirm
    } catch (err) {
      console.error('❌ Failed to save settings:', err);
      console.error('Error response:', err.response?.data);
      toast.error(err.response?.data?.message || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = (key, value) => {
    console.log('Updating setting:', key, value);
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (fetching) {
    return <div className="text-slate-600 dark:text-slate-400">Loading settings...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 relative">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">System Configuration</h1>
          <p className="text-lg text-slate-700 dark:text-slate-300">Manage platform settings and policies</p>
        </div>
        <Button onClick={handleSave} isLoading={loading} disabled={loading} className="w-full md:w-auto">
          <Save className="w-4 h-4 mr-2" /> {loading ? 'Saving...' : 'Save Changes'}
        </Button>
        <div className="absolute -top-4 -right-4 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Global Defaults */}
        <Card>
          <div className="flex items-center gap-3 mb-6">
            <Globe className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Global Defaults</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Max Link TTL (Days)</label>
              <input 
                type="number" 
                value={settings.maxLinkTTL} 
                onChange={(e) => updateSetting('maxLinkTTL', parseInt(e.target.value))}
                className="w-full bg-slate-100 dark:bg-slate-800/80 border border-slate-600/50 rounded-lg px-3 py-2 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30" 
              />
              <p className="text-[10px] text-slate-500 mt-2">Maximum time-to-live for standard user links.</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Slug Rules (Regex)</label>
              <input 
                type="text" 
                value={settings.slugRegex}
                onChange={(e) => updateSetting('slugRegex', e.target.value)}
                className="w-full bg-slate-100 dark:bg-slate-800/30 border border-slate-300 dark:border-slate-700/50 rounded-lg px-3 py-2.5 text-emerald-400 font-mono text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 backdrop-blur-sm transition-all duration-200" 
              />
            </div>
            <div className="flex items-center justify-between p-4 bg-slate-100 dark:bg-slate-800/30 border border-slate-300 dark:border-slate-700/50 rounded-lg hover:bg-slate-100 dark:bg-slate-800/50 transition-all duration-200">
                <span className="text-sm text-slate-700 dark:text-slate-300">Allow Anonymous Links</span>
                <input 
                  type="checkbox" 
                  checked={settings.allowAnonymousLinks}
                  onChange={(e) => updateSetting('allowAnonymousLinks', e.target.checked)}
                  className="accent-emerald-500 w-4 h-4 cursor-pointer" 
                />
            </div>
          </div>
        </Card>

        {/* Rate Limits & Security */}
        <Card>
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Rate Limits & Security</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">General API Limit (Requests per 15min)</label>
              <input 
                type="number" 
                value={settings.rateLimitGeneral?.max || 1000} 
                onChange={(e) => updateSetting('rateLimitGeneral', { ...settings.rateLimitGeneral, max: parseInt(e.target.value) })}
                className="w-full bg-slate-100 dark:bg-slate-800/80 border border-slate-600/50 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30" 
              />
              <p className="text-[10px] text-slate-500 mt-2">Maximum requests per IP in 15 minutes.</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Auth Limit (Requests per 15min)</label>
              <input 
                type="number" 
                value={settings.rateLimitAuth?.max || 20} 
                onChange={(e) => updateSetting('rateLimitAuth', { ...settings.rateLimitAuth, max: parseInt(e.target.value) })}
                className="w-full bg-slate-100 dark:bg-slate-800/80 border border-slate-600/50 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30" 
              />
              <p className="text-[10px] text-slate-500 mt-2">Login/register attempts per IP.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Link Creation Limit (Per Hour)</label>
              <input 
                type="number" 
                value={settings.rateLimitLinkCreation?.max || 100} 
                onChange={(e) => updateSetting('rateLimitLinkCreation', { ...settings.rateLimitLinkCreation, max: parseInt(e.target.value) })}
                className="w-full bg-slate-100 dark:bg-slate-800/80 border border-slate-600/50 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30" 
              />
              <p className="text-[10px] text-slate-500 mt-2">Maximum links created per hour.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">IP Suspicious Threshold (Req/Min)</label>
              <input 
                type="number" 
                value={settings.suspiciousThreshold || 500} 
                onChange={(e) => updateSetting('suspiciousThreshold', parseInt(e.target.value))}
                className="w-full bg-slate-100 dark:bg-slate-800/80 border border-slate-600/50 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30" 
              />
              <p className="text-[10px] text-slate-500 mt-2">Auto-block IPs exceeding this rate.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Auto-Block Duration (Minutes)</label>
              <input 
                type="number" 
                value={settings.blockDuration || 10} 
                onChange={(e) => updateSetting('blockDuration', parseInt(e.target.value))}
                className="w-full bg-slate-100 dark:bg-slate-800/80 border border-slate-600/50 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30" 
              />
              <p className="text-[10px] text-slate-500 mt-2">How long to block suspicious IPs.</p>
            </div>
          </div>
        </Card>

        {/* Banned Keywords */}
        <Card className="lg:col-span-2">
          <div className="flex items-center gap-3 mb-6">
            <Flag className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Content Moderation</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-100 dark:bg-slate-800/30 border border-slate-300 dark:border-slate-700/50 rounded-lg">
              <div>
                <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">Auto-Flag Banned Keywords</span>
                <p className="text-xs text-slate-500 mt-1">Automatically block links containing banned words</p>
              </div>
              <input 
                type="checkbox" 
                checked={settings.autoFlagBannedKeywords}
                onChange={(e) => updateSetting('autoFlagBannedKeywords', e.target.checked)}
                className="accent-emerald-500 w-4 h-4 cursor-pointer" 
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Banned Keywords</label>
              <div className="flex gap-2 mb-3">
                <input 
                  type="text" 
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (newKeyword.trim() && !settings.bannedKeywords.includes(newKeyword.trim().toLowerCase())) {
                        updateSetting('bannedKeywords', [...settings.bannedKeywords, newKeyword.trim().toLowerCase()]);
                        setNewKeyword('');
                      }
                    }
                  }}
                  placeholder="Add keyword to ban..."
                  className="flex-1 bg-slate-100 dark:bg-slate-800/80 border border-slate-600/50 rounded-lg px-3 py-2 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30" 
                />
                <Button 
                  onClick={() => {
                    if (newKeyword.trim() && !settings.bannedKeywords.includes(newKeyword.trim().toLowerCase())) {
                      updateSetting('bannedKeywords', [...settings.bannedKeywords, newKeyword.trim().toLowerCase()]);
                      setNewKeyword('');
                    }
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {settings.bannedKeywords && settings.bannedKeywords.length > 0 ? (
                  settings.bannedKeywords.map((keyword, index) => (
                    <span 
                      key={index}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm border border-red-500/30"
                    >
                      {keyword}
                      <button
                        onClick={() => {
                          updateSetting('bannedKeywords', settings.bannedKeywords.filter((_, i) => i !== index));
                        }}
                        className="hover:bg-red-500/30 rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">No banned keywords configured</p>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Retention Policy */}
        <Card className="lg:col-span-2">
          <div className="flex items-center gap-3 mb-6">
            <Clock className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Data Retention Policy</h3>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
             <div className="p-6 bg-slate-100 dark:bg-slate-800/30 rounded-lg border border-slate-300 dark:border-slate-700/50 hover:border-slate-300 dark:border-slate-700 transition-all duration-200 text-center">
                <Clock className="w-8 h-8 text-slate-500 mx-auto mb-3" />
                <h4 className="text-slate-900 dark:text-white font-semibold mb-2">Audit Logs</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400">Retain for 90 Days</p>
             </div>
             <div className="p-6 bg-slate-100 dark:bg-slate-800/30 rounded-lg border border-slate-300 dark:border-slate-700/50 hover:border-slate-300 dark:border-slate-700 transition-all duration-200 text-center">
                <Shield className="w-8 h-8 text-slate-500 mx-auto mb-3" />
                <h4 className="text-slate-900 dark:text-white font-semibold mb-2">Expired Links</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400">Hard delete after 7 Days</p>
             </div>
             <div className="p-6 bg-slate-100 dark:bg-slate-800/30 rounded-lg border border-slate-300 dark:border-slate-700/50 hover:border-slate-300 dark:border-slate-700 transition-all duration-200 text-center">
                <Globe className="w-8 h-8 text-slate-500 mx-auto mb-3" />
                <h4 className="text-slate-900 dark:text-white font-semibold mb-2">Guest Data</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400">Purge every 24 Hours</p>
             </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default SystemSettings;