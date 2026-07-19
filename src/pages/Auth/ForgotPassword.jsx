import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { KeyRound, ArrowLeft, Lock, Mail, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [stage, setStage] = useState('request'); // request -> verify
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const requestCode = async (e) => {
    e.preventDefault();

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
      toast.error(err.response?.data?.message || 'Failed to send code');
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (e) => {
    e.preventDefault();

    if (!code || !newPassword) {
      toast.error('Enter code and new password');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
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
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Password reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-950 to-slate-900 px-4">
      <Card className="w-full max-w-md">
        <Link to="/login" className="inline-flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200 transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to Login
        </Link>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 bg-linear-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30">
            {stage === 'request' ? (
              <Mail className="w-7 h-7 text-emerald-400" />
            ) : (
              <Lock className="w-7 h-7 text-emerald-400" />
            )}
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">
            {stage === 'request' ? 'Reset Password' : 'Set New Password'}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            {stage === 'request'
              ? 'Enter your email to receive a reset code'
              : 'Enter the code and create a new password'}
          </p>
        </div>

        {stage === 'request' ? (
          <form onSubmit={requestCode} className="space-y-5">
            <Input
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              icon={<Mail className="w-5 h-5" />}
            />
            <Button type="submit" isLoading={loading} className="w-full group">
              <span>Send Reset Code</span>
              {!loading && <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />}
            </Button>
          </form>
        ) : (
          <form onSubmit={resetPassword} className="space-y-5">
            <Input
              label="Verification Code"
              type="text"
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              icon={<KeyRound className="w-5 h-5" />}
              className="text-center tracking-widest text-lg"
            />
            <Input
              label="New Password"
              type="password"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <Button type="submit" isLoading={loading} className="w-full group">
              <span>Update Password</span>
              {!loading && <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />}
            </Button>

            <p className="text-xs text-slate-500 text-center">
              Password must be at least 6 characters long
            </p>
          </form>
        )}

        <div className="mt-6 pt-6 border-t border-slate-300 dark:border-slate-700/50">
          <p className="text-sm text-slate-600 dark:text-slate-400 text-center">
            Remember your password?{' '}
            <Link to="/login" className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
};
export default ForgotPassword;