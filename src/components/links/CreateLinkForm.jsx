// src/components/links/CreateLinkForm.jsx
import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import {
  Lock,
  Link as LinkIcon,
  Clock,
  Flame,
  Calendar,
  Eye,
  Tag,
  User,
  ShieldAlert,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

/* ===========================
   CREATE LINK FORM
   =========================== */

export const CreateLinkForm = ({ onSuccess }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic'); // basic | security | advanced

  const [form, setForm] = useState({
    url: '',
    slug: '',
    title: '',
    metaDescription: '',
    creatorName: '',
    password: '',
    isOneTime: false,
    maxClicks: 0,
    expiresAt: '',
    showPreview: false,
    collection: 'General',
    scheduleStart: '',
    visibility: 'public', // NEW
  });

  // 🔁 Dynamic rules state
  const [conditionalRedirectEnabled, setConditionalRedirectEnabled] =
    useState(false);

  const [deviceRules, setDeviceRules] = useState({
    mobileUrl: '',
    desktopUrl: '',
    tabletUrl: '',
    botUrl: '',
  });

  const [weekdayUrl, setWeekdayUrl] = useState('');
  const [weekendUrl, setWeekendUrl] = useState('');

  const [timeRule, setTimeRule] = useState({
    startHour: '',
    endHour: '',
    url: '',
  });

  const [clickRule, setClickRule] = useState({
    minClicks: '',
    maxClicks: '',
    url: '',
  });

  // 🌐 Webhook state
  const [webhookEnabled, setWebhookEnabled] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [webhookTriggers, setWebhookTriggers] = useState({
    onFirstClick: false,
    onExpiry: false,
    onOneTimeComplete: false,
  });

  // 🧠 Safety scanner state
  const [safety, setSafety] = useState(null);
  const [safetyLoading, setSafetyLoading] = useState(false);

  // 🔍 Similar links state
  const [similarLinks, setSimilarLinks] = useState([]);
  const [similarLoading, setSimilarLoading] = useState(false);

  /* --------------------------
     SAFETY SCAN
     -------------------------- */
  const handleScanSafety = async () => {
    const url = form.url.trim();

    if (!url) {
      toast.error('Enter a destination URL first');
      return;
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      toast.error('URL must start with http:// or https://');
      return;
    }

    try {
      setSafetyLoading(true);
      setSafety(null);

      const res = await api.post('/security/scan-url', { url });
      setSafety(res.data);
    } catch (err) {
      console.error('Safety scan error:', err);
      toast.error(
        err.response?.data?.message || 'Failed to scan link safety'
      );
    } finally {
      setSafetyLoading(false);
    }
  };

  /* --------------------------
     LEVEL-2 SIMILARITY FETCH
     -------------------------- */
  useEffect(() => {
    const url = form.url.trim();

    if (!url) {
      setSimilarLinks([]);
      return;
    }

    // Only check when a proper URL is there
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      setSimilarLinks([]);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        setSimilarLoading(true);

        const res = await api.get('/links/similar', {
          params: {
            url,
            title: (form.title || '').trim(),
            metaDescription: (form.metaDescription || '').trim(),
            ownerEmail: user?.email || undefined, // so backend can exclude own links
          },
        });

        setSimilarLinks(res.data || []);
      } catch (err) {
        console.error('Error fetching similar links:', err);
        // quiet fail is fine here
      } finally {
        setSimilarLoading(false);
      }
    }, 600); // debounce

    return () => clearTimeout(timeout);
  }, [form.url, form.title, form.metaDescription, user?.email]);

  /* --------------------------
     CREATE LINK SUBMIT
     -------------------------- */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.url.trim()) {
      toast.error('Destination URL is required');
      return;
    }

    if (
      form.url &&
      !form.url.startsWith('http://') &&
      !form.url.startsWith('https://')
    ) {
      toast.error('URL must start with http:// or https://');
      return;
    }

    setLoading(true);

    try {
      const normalizedMaxClicks = form.isOneTime
        ? 1
        : form.maxClicks > 0
        ? form.maxClicks
        : 0;

      // build conditionalRedirect from dynamic rules state
      let conditionalRedirect;
      if (conditionalRedirectEnabled) {
        conditionalRedirect = {
          enabled: true,
          deviceRules: {
            mobileUrl: deviceRules.mobileUrl || null,
            desktopUrl: deviceRules.desktopUrl || null,
            tabletUrl: deviceRules.tabletUrl || null,
            botUrl: deviceRules.botUrl || null,
          },
          dayTypeRules: {
            weekdayUrl: weekdayUrl || null,
            weekendUrl: weekendUrl || null,
          },
          timeOfDayRules:
            timeRule.url &&
            timeRule.startHour !== '' &&
            timeRule.endHour !== ''
              ? [
                  {
                    startHour: Number(timeRule.startHour),
                    endHour: Number(timeRule.endHour),
                    url: timeRule.url,
                  },
                ]
              : [],
          clickRules: clickRule.url
            ? [
                {
                  minClicks: clickRule.minClicks
                    ? Number(clickRule.minClicks)
                    : 0,
                  maxClicks: clickRule.maxClicks
                    ? Number(clickRule.maxClicks)
                    : null,
                  url: clickRule.url,
                },
              ]
            : [],
        };
      }

      // webhookConfig
      let webhookConfig;
      if (webhookEnabled && webhookUrl.trim()) {
        webhookConfig = {
          enabled: true,
          url: webhookUrl.trim(),
          secret: webhookSecret || null,
          triggers: {
            onFirstClick: webhookTriggers.onFirstClick,
            onExpiry: webhookTriggers.onExpiry,
            onOneTimeComplete: webhookTriggers.onOneTimeComplete,
          },
        };
      }

      // Payload that matches backend POST /api/links
      const payload = {
        targetUrl: form.url, // backend uses targetUrl
        slug: form.slug || undefined,
        title: form.title || form.url,
        metaDescription: form.metaDescription || undefined,
        creatorName:
          form.creatorName || user?.name || user?.email || 'Anonymous',
        password: form.password || undefined,
        isOneTime: form.isOneTime,
        maxClicks: normalizedMaxClicks,
        expiresAt: form.expiresAt || undefined,
        showPreview: form.showPreview,
        collection: form.collection,
        scheduleStart: form.scheduleStart || undefined,
        visibility: form.visibility,
        ownerEmail: user?.email || null,
        ...(conditionalRedirect ? { conditionalRedirect } : {}),
        ...(webhookConfig ? { webhookConfig } : {}),
      };

      Object.keys(payload).forEach((key) => {
        if (payload[key] === undefined) delete payload[key];
      });

      const response = await api.post('/links', payload);
      const newLink = response.data;

      toast.success('Link encrypted & armed.');

      // Reset form
      setForm({
        url: '',
        slug: '',
        title: '',
        metaDescription: '',
        creatorName: '',
        password: '',
        isOneTime: false,
        maxClicks: 0,
        expiresAt: '',
        showPreview: false,
        collection: 'General',
        scheduleStart: '',
        visibility: 'public',
      });

      // Reset everything else
      setConditionalRedirectEnabled(false);
      setDeviceRules({
        mobileUrl: '',
        desktopUrl: '',
        tabletUrl: '',
        botUrl: '',
      });
      setWeekdayUrl('');
      setWeekendUrl('');
      setTimeRule({
        startHour: '',
        endHour: '',
        url: '',
      });
      setClickRule({
        minClicks: '',
        maxClicks: '',
        url: '',
      });

      setWebhookEnabled(false);
      setWebhookUrl('');
      setWebhookSecret('');
      setWebhookTriggers({
        onFirstClick: false,
        onExpiry: false,
        onOneTimeComplete: false,
      });

      setSafety(null);
      setSimilarLinks([]);

      if (onSuccess) onSuccess(newLink);
    } catch (error) {
      console.error('Link creation error:', error);
      const errorMsg =
        error.response?.data?.message ||
        error.message ||
        'Failed to create link';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  /* --------------------------
     SAFETY BADGE UI
     -------------------------- */
  const renderSafetyBadge = () => {
    if (!safety) return null;

    const hasReasons =
      Array.isArray(safety.reasons) && safety.reasons.length > 0;

    const rawScore =
      typeof safety.score === 'number' && !Number.isNaN(safety.score)
        ? safety.score
        : 0;

    let label = '';
    let percentLabel = '0%';
    let badgeClasses =
      'inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-medium border';
    let Icon = ShieldCheck;

    if (!hasReasons && rawScore === 0) {
      badgeClasses +=
        ' bg-emerald-500/10 text-emerald-300 border-emerald-500/60';
      label = 'NO OBVIOUS RISK';
      percentLabel = '0%';
    } else {
      Icon = ShieldAlert;

      if (rawScore >= 85) {
        badgeClasses +=
          ' bg-red-600/15 text-red-300 border-red-500/70';
        label = 'OBVIOUSLY RISKY';
        percentLabel = '100%';
      } else if (rawScore >= 60) {
        badgeClasses +=
          ' bg-red-500/10 text-red-300 border-red-500/60';
        label = 'HIGH RISK';
        percentLabel = '75%';
      } else if (rawScore >= 30) {
        badgeClasses +=
          ' bg-amber-500/10 text-amber-300 border-amber-500/60';
        label = 'MODERATE RISK';
        percentLabel = '50%';
      } else {
        badgeClasses +=
          ' bg-yellow-500/10 text-yellow-300 border-yellow-500/60';
        label = 'LIGHT RISK';
        percentLabel = '20%';
      }
    }

    return (
      <span className={badgeClasses}>
        <Icon className="w-3 h-3" />
        <span>{label}</span>
        <span className="opacity-80 ml-1">
          · score {percentLabel}
        </span>
      </span>
    );
  };

  /* --------------------------
     SIMILAR LINKS PANEL
     -------------------------- */
  const renderSimilarLinks = () => {
    const url = form.url.trim();
    if (!url || !url.startsWith('http')) return null;

    return (
      <div className="mt-3 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-950/60 p-3 text-xs">
        <div className="flex items-center justify-between mb-1">
          <span className="font-medium text-slate-800 dark:text-slate-200">
            Similar links already stored in VanishLink
          </span>
          {similarLoading && (
            <span className="text-[10px] text-slate-600 dark:text-slate-400">
              Checking…
            </span>
          )}
        </div>

        {!similarLoading && similarLinks.length === 0 && (
          <p className="text-[11px] text-slate-500">
            No similar links found yet. This might be the first of its
            kind.
          </p>
        )}

        {similarLinks.length > 0 && (
          <ul className="mt-1 space-y-2">
            {similarLinks.map((item) => (
              <li
                key={item.id}
                className="p-2 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70"
              >
                <div className="text-[11px] text-slate-700 dark:text-slate-300 font-medium truncate">
                  {item.title || item.targetUrl}
                </div>
                <div className="text-[10px] text-slate-500 truncate">
                  {item.targetUrl}
                </div>
                {item.reasons?.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {item.reasons.map((r) => (
                      <span
                        key={r}
                        className="px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[9px] uppercase tracking-wide text-slate-700 dark:text-slate-300"
                      >
                        {r.replace(/-/g, ' ')}
                      </span>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  /* --------------------------
     RENDER
     -------------------------- */
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
            <div>
              <Input
                label="Destination URL"
                placeholder="https://topsecret.com/payload"
                value={form.url}
                onChange={(e) => {
                  setForm({ ...form, url: e.target.value });
                  setSafety(null);
                  setSimilarLinks([]);
                }}
                required
                icon={<LinkIcon className="w-4 h-4" />}
              />

              {/* Safety + suggestions */}
              <div className="flex flex-wrap items-center gap-3 mt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={handleScanSafety}
                  disabled={safetyLoading}
                >
                  {safetyLoading ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      Scanning…
                    </>
                  ) : (
                    'Scan link safety'
                  )}
                </Button>

                {renderSafetyBadge()}
              </div>

              {safety &&
                Array.isArray(safety.reasons) &&
                safety.reasons.length > 0 && (
                  <ul className="mt-2 text-xs text-slate-600 dark:text-slate-400 list-disc pl-5 space-y-1">
                    {safety.reasons.map((reason, idx) => (
                      <li key={idx}>{reason}</li>
                    ))}
                  </ul>
                )}

              {renderSimilarLinks()}
            </div>

            <Input
              label="Link Title (Optional)"
              placeholder="Operation Blackbriar"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                Description (Optional)
              </label>
              <textarea
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 min-h-[70px]"
                placeholder="Short summary to help the system find similar links…"
                value={form.metaDescription}
                onChange={(e) =>
                  setForm({ ...form, metaDescription: e.target.value })
                }
              />
            </div>

            <Input
              label="Creator Name (Optional)"
              placeholder="Your name or team"
              value={form.creatorName}
              onChange={(e) =>
                setForm({ ...form, creatorName: e.target.value })
              }
              icon={<User className="w-4 h-4" />}
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Custom Slug"
                placeholder="my-custom-link"
                value={form.slug}
                onChange={(e) =>
                  setForm({ ...form, slug: e.target.value })
                }
                className="font-mono text-sm"
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

            {/* Visibility */}
            <div className="relative">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                Visibility
              </label>
              <select
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500 text-sm"
                value={form.visibility}
                onChange={(e) =>
                  setForm({ ...form, visibility: e.target.value })
                }
              >
                <option value="public">
                  Public – can be suggested to other users
                </option>
                <option value="private">
                  Private – only you can access it
                </option>
              </select>
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

              {!form.isOneTime && (
                <div className="space-y-2">
                  <label className="text-xs text-slate-500 uppercase">
                    Max Access Count
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
            {/* Preview Mode */}
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
                  Show a &quot;Proceed with Caution&quot; page before redirecting.
                </p>
              </div>
            </div>

            {/* Scheduled Activation */}
            <div className="space-y-2">
              <label className="text-xs text-slate-500 uppercase">
                Scheduled Activation
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="datetime-local"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded px-10 py-2 text-slate-900 dark:text-white text-sm [&::-webkit-calendar-picker-indicator]:invert"
                  value={form.scheduleStart}
                  onChange={(e) =>
                    setForm({ ...form, scheduleStart: e.target.value })
                  }
                />
              </div>
              <p className="text-[10px] text-slate-500">
                Link will remain a &quot;404&quot; until this time.
              </p>
            </div>

             {/* 🔥 Dynamic redirect rules */}
            <section className="mt-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900">
              <header className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Dynamic Redirect Rules
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Optionally change destination based on device, time, day or
                    click count.
                  </p>
                </div>
                <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                  <span>Enable</span>
                  <input
                    type="checkbox"
                    className="accent-emerald-500"
                    checked={conditionalRedirectEnabled}
                    onChange={(e) =>
                      setConditionalRedirectEnabled(e.target.checked)
                    }
                  />
                </label>
              </header>

              {conditionalRedirectEnabled && (
                <div className="px-4 py-4 space-y-5 text-xs md:text-sm">
                  {/* Device rules */}
                  <div className="space-y-2">
                    <p className="font-medium text-slate-800 dark:text-slate-200">
                      Device-based redirects
                    </p>
                    <p className="text-slate-600 dark:text-slate-400 text-xs">
                      Send mobile / desktop users to different landing pages.
                    </p>
                    <div className="grid md:grid-cols-2 gap-3">
                      <div>
                        <label className="block mb-1 text-[11px] uppercase text-slate-600 dark:text-slate-400">
                          Mobile URL
                        </label>
                        <input
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                          placeholder="https://m.example.com"
                          value={deviceRules.mobileUrl}
                          onChange={(e) =>
                            setDeviceRules((prev) => ({
                              ...prev,
                              mobileUrl: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div>
                        <label className="block mb-1 text-[11px] uppercase text-slate-600 dark:text-slate-400">
                          Desktop URL
                        </label>
                        <input
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                          placeholder="https://example.com/desktop"
                          value={deviceRules.desktopUrl}
                          onChange={(e) =>
                            setDeviceRules((prev) => ({
                              ...prev,
                              desktopUrl: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div>
                        <label className="block mb-1 text-[11px] uppercase text-slate-600 dark:text-slate-400">
                          Tablet URL
                        </label>
                        <input
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                          placeholder="optional"
                          value={deviceRules.tabletUrl}
                          onChange={(e) =>
                            setDeviceRules((prev) => ({
                              ...prev,
                              tabletUrl: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div>
                        <label className="block mb-1 text-[11px] uppercase text-slate-600 dark:text-slate-400">
                          Bot / crawler URL
                        </label>
                        <input
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                          placeholder="optional"
                          value={deviceRules.botUrl}
                          onChange={(e) =>
                            setDeviceRules((prev) => ({
                              ...prev,
                              botUrl: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <hr className="border-slate-200 dark:border-slate-800" />

                  {/* Day type rules */}
                  <div className="space-y-2">
                    <p className="font-medium text-slate-800 dark:text-slate-200">
                      Weekday / Weekend
                    </p>
                    <p className="text-slate-600 dark:text-slate-400 text-xs">
                      Different pages on workdays vs Saturdays/Sundays.
                    </p>
                    <div className="grid md:grid-cols-2 gap-3">
                      <div>
                        <label className="block mb-1 text-[11px] uppercase text-slate-600 dark:text-slate-400">
                          Weekday URL (Mon–Fri)
                        </label>
                        <input
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                          placeholder="https://example.com/work"
                          value={weekdayUrl}
                          onChange={(e) => setWeekdayUrl(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block mb-1 text-[11px] uppercase text-slate-600 dark:text-slate-400">
                          Weekend URL (Sat–Sun)
                        </label>
                        <input
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                          placeholder="https://example.com/chill"
                          value={weekendUrl}
                          onChange={(e) => setWeekendUrl(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <hr className="border-slate-200 dark:border-slate-800" />

                  {/* Time of day rule */}
                  <div className="space-y-2">
                    <p className="font-medium text-slate-800 dark:text-slate-200">
                      Time-of-day redirect
                    </p>
                    <p className="text-slate-600 dark:text-slate-400 text-xs">
                      Optionally send users to a different URL during a specific
                      hour window.
                    </p>
                    <div className="grid md:grid-cols-[120px_120px_1fr] gap-3">
                      <div>
                        <label className="block mb-1 text-[11px] uppercase text-slate-600 dark:text-slate-400">
                          Start hour (0–23)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="23"
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                          value={timeRule.startHour}
                          onChange={(e) =>
                            setTimeRule((prev) => ({
                              ...prev,
                              startHour: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div>
                        <label className="block mb-1 text-[11px] uppercase text-slate-600 dark:text-slate-400">
                          End hour (0–23)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="23"
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                          value={timeRule.endHour}
                          onChange={(e) =>
                            setTimeRule((prev) => ({
                              ...prev,
                              endHour: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div>
                        <label className="block mb-1 text-[11px] uppercase text-slate-600 dark:text-slate-400">
                          Time window URL
                        </label>
                        <input
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                          placeholder="https://example.com/night-mode"
                          value={timeRule.url}
                          onChange={(e) =>
                            setTimeRule((prev) => ({
                              ...prev,
                              url: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      If start &gt; end (e.g. 22 → 6), the rule wraps around
                      midnight.
                    </p>
                  </div>

                  <hr className="border-slate-200 dark:border-slate-800" />

                  {/* Click count rule */}
                  <div className="space-y-2">
                    <p className="font-medium text-slate-800 dark:text-slate-200">
                      Click-based redirect
                    </p>
                    <p className="text-slate-600 dark:text-slate-400 text-xs">
                      e.g. first 10 visitors see a special offer page.
                    </p>
                    <div className="grid md:grid-cols-[120px_120px_1fr] gap-3">
                      <div>
                        <label className="block mb-1 text-[11px] uppercase text-slate-600 dark:text-slate-400">
                          Min clicks
                        </label>
                        <input
                          type="number"
                          min="0"
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                          value={clickRule.minClicks}
                          onChange={(e) =>
                            setClickRule((prev) => ({
                              ...prev,
                              minClicks: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div>
                        <label className="block mb-1 text-[11px] uppercase text-slate-600 dark:text-slate-400">
                          Max clicks (optional)
                        </label>
                        <input
                          type="number"
                          min="0"
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                          value={clickRule.maxClicks}
                          onChange={(e) =>
                            setClickRule((prev) => ({
                              ...prev,
                              maxClicks: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div>
                        <label className="block mb-1 text-[11px] uppercase text-slate-600 dark:text-slate-400">
                          Click range URL
                        </label>
                        <input
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                          placeholder="https://example.com/early-bird"
                          value={clickRule.url}
                          onChange={(e) =>
                            setClickRule((prev) => ({
                              ...prev,
                              url: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* 🌐 Webhook Integrations */}
            <section className="mt-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900">
              <header className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Webhook Integrations
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Call an external URL when this link is clicked or expires.
                  </p>
                </div>
                <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                  <span>Enable</span>
                  <input
                    type="checkbox"
                    className="accent-emerald-500"
                    checked={webhookEnabled}
                    onChange={(e) => setWebhookEnabled(e.target.checked)}
                  />
                </label>
              </header>

              {webhookEnabled && (
                <div className="px-4 py-4 space-y-4 text-xs md:text-sm">
                  <div className="space-y-2">
                    <label className="block mb-1 text-[11px] uppercase text-slate-600 dark:text-slate-400">
                      Webhook URL
                    </label>
                    <input
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                      placeholder="https://example.com/webhook-endpoint"
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                    />
                    <p className="text-[11px] text-slate-500">
                      This URL will receive POST requests with JSON payloads
                      when selected events occur.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="block mb-1 text-[11px] uppercase text-slate-600 dark:text-slate-400">
                      Secret (optional)
                    </label>
                    <input
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                      placeholder="Shared secret for verification"
                      value={webhookSecret}
                      onChange={(e) => setWebhookSecret(e.target.value)}
                    />
                    <p className="text-[11px] text-slate-500">
                      Sent as{' '}
                      <code className="font-mono">x-vanishlink-secret</code>{' '}
                      header so your server can verify the request.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="font-medium text-slate-800 dark:text-slate-200">
                      Trigger on events
                    </p>
                    <div className="grid gap-2">
                      <label className="flex items-center gap-2 text-xs text-slate-800 dark:text-slate-200">
                        <input
                          type="checkbox"
                          className="accent-emerald-500"
                          checked={webhookTriggers.onFirstClick}
                          onChange={(e) =>
                            setWebhookTriggers((prev) => ({
                              ...prev,
                              onFirstClick: e.target.checked,
                            }))
                          }
                        />
                        <span>
                          First click{' '}
                          <span className="text-slate-500">
                            (fires only the first time this link is opened)
                          </span>
                        </span>
                      </label>

                      <label className="flex items-center gap-2 text-xs text-slate-800 dark:text-slate-200">
                        <input
                          type="checkbox"
                          className="accent-emerald-500"
                          checked={webhookTriggers.onExpiry}
                          onChange={(e) =>
                            setWebhookTriggers((prev) => ({
                              ...prev,
                              onExpiry: e.target.checked,
                            }))
                          }
                        />
                        <span>
                          Expiry{' '}
                          <span className="text-slate-500">
                            (time-based or max-clicks expiry)
                          </span>
                        </span>
                      </label>

                      <label className="flex items-center gap-2 text-xs text-slate-800 dark:text-slate-200">
                        <input
                          type="checkbox"
                          className="accent-emerald-500"
                          checked={webhookTriggers.onOneTimeComplete}
                          onChange={(e) =>
                            setWebhookTriggers((prev) => ({
                              ...prev,
                              onOneTimeComplete: e.target.checked,
                            }))
                          }
                        />
                        <span>
                          One-time link consumed{' '}
                          <span className="text-slate-500">
                            (for links with &quot;burn after reading&quot;)
                          </span>
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>
        )}

        <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
          <Button type="submit" isLoading={loading}>
            {loading ? 'Encrypting...' : 'Generate VanishLink'}
          </Button>
        </div>
      </form>
    </div>
  );
};


       

/* ===========================
   EDIT LINK FORM
   =========================== */

export const EditLinkForm = ({ link, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');

  const [form, setForm] = useState({
    title: link.title || '',
    targetUrl: link.targetUrl || '',
    metaDescription: link.metaDescription || '',
    creatorName: link.creatorName || '',
    password: '',
    isOneTime: link.isOneTime || false,
    maxClicks: link.maxClicks || 0,
    expiresAt: link.expiresAt ? link.expiresAt.slice(0, 16) : '',
    showPreview: link.showPreview || false,
    collection: link.collection || 'General',
    visibility: link.visibility || 'public',
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
        metaDescription: form.metaDescription || undefined,
        creatorName: form.creatorName || undefined,
        password: form.password || undefined,
        isOneTime: form.isOneTime,
        maxClicks: form.isOneTime ? 1 : form.maxClicks,
        expiresAt: form.expiresAt || undefined,
        showPreview: form.showPreview,
        collection: form.collection,
        visibility: form.visibility,
      };

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
              onChange={(e) =>
                setForm({ ...form, targetUrl: e.target.value })
              }
              required
            />

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                Description (Optional)
              </label>
              <textarea
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 min-h-[70px]"
                placeholder="Short description for this link"
                value={form.metaDescription}
                onChange={(e) =>
                  setForm({ ...form, metaDescription: e.target.value })
                }
              />
            </div>

            <Input
              label="Creator Name (Optional)"
              placeholder="Your name or team"
              value={form.creatorName}
              onChange={(e) =>
                setForm({ ...form, creatorName: e.target.value })
              }
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

            {/* Visibility */}
            <div className="relative">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                Visibility
              </label>
              <select
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500 text-sm"
                value={form.visibility}
                onChange={(e) =>
                  setForm({ ...form, visibility: e.target.value })
                }
              >
                <option value="public">
                  Public – can be suggested to other users
                </option>
                <option value="private">
                  Private – only you can access it
                </option>
              </select>
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
