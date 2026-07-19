// src/pages/Dashboard/Settings.jsx
import React, { useEffect, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../context/AuthContext';
import {
  User,
  Lock,
  Bell,
  Globe,
  Shield,
  AlertTriangle,
  Trash2,
  Download,
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const colorOptions = ['#10B981', '#6366F1', '#F59E0B', '#EF4444', '#EC4899'];

const Settings = () => {
  const { user, login } = useAuth();

  // ---- profile/basic ----
  const [displayName, setDisplayName] = useState(user?.name || '');
  const [avatarColor, setAvatarColor] = useState('#10B981');
  const [timezone, setTimezone] = useState('UTC');
  const [loadingProfile, setLoadingProfile] = useState(false);

  // ---- password ----
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loadingPassword, setLoadingPassword] = useState(false);

  // ---- notifications ----
  const [emailOnDestruction, setEmailOnDestruction] = useState(true);
  const [suspiciousActivity, setSuspiciousActivity] = useState(true);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  // ---- default link settings ----
  const [defaultCollection, setDefaultCollection] = useState('General');
  const [defaultShowPreview, setDefaultShowPreview] = useState(true);
  const [defaultMaxClicks, setDefaultMaxClicks] = useState(0);
  const [defaultIsOneTime, setDefaultIsOneTime] = useState(false);

  // ---- privacy ----
  const [showCreatorName, setShowCreatorName] = useState(true);
  const [enableReferrerTracking, setEnableReferrerTracking] =
    useState(true);
  const [allowLinkSuggestions, setAllowLinkSuggestions] = useState(true); // NEW

  // ---- auto-destruct ----
  const [autoExpireDays, setAutoExpireDays] = useState('');
  const [autoDestroyOnFirstClick, setAutoDestroyOnFirstClick] =
    useState(false);

  // ---- advanced security ----
  const [notifyNewDevice, setNotifyNewDevice] = useState(true);
  const [notifyFailedAttempt, setNotifyFailedAttempt] = useState(true);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [loadingSecurity, setLoadingSecurity] = useState(false);

  // ---- danger zone actions ----
  const [loadingExport, setLoadingExport] = useState(false);
  const [loadingResetData, setLoadingResetData] = useState(false);
  const [loadingDeleteAccount, setLoadingDeleteAccount] = useState(false);

  const [sessions, setSessions] = useState([]);

  // Fetch settings from backend on mount
  useEffect(() => {
    const fetchSettings = async () => {
      if (!user?.email) return;

      try {
        const res = await api.get('/settings', {
          params: { email: user.email },
        });

        setDisplayName(res.data.name || user.name || '');
        setAvatarColor(res.data.avatarColor || '#10B981');
        setTimezone(res.data.timezone || 'UTC');

        setEmailOnDestruction(
          res.data.notifications?.emailOnDestruction ?? true
        );
        setSuspiciousActivity(
          res.data.notifications?.suspiciousActivity ?? true
        );

        const def = res.data.defaultSettings || {};
        setDefaultCollection(def.collection || 'General');
        setDefaultShowPreview(
          def.showPreview !== undefined ? def.showPreview : true
        );
        setDefaultMaxClicks(def.maxClicks ?? 0);
        setDefaultIsOneTime(def.isOneTime ?? false);

        const priv = res.data.privacy || {};
        setShowCreatorName(
          priv.showCreatorName !== undefined ? priv.showCreatorName : true
        );
        setEnableReferrerTracking(
          priv.enableReferrerTracking !== undefined
            ? priv.enableReferrerTracking
            : true
        );
        setAllowLinkSuggestions(
          priv.allowLinkSuggestions !== undefined
            ? priv.allowLinkSuggestions
            : true
        );

        const auto = res.data.autoDestructRules || {};
        setAutoExpireDays(
          auto.expireAfterDays !== null &&
          auto.expireAfterDays !== undefined
            ? String(auto.expireAfterDays)
            : ''
        );
        setAutoDestroyOnFirstClick(auto.destroyOnFirstClick ?? false);

        const sec = res.data.securitySettings || {};
        setNotifyNewDevice(
          sec.notifyNewDevice !== undefined ? sec.notifyNewDevice : true
        );
        setNotifyFailedAttempt(
          sec.notifyFailedAttempt !== undefined
            ? sec.notifyFailedAttempt
            : true
        );

        setTwoFactorEnabled(res.data.twoFactorEnabled ?? false);
        setSessions(res.data.sessions || []);
      } catch (err) {
        console.error('Failed to load settings', err);
        toast.error('Failed to load settings');
      }
    };

    fetchSettings();
  }, [user?.email]);

  // ---- handlers ----

  const handleUpdateProfile = async () => {
    if (!user?.email) return;

    try {
      setLoadingProfile(true);
      
      // Update basic profile (name) via auth route
      const res = await api.patch('/auth/update-profile', {
        name: displayName,
      });
      
      // Update extra preferences (avatarColor, timezone) via settings route
      await api.put('/settings/preferences', {
        email: user.email,
        avatarColor,
        timezone,
      });

      login(res.data.user, localStorage.getItem('token')); // keep token

      toast.success('Profile updated');
    } catch (err) {
      console.error('Failed to update profile', err);
      toast.error('Failed to update profile');
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!user?.email) return;

    if (!newPassword || newPassword.length < 6) {
      toast.error('New password should be at least 6 characters');
      return;
    }

    try {
      setLoadingPassword(true);
      await api.patch('/auth/change-password', {
        currentPassword,
        newPassword,
      });

      toast.success('Password updated');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      console.error('Failed to change password', err);
      const msg =
        err?.response?.data?.message || 'Failed to change password';
      toast.error(msg);
    } finally {
      setLoadingPassword(false);
    }
  };

  const saveNotifications = async (nextState) => {
    if (!user?.email) return;

    try {
      setLoadingNotifications(true);
      await api.put('/settings/notifications', {
        email: user.email,
        notifications: nextState,
      });
      toast.success('Notification settings updated');
    } catch (err) {
      console.error('Failed to update notifications', err);
      toast.error('Failed to update notifications');
    } finally {
      setLoadingNotifications(false);
    }
  };

  const handleToggleEmailOnDestruction = async () => {
    const next = !emailOnDestruction;
    setEmailOnDestruction(next);
    await saveNotifications({
      emailOnDestruction: next,
      suspiciousActivity,
    });
  };

  const handleToggleSuspiciousActivity = async () => {
    const next = !suspiciousActivity;
    setSuspiciousActivity(next);
    await saveNotifications({
      emailOnDestruction,
      suspiciousActivity: next,
    });
  };

  const handleSavePreferences = async () => {
    if (!user?.email) return;

    try {
      await api.put('/settings/preferences', {
        email: user.email,
        avatarColor,
        timezone,
        defaultSettings: {
          collection: defaultCollection,
          showPreview: defaultShowPreview,
          maxClicks: Number(defaultMaxClicks) || 0,
          isOneTime: defaultIsOneTime,
        },
        privacy: {
          showCreatorName,
          enableReferrerTracking,
          allowLinkSuggestions, // NEW
        },
        autoDestructRules: {
          expireAfterDays:
            autoExpireDays === '' ? null : Number(autoExpireDays),
          destroyOnFirstClick: autoDestroyOnFirstClick,
        },
      });
      toast.success('Preferences saved');
    } catch (err) {
      console.error('Failed to save preferences', err);
      toast.error('Failed to save preferences');
    }
  };

  const handleSaveSecurityAdvanced = async () => {
    if (!user?.email) return;

    try {
      setLoadingSecurity(true);
      await api.put('/settings/security-advanced', {
        email: user.email,
        twoFactorEnabled,
        securitySettings: {
          notifyNewDevice,
          notifyFailedAttempt,
        },
      });
      toast.success('Security settings updated');
    } catch (err) {
      console.error('Failed to update security settings', err);
      toast.error('Failed to update security settings');
    } finally {
      setLoadingSecurity(false);
    }
  };

  const handleExportData = async () => {
    if (!user?.email) return;
    try {
      setLoadingExport(true);
      const res = await api.get('/settings/export', {
        params: { email: user.email },
      });

      const blob = new Blob([JSON.stringify(res.data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'vanishlink-link-export.json';
      a.click();
      URL.revokeObjectURL(url);

      toast.success('Data exported');
    } catch (err) {
      console.error('Failed to export data', err);
      toast.error('Failed to export data');
    } finally {
      setLoadingExport(false);
    }
  };

  const handleResetData = async () => {
    if (!user?.email) return;
    const confirmReset = window.confirm(
      'This will delete all your links and analytics data. Continue?'
    );
    if (!confirmReset) return;

    try {
      setLoadingResetData(true);
      await api.post('/settings/reset-data', {
        email: user.email,
      });
      toast.success('All your data was reset');
    } catch (err) {
      console.error('Failed to reset data', err);
      toast.error('Failed to reset data');
    } finally {
      setLoadingResetData(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user?.email) return;
    const confirmDelete = window.prompt(
      'Type DELETE to permanently remove your account and all data.'
    );
    if (confirmDelete !== 'DELETE') return;

    try {
      setLoadingDeleteAccount(true);
      await api.delete('/settings/delete-account', {
        data: { email: user.email },
      });
      toast.success('Account deleted');
      // logout() could go here
    } catch (err) {
      console.error('Failed to delete account', err);
      toast.error('Failed to delete account');
    } finally {
      setLoadingDeleteAccount(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>

      {/* Profile */}
      <Card className="p-6 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex items-center gap-4 mb-6">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-slate-950 text-2xl font-bold"
            style={{ backgroundColor: avatarColor }}
          >
            {displayName?.[0] || user?.name?.[0] || user?.email?.[0]}
          </div>
          <div>
            <h3 className="text-slate-900 dark:text-white font-medium">
              {displayName || user?.name}
            </h3>
            <p className="text-slate-500 text-sm">{user?.email}</p>
          </div>
        </div>

        <div className="grid gap-4 max-w-xl">
          <Input
            label="Display Name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            icon={<User className="w-4 h-4" />}
          />

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                Avatar Color
              </label>
              <div className="flex gap-2">
                {colorOptions.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setAvatarColor(color)}
                    className={`w-8 h-8 rounded-full border-2 ${
                      avatarColor === color
                        ? 'border-emerald-400 scale-110'
                        : 'border-slate-300 dark:border-slate-700'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                <Globe className="w-3 h-3" /> Timezone
              </label>
              <Input
                placeholder="e.g. Asia/Kolkata"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
              />
            </div>
          </div>

          <Button
            className="w-fit"
            onClick={handleUpdateProfile}
            disabled={loadingProfile}
          >
            {loadingProfile ? 'Saving...' : 'Update Profile'}
          </Button>
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Security - Password */}
        <Card className="p-6 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-500" /> Security
          </h3>
          <div className="space-y-4">
            <Input
              type="password"
              label="Current Password"
              placeholder="••••••"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
            <Input
              type="password"
              label="New Password"
              placeholder="••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <Button
              variant="secondary"
              onClick={handleChangePassword}
              disabled={loadingPassword}
            >
              {loadingPassword ? 'Updating...' : 'Change Password'}
            </Button>
          </div>
        </Card>

        {/* Notifications */}
        <Card className="p-6 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Bell className="w-4 h-4 text-emerald-500" /> Notifications
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-950 rounded-lg">
              <span className="text-slate-700 dark:text-slate-300 text-sm">
                Email me on link destruction
              </span>
              <input
                type="checkbox"
                className="accent-emerald-500"
                checked={emailOnDestruction}
                onChange={handleToggleEmailOnDestruction}
                disabled={loadingNotifications}
              />
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-950 rounded-lg">
              <span className="text-slate-700 dark:text-slate-300 text-sm">
                Suspicious activity alert
              </span>
              <input
                type="checkbox"
                className="accent-emerald-500"
                checked={suspiciousActivity}
                onChange={handleToggleSuspiciousActivity}
                disabled={loadingNotifications}
              />
            </div>
          </div>
        </Card>
      </div>

      {/* Default link settings & Privacy */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-6 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Default Link Settings
          </h3>
          <div className="space-y-4">
            <Input
              label="Default Collection"
              value={defaultCollection}
              onChange={(e) => setDefaultCollection(e.target.value)}
            />

            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-950 rounded-lg">
              <span className="text-slate-700 dark:text-slate-300 text-sm">
                Show preview by default
              </span>
              <input
                type="checkbox"
                className="accent-emerald-500"
                checked={defaultShowPreview}
                onChange={(e) =>
                  setDefaultShowPreview(e.target.checked)
                }
              />
            </div>

            <Input
              label="Default max clicks (0 = unlimited)"
              type="number"
              value={defaultMaxClicks}
              onChange={(e) => setDefaultMaxClicks(e.target.value)}
            />

            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-950 rounded-lg">
              <span className="text-slate-700 dark:text-slate-300 text-sm">
                Make links one-time by default
              </span>
              <input
                type="checkbox"
                className="accent-emerald-500"
                checked={defaultIsOneTime}
                onChange={(e) =>
                  setDefaultIsOneTime(e.target.checked)
                }
              />
            </div>
          </div>
        </Card>

        <Card className="p-6 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Privacy
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-950 rounded-lg">
              <span className="text-slate-700 dark:text-slate-300 text-sm">
                Show my name on public links
              </span>
              <input
                type="checkbox"
                className="accent-emerald-500"
                checked={showCreatorName}
                onChange={(e) =>
                  setShowCreatorName(e.target.checked)
                }
              />
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-950 rounded-lg">
              <span className="text-slate-700 dark:text-slate-300 text-sm">
                Allow referrer tracking
              </span>
              <input
                type="checkbox"
                className="accent-emerald-500"
                checked={enableReferrerTracking}
                onChange={(e) =>
                  setEnableReferrerTracking(e.target.checked)
                }
              />
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800 mt-3">
              <label className="block text-xs text-slate-600 dark:text-slate-400">
                Auto-expire new links after (days)
              </label>
              <Input
                type="number"
                placeholder="Leave empty for no auto-expiry"
                value={autoExpireDays}
                onChange={(e) => setAutoExpireDays(e.target.value)}
              />
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-950 rounded-lg">
                <span className="text-slate-700 dark:text-slate-300 text-sm">
                  Destroy on first click (global default)
                </span>
                <input
                  type="checkbox"
                  className="accent-emerald-500"
                  checked={autoDestroyOnFirstClick}
                  onChange={(e) =>
                    setAutoDestroyOnFirstClick(e.target.checked)
                  }
                />
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Advanced security & save preferences */}
      <Card className="p-6 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex flex-col md:flex-row md:items-start gap-8">
          <div className="flex-1 space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-500" /> Advanced
              Security
            </h3>

            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-950 rounded-lg">
              <span className="text-slate-700 dark:text-slate-300 text-sm">
                Enable 2FA (email-based OTP)
              </span>
              <input
                type="checkbox"
                className="accent-emerald-500"
                checked={twoFactorEnabled}
                onChange={(e) =>
                  setTwoFactorEnabled(e.target.checked)
                }
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-950 rounded-lg">
              <span className="text-slate-700 dark:text-slate-300 text-sm">
                Alert on new device login
              </span>
              <input
                type="checkbox"
                className="accent-emerald-500"
                checked={notifyNewDevice}
                onChange={(e) =>
                  setNotifyNewDevice(e.target.checked)
                }
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-950 rounded-lg">
              <span className="text-slate-700 dark:text-slate-300 text-sm">
                Alert on failed login attempts
              </span>
              <input
                type="checkbox"
                className="accent-emerald-500"
                checked={notifyFailedAttempt}
                onChange={(e) =>
                  setNotifyFailedAttempt(e.target.checked)
                }
              />
            </div>

            <Button
              variant="secondary"
              onClick={handleSaveSecurityAdvanced}
              disabled={loadingSecurity}
            >
              {loadingSecurity ? 'Saving...' : 'Save Security Settings'}
            </Button>
          </div>

          <div className="flex-1 space-y-3 text-sm text-slate-600 dark:text-slate-400">
            <p className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Session list will be wired once full auth is in place.
            </p>
            {sessions.length > 0 && (
              <div className="space-y-2 max-h-40 overflow-auto">
                {sessions.map((s, idx) => (
                  <div
                    key={idx}
                    className="p-2 bg-slate-50 dark:bg-slate-950 rounded text-xs flex justify-between"
                  >
                    <div>
                      <div>{s.device || 'Unknown device'}</div>
                      <div className="text-slate-500">
                        {s.ip || 'No IP'} ·{' '}
                        {s.lastActive
                          ? new Date(
                              s.lastActive
                            ).toLocaleString()
                          : 'No activity'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6">
          <Button onClick={handleSavePreferences}>
            Save Preferences
          </Button>
        </div>
      </Card>

      {/* Danger Zone */}
      <Card className="p-6 border-red-200 dark:border-red-900 bg-white dark:bg-slate-900">
        <h3 className="text-lg font-semibold text-red-400 mb-4 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> Danger Zone
        </h3>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <p className="text-slate-700 dark:text-slate-300 text-sm">
              Export all your data (account, links, analytics) as JSON.
            </p>
            <Button
              variant="secondary"
              onClick={handleExportData}
              disabled={loadingExport}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              {loadingExport ? 'Exporting...' : 'Export Data'}
            </Button>
          </div>

          <div className="space-y-2">
            <p className="text-slate-700 dark:text-slate-300 text-sm">
              Delete all your links and analytics, but keep your account.
            </p>
            <Button
              variant="secondary"
              onClick={handleResetData}
              disabled={loadingResetData}
              className="flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              {loadingResetData ? 'Resetting...' : 'Reset Data'}
            </Button>
          </div>

          <div className="space-y-2">
            <p className="text-slate-700 dark:text-slate-300 text-sm">
              Permanently delete your account and all associated data.
            </p>
            <Button
              variant="secondary"
              onClick={handleDeleteAccount}
              disabled={loadingDeleteAccount}
              className="flex items-center gap-2 text-red-300 border-red-700"
            >
              <Trash2 className="w-4 h-4" />
              {loadingDeleteAccount ? 'Deleting...' : 'Delete Account'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Settings;
