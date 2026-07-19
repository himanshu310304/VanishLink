import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, ShieldAlert, Lock, Eye } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { ReportLinkButton } from '../../components/links/ReportLinkButton';
import api from '../../services/api';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
// remove trailing /api to get backend root
const REDIRECT_BASE = API_BASE.replace(/\/api\/?$/, '');

const RedirectHandler = () => {
  const { slug } = useParams();

  const [status, setStatus] = useState('loading'); // loading | redirect | not_found | expired | scheduled | password | preview | error
  const [linkData, setLinkData] = useState(null);
  const [reason, setReason] = useState('');
  const [startsAt, setStartsAt] = useState(null);

  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    const fetchLink = async () => {
      try {
        setStatus('loading');

        const res = await api.get(`/links/${slug}`);

        // backend might return 200 with status field
        if (res.data.status === 'not_found') {
          setStatus('not_found');
          return;
        }

        if (res.data.status === 'expired') {
          setStatus('expired');
          setReason(res.data.reason || 'Link has self-destructed.');
          return;
        }

        if (res.data.status === 'scheduled') {
          setStatus('scheduled');
          setReason(res.data.reason || 'Link is not active yet.');
          if (res.data.startsAt) {
            setStartsAt(res.data.startsAt);
          }
          return;
        }

        const link = res.data.link;
        setLinkData(link);

        // order: password first, then preview, then direct redirect
        if (link.password) {
          setStatus('password');
          return;
        }

        if (link.showPreview) {
          setStatus('preview');
          return;
        }

        // Otherwise: direct redirect via backend /r/:slug
        setStatus('redirect');
        setTimeout(() => {
          window.location.href = `${REDIRECT_BASE}/r/${slug}`;
        }, 800);
      } catch (err) {
        console.error(err);
        setStatus('error');
      }
    };

    fetchLink();
  }, [slug]);

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (!linkData) return;

    if (!passwordInput.trim()) {
      setPasswordError('Password is required.');
      return;
    }

    // NOTE: for now, this compares plain text password coming from backend.
    // In real production, you would hash + verify on the server.
    if (passwordInput === linkData.password) {
      setPasswordError('');

      // if preview is also enabled, go to preview step next
      if (linkData.showPreview) {
        setStatus('preview');
      } else {
        setStatus('redirect');
        setTimeout(() => {
          window.location.href = `${REDIRECT_BASE}/r/${slug}`;
        }, 800);
      }
    } else {
      setPasswordError('Incorrect password. Try again.');
    }
  };

  // -----------------------
  // RENDER STATES
  // -----------------------

  if (status === 'loading' || status === 'redirect') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center text-slate-900 dark:text-white relative">
        {/* Universal Home Logo */}
        <div className="absolute top-6 left-6 md:top-8 md:left-8 z-50">
          <a href="/" className="flex items-center gap-2 text-emerald-500 font-bold text-xl tracking-tighter group cursor-pointer hover:scale-105 transition-transform">
            <ShieldAlert className="w-6 h-6 fill-emerald-500/20 group-hover:rotate-12 transition-transform duration-500" />
            <span className="tracking-[0.2em]">DEADMAN</span>
          </a>
        </div>
        <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
        <p className="text-slate-600 dark:text-slate-400 font-mono text-sm animate-pulse">
          {status === 'loading'
            ? 'Establishing Secure Handshake...'
            : 'Decryption Complete. Redirecting...'}
        </p>
      </div>
    );
  }

  if (status === 'not_found') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center border-red-500/20 bg-white dark:bg-slate-900">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Link Not Found</h1>
          <p className="text-slate-600 dark:text-slate-400">
            This Deadman link does not exist or was removed.
          </p>
        </Card>
      </div>
    );
  }

  if (status === 'expired') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center border-red-500/20 bg-white dark:bg-slate-900">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Connection Terminated</h1>
          <p className="text-slate-600 dark:text-slate-400">
            {reason || 'This Deadman link has expired or self-destructed.'}
          </p>
        </Card>
      </div>
    );
  }

  if (status === 'scheduled') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900">
          <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-400">
            <Eye className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Link Not Active Yet</h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            {reason || 'This Deadman link is scheduled to activate later.'}
          </p>
          {startsAt && (
            <p className="text-xs text-slate-500 mt-2">
              Activation time: {new Date(startsAt).toLocaleString()}
            </p>
          )}
        </Card>
      </div>
    );
  }

  // PASSWORD MODE
  if (status === 'password') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-500">
              <Lock className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Encrypted Payload</h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
              Enter password to decrypt destination.
            </p>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-3">
            <Input
              type="password"
              placeholder="Enter Password..."
              value={passwordInput}
              onChange={(e) => {
                setPasswordInput(e.target.value);
                setPasswordError('');
              }}
              className="text-center tracking-widest font-mono"
              autoFocus
            />
            {passwordError && (
              <p className="text-xs text-red-400 text-center">{passwordError}</p>
            )}
            <Button className="mt-2 w-full" type="submit">
              Unlock
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  // PREVIEW MODE (after password if needed)
  if (status === 'preview' && linkData) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-500">
              <Eye className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Safety Preview</h2>
          </div>

          <div className="my-4 p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-emerald-400 font-mono text-sm truncate">
            {linkData.targetUrl}
          </div>

          <div className="space-y-3">
            <Button
              onClick={() => {
                setStatus('redirect');
                setTimeout(() => {
                  window.location.href = `${REDIRECT_BASE}/r/${slug}`;
                }, 800);
              }}
            >
              Proceed to Destination
            </Button>

            <Button
              variant="secondary"
              type="button"
              className="w-full"
              onClick={() => {
                // simple cancel – user can close tab or go back
                window.history.back();
              }}
            >
              Cancel
            </Button>

            <div className="pt-4 border-t border-gray-800 flex justify-center">
              <ReportLinkButton 
                linkId={linkData._id} 
                linkSlug={slug}
              />
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Error fallback
  if (status === 'error') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center border-red-500/20 bg-white dark:bg-slate-900">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Something went wrong</h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm">Please try again later.</p>
        </Card>
      </div>
    );
  }

  return null;
};

export default RedirectHandler;
