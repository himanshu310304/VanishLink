import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { Shield, Terminal, AlertTriangle, KeyRound } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const AdminRegister = () => {
  const [formData, setFormData] = useState({ name: '', email: '', password: '', adminSecurityKey: '' });
  const [code, setCode] = useState('');
  const [stage, setStage] = useState('form'); // form -> otp
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [searchParams] = useSearchParams();

  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const error = searchParams.get('error');
    if (error === 'account_exists') {
      setErrorMessage('⚠️ Admin account already exists. Use login instead.');
      toast.error('Admin account already exists. Use login instead.');
    } else if (error === 'oauth_failed') {
      setErrorMessage('❌ Authentication failed. Access denied.');
      toast.error('Authentication failed. Access denied.');
    }
  }, [searchParams]);

  const startRegistration = async (e) => {
    e.preventDefault();
    setErrorMessage(''); // Clear previous errors

    if (!formData.name || !formData.email || !formData.password || !formData.adminSecurityKey) {
      const message = '⚠️ All fields required for clearance';
      setErrorMessage(message);
      toast.error('All fields required for clearance');
      return;
    }

    if (formData.password.length < 8) {
      const message = '⚠️ Admin Password must be at least 8 characters';
      setErrorMessage(message);
      toast.error('Admin Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/register/initiate', {
        ...formData,
        role: 'admin' // Request admin role
      });
      toast.success(res.data?.message || 'Verification code transmitted');
      setStage('otp');
    } catch (err) {
      const message = err.response?.data?.message || 'Registration failed';
      setErrorMessage('❌ ' + message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const verifyRegistration = async (e) => {
    e.preventDefault();

    if (!code) {
      toast.error('Enter verification code');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/register/verify', {
        email: formData.email,
        code,
      });

      const { token, user } = res.data;

      // Verify admin role was granted
      if (user.role !== 'admin') {
        toast.error('Admin privileges not granted');
        setLoading(false);
        return;
      }

      login(user, token);
      toast.success('Root access granted. Welcome to the system.');
      navigate('/admin');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification failed');
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

      {/* Dark red background gradient */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-full h-full bg-linear-to-b from-red-900/20 to-black"></div>
      </div>

      {/* Animated top bar */}
      <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-red-600 via-orange-500 to-red-600 animate-pulse"></div>

      <Card className="w-full max-w-md p-8 border-red-200 dark:border-red-900/50 bg-slate-50 dark:bg-slate-950 z-10 shadow-2xl shadow-red-900/20">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-600/20 text-red-500 border border-red-600/50 mb-4 animate-pulse">
            {stage === 'form' ? <Shield className="w-8 h-8" /> : <KeyRound className="w-8 h-8" />}
          </div>
          <h1 className="text-2xl font-bold text-red-500 tracking-wider font-mono mb-2">
            {stage === 'form' ? '[ADMIN CLEARANCE]' : '[VERIFY ACCESS]'}
          </h1>
          <p className="text-red-400/70 text-xs font-mono uppercase tracking-widest">
            {stage === 'form'
              ? '⚠ HIGH SECURITY REGISTRATION ⚠'
              : 'AUTHENTICATION CODE REQUIRED'}
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
                {errorMessage.includes('already exists') && (
                  <Link 
                    to="/admin/login" 
                    className="inline-flex items-center gap-1 text-xs text-red-300 hover:text-red-200 mt-2 font-mono"
                  >
                    → ACCESS SYSTEM
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}

        {stage === 'form' ? (
          <form onSubmit={startRegistration} className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-red-400/80 mb-2 uppercase tracking-wider">
                Operator Name
              </label>
              <Input
                type="text"
                placeholder="Agent Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="font-mono bg-slate-50 dark:bg-black/50 border-red-200 dark:border-red-900/50 text-red-100 placeholder:text-slate-600"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-red-400/80 mb-2 uppercase tracking-wider">
                Admin Email
              </label>
              <Input
                type="email"
                placeholder="root@vanishlink.sys"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="font-mono bg-slate-50 dark:bg-black/50 border-red-200 dark:border-red-900/50 text-red-100 placeholder:text-slate-600"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-red-400/80 mb-2 uppercase tracking-wider">
                Create Admin Password (Min 8 chars)
              </label>
              <Input
                type="password"
                placeholder="Create your personal password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="font-mono bg-slate-50 dark:bg-black/50 border-red-200 dark:border-red-900/50 text-red-100"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-red-400/80 mb-2 uppercase tracking-wider">
                Master Security Key
              </label>
              <Input
                type="password"
                placeholder="Enter Server Admin Key"
                value={formData.adminSecurityKey}
                onChange={(e) => setFormData({ ...formData, adminSecurityKey: e.target.value })}
                className="font-mono bg-slate-50 dark:bg-black/50 border-red-200 dark:border-red-900/50 text-red-100 placeholder:text-red-900/50"
                required
              />
            </div>

            <Button 
              type="submit" 
              isLoading={loading}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-mono uppercase tracking-wider"
            >
              {loading ? 'Requesting...' : 'Request Clearance'}
            </Button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-red-200 dark:border-red-900/30"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-slate-50 dark:bg-slate-950 px-2 text-red-600/50 font-mono">Secure Auth</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:5050/api'}/auth/google/admin`}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-red-200 dark:border-red-900/50 rounded-lg text-sm text-red-400 hover:bg-red-950/30 hover:border-red-700/50 transition-colors font-mono"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#4285F4" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Admin SSO Registration
            </button>
          </form>
        ) : (
          <form onSubmit={verifyRegistration} className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-red-400/80 mb-2 uppercase tracking-wider">
                Verification Code
              </label>
              <Input
                type="text"
                placeholder="6-digit code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="font-mono bg-slate-50 dark:bg-black/50 border-red-200 dark:border-red-900/50 text-red-100 text-center text-lg tracking-widest placeholder:text-slate-600"
                required
              />
            </div>

            <Button 
              type="submit" 
              isLoading={loading}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-mono uppercase tracking-wider"
            >
              {loading ? 'Verifying...' : 'Verify & Grant Access'}
            </Button>

            <p className="text-xs text-red-500/70 text-center font-mono">
              Check your email for the authentication code
            </p>
          </form>
        )}

        <div className="mt-6 pt-6 border-t border-red-200 dark:border-red-900/30">
          <div className="flex items-center justify-center gap-2 text-xs text-slate-600">
            <AlertTriangle className="w-3 h-3" />
            <p className="font-mono">
              Already have clearance?{' '}
              <Link to="/admin/login" className="text-red-500 hover:text-red-400 font-semibold">
                Access System
              </Link>
            </p>
          </div>
          <div className="text-center mt-3">
            <Link to="/register" className="text-xs text-slate-600 hover:text-slate-500 font-mono">
              ← User Registration
            </Link>
          </div>
        </div>

        {/* Warning banner */}
        <div className="mt-4 p-2 bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded text-center">
          <p className="text-[10px] text-red-400/70 font-mono uppercase tracking-wider">
            All registration attempts are logged and monitored
          </p>
        </div>
      </Card>
    </div>
  );
};

export default AdminRegister;
