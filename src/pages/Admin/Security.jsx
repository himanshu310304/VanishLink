// src/pages/Admin/Security.jsx
import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Shield, Ban, CheckCircle, AlertTriangle, Trash2, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const Security = () => {
  const [loading, setLoading] = useState(false);
  const [blockedIPs, setBlockedIPs] = useState([]);
  const [suspiciousActivity, setSuspiciousActivity] = useState([]);
  const [newIP, setNewIP] = useState('');
  const [blockReason, setBlockReason] = useState('');

  useEffect(() => {
    fetchBlockedIPs();
  }, []);

  const fetchBlockedIPs = async () => {
    try {
      const res = await api.get('/admin/security/blocked-ips');
      setBlockedIPs(res.data.blockedIPs || []);
      setSuspiciousActivity(res.data.suspiciousActivity || []);
    } catch (err) {
      console.error('Failed to fetch blocked IPs:', err);
      toast.error('Failed to load security data');
    }
  };

  const handleBlockIP = async () => {
    if (!newIP.trim()) {
      toast.error('Please enter an IP address');
      return;
    }

    // Basic IP validation
    const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipPattern.test(newIP.trim())) {
      toast.error('Invalid IP address format');
      return;
    }

    try {
      setLoading(true);
      await api.post('/admin/security/block-ip', {
        ip: newIP.trim(),
        reason: blockReason.trim() || 'Manually blocked by admin',
      });
      toast.success(`IP ${newIP} blocked successfully`);
      setNewIP('');
      setBlockReason('');
      fetchBlockedIPs();
    } catch (err) {
      console.error('Failed to block IP:', err);
      toast.error(err.response?.data?.message || 'Failed to block IP');
    } finally {
      setLoading(false);
    }
  };

  const handleUnblockIP = async (ip) => {
    try {
      await api.post('/admin/security/unblock-ip', { ip });
      toast.success(`IP ${ip} unblocked successfully`);
      fetchBlockedIPs();
    } catch (err) {
      console.error('Failed to unblock IP:', err);
      toast.error('Failed to unblock IP');
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="relative">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">Security & IP Management</h1>
          <p className="text-lg text-slate-700 dark:text-slate-300">Monitor and control access to your platform</p>
        </div>
        <div className="absolute -top-4 -right-4 w-32 h-32 bg-red-500/10 rounded-full blur-3xl"></div>
      </div>

      {/* Block New IP */}
      <Card>
        <div className="flex items-center gap-3 mb-6">
          <Ban className="w-5 h-5 text-red-400" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Block IP Address</h3>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">IP Address</label>
            <input
              type="text"
              value={newIP}
              onChange={(e) => setNewIP(e.target.value)}
              placeholder="e.g., 192.168.1.100"
              className="w-full bg-slate-100 dark:bg-slate-800/80 border border-slate-600/50 rounded-lg px-4 py-3 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/30"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Reason (Optional)</label>
            <input
              type="text"
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              placeholder="e.g., Spam attack, Malicious behavior"
              className="w-full bg-slate-100 dark:bg-slate-800/80 border border-slate-600/50 rounded-lg px-4 py-3 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/30"
            />
          </div>
          <Button
            onClick={handleBlockIP}
            disabled={loading}
            className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800"
          >
            <Ban className="w-4 h-4 mr-2" />
            {loading ? 'Blocking...' : 'Block IP Address'}
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Blocked IPs */}
        <Card>
          <div className="flex items-center gap-3 mb-6">
            <Lock className="w-5 h-5 text-red-400" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Blocked IP Addresses</h3>
            <span className="ml-auto text-sm text-slate-600 dark:text-slate-400">
              {blockedIPs.length} blocked
            </span>
          </div>

          {blockedIPs.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-600 dark:text-slate-400">No IPs currently blocked</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {blockedIPs.map((item, index) => (
                <div
                  key={index}
                  className="p-4 bg-slate-100 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700/50 rounded-lg hover:border-red-500/30 transition-all duration-200"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Ban className="w-4 h-4 text-red-400 flex-shrink-0" />
                      <span className="font-mono text-slate-900 dark:text-white font-semibold">
                        {item.ip}
                      </span>
                    </div>
                    <button
                      onClick={() => handleUnblockIP(item.ip)}
                      className="text-emerald-400 hover:text-emerald-300 transition-colors"
                      title="Unblock this IP"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                  </div>
                  {item.reason && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                      Reason: {item.reason}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Blocked: {formatTimestamp(item.blockedAt)}</span>
                    {item.expiresAt && (
                      <span>Expires: {formatTimestamp(item.expiresAt)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Suspicious Activity */}
        <Card>
          <div className="flex items-center gap-3 mb-6">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Suspicious Activity</h3>
            <span className="ml-auto text-sm text-slate-600 dark:text-slate-400">
              {suspiciousActivity.length} detected
            </span>
          </div>

          {suspiciousActivity.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
              <p className="text-slate-600 dark:text-slate-400">No suspicious activity detected</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {suspiciousActivity.map((item, index) => (
                <div
                  key={index}
                  className="p-4 bg-slate-100 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700/50 rounded-lg hover:border-yellow-500/30 transition-all duration-200"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                      <span className="font-mono text-slate-900 dark:text-white font-semibold">
                        {item.ip}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setNewIP(item.ip);
                        setBlockReason(`High request rate: ${item.count} requests`);
                      }}
                      className="text-red-400 hover:text-red-300 transition-colors text-xs"
                    >
                      Block
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-yellow-400 font-semibold">
                      {item.count} requests/min
                    </span>
                    <span className="text-slate-500">
                      Last seen: {formatTimestamp(item.lastSeen)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Security Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="text-center">
          <Ban className="w-8 h-8 text-red-400 mx-auto mb-3" />
          <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
            {blockedIPs.length}
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-400">Blocked IPs</div>
        </Card>

        <Card className="text-center">
          <AlertTriangle className="w-8 h-8 text-yellow-400 mx-auto mb-3" />
          <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
            {suspiciousActivity.length}
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-400">Suspicious Activity</div>
        </Card>

        <Card className="text-center">
          <Shield className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
          <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">Active</div>
          <div className="text-sm text-slate-600 dark:text-slate-400">Protection Status</div>
        </Card>
      </div>
    </div>
  );
};

export default Security;
