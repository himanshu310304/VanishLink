import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Shield, Terminal, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const AdminForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [stage, setStage] = useState('request'); // request -> verify
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const navigate = useNavigate();

  const requestCode = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email) {
      toast.error('Email required');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email });
      toast.success(res.data?.message || 'Code sent');
      if (res.data?.devCode) {
        toast.success(`[DEV MODE] Verification code: ${res.data.devCode}`, { duration: 15000 });
      }
      setStage('verify');
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to send code';
      setErrorMessage('❌ ' + message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!code || !newPassword) {
      toast.error('Enter code and new password');
      return;
    }

    if (newPassword.length < 8) {
      const msg = 'Password must be at least 8 characters';
      setErrorMessage('⚠️ ' + msg);
      toast.error(msg);
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/reset-password', {
        email,
        code: code.trim(),
        newPassword,
      });
      toast.success(res.data?.message || 'Password reset successful');
      navigate('/admin/login');
    } catch (err) {
      const message = err.response?.data?.message || 'Password reset failed';
      setErrorMessage('❌ ' + message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-black px-4 relative overflow-hidden">
      {/* Universal Home Logo */}
      <div className="absolute top-6 left-6 md:top-8 md:left-8 z-50">
        <Link to="/" className="flex items-center gap-2 text-emerald-500 font-bold text-xl tracking-tighter group cursor-pointer hover:scale-105 transition-transform">
          <Shield className="w-6 h-6 fill-emerald-500/20 group-hover:rotate-12 transition-transform duration-500" />
          <span className="tracking-[0.2em]">VANISHLINK</span>
        </Link>
      </div>

      {/* Matrix-style background effect */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-full h-full bg-linear-to-b from-red-900/20 to-black"></div>
      </div>

      {/* Glitch effect bar */}
      <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-red-600 via-orange-500 to-red-600 animate-pulse"></div>

      <Card className="w-full max-w-md p-8 border-red-200 dark:border-red-900/50 bg-slate-50 dark:bg-slate-950 z-10 shadow-2xl shadow-red-900/20">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 bg-red-600/20 text-red-500 border border-red-600/50 animate-pulse">
            <Shield className="w-8 h-8" />
          </div>

          <h1 className="text-2xl font-bold text-red-500 tracking-wider font-mono mb-2">
            [PASSWORD RECOVERY]
          </h1>
          <p className="text-red-400/70 text-xs font-mono uppercase tracking-widest">
            ⚠ ADMIN CLEARANCE REQUIRED ⚠
          </p>
          <div className="mt-3 flex items-center justify-center gap-2 text-[10px] text-slate-500 font-mono">
            <Terminal className="w-3 h-3" />
            <span>ENCRYPTED CONNECTION ACTIVE</span>
          </div>
        </div>

        {/* Error Message Display */}
        {errorMessage && (
          <div className="bg-red-950/50 border-2 border-red-600/50 rounded-xl p-4 mb-6 animate-pulse">
            <div className="flex items-start gap-3">
              <div className="shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-red-200 font-mono font-bold">{errorMessage}</p>
              </div>
            </div>
          </div>
        )}

        {stage === 'request' ? (
          <form onSubmit={requestCode} className="space-y-5">
            <div>
              <label className="block text-xs font-mono text-red-400/80 mb-2 uppercase tracking-wider">
                Admin Email
              </label>
              <Input
                type="email"
                placeholder="root@vanishlink.sys"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="font-mono bg-slate-50 dark:bg-black/50 border-red-200 dark:border-red-900/50 text-red-100 placeholder:text-slate-600"
                required
              />
            </div>
            <Button 
              type="submit" 
              isLoading={loading}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-mono uppercase tracking-wider"
            >
              {loading ? 'Transmitting...' : 'Send Recovery Code'}
            </Button>
          </form>
        ) : (
          <form onSubmit={resetPassword} className="space-y-5">
            <div>
              <label className="block text-xs font-mono text-red-400/80 mb-2 uppercase tracking-wider">
                Verification Code
              </label>
              <Input
                type="text"
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="font-mono text-center tracking-widest text-lg bg-slate-50 dark:bg-black/50 border-red-200 dark:border-red-900/50 text-red-100 placeholder:text-slate-600"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-red-400/80 mb-2 uppercase tracking-wider">
                New Admin Password
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="font-mono bg-slate-50 dark:bg-black/50 border-red-200 dark:border-red-900/50 text-red-100 placeholder:text-slate-600"
                required
              />
            </div>
            <Button 
              type="submit" 
              isLoading={loading}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-mono uppercase tracking-wider"
            >
              {loading ? 'Processing...' : 'Reset Password'}
            </Button>
          </form>
        )}

        <div className="mt-6 pt-6 border-t border-red-200 dark:border-red-900/30">
          <div className="text-center">
            <Link to="/admin/login" className="text-xs text-slate-600 hover:text-slate-500 font-mono">
              ← Return to Admin Login
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AdminForgotPassword;
