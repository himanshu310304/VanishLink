import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { Lock, Mail, ArrowRight, Sparkles, Shield } from 'lucide-react';
import { ThemeToggle } from '../../components/ui/ThemeToggle';
import toast from 'react-hot-toast';
import api from '../../services/api';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();

  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const error = searchParams.get('error');
    if (error === 'no_account') {
      toast.error('No account found. Please register first.');
    } else if (error === 'oauth_failed') {
      toast.error('Google authentication failed. Please try again.');
    } else if (error === 'oauth_unconfigured') {
      toast.error('Google OAuth is not configured on the server. Set client credentials in server/.env.');
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      toast.error('Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/login', {
        email: formData.email,
        password: formData.password,
      });

      const { token, user } = res.data;
      login(user, token);
      toast.success(`Welcome back, ${user.name}!`);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-50 via-slate-100 to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 px-4 relative overflow-hidden">
      {/* Universal Home Logo and Theme Toggle */}
      <div className="absolute top-6 left-6 md:top-8 md:left-8 z-50 flex items-center gap-4">
        <Link to="/" className="flex items-center gap-2 text-emerald-500 font-bold text-xl tracking-tighter group cursor-pointer hover:scale-105 transition-transform">
          <Shield className="w-6 h-6 fill-emerald-500/20 group-hover:rotate-12 transition-transform duration-500" />
          <span className="tracking-[0.2em]">VANISHLINK</span>
        </Link>
        <ThemeToggle />
      </div>

      {/* Ambient effects */}
      <div className="absolute top-0 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-0 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
      
      <Card className="w-full max-w-md relative z-10 shadow-2xl shadow-black/50">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-linear-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-xl shadow-emerald-500/30">
            <Lock size={28} className="text-slate-900 dark:text-white" />
          </div>

          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Welcome Back</h1>
          <p className="text-slate-700 dark:text-slate-300">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Email Address"
            type="email"
            placeholder="you@example.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            icon={<Mail className="w-5 h-5" />}
            required
          />
          <div>
            <div className="flex justify-between items-center mb-2.5">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Password
              </label>
              <Link to="/forgot-password" className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors">
                Forgot?
              </Link>
            </div>
            <Input
              type="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              className="mb-0"
            />
          </div>

          <Button type="submit" isLoading={loading} className="w-full group">
            <span>Sign In</span>
            {!loading && <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />}
          </Button>
        </form>

        <div className="mt-6 space-y-4">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-300 dark:border-slate-700/50"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white dark:bg-slate-900/40 backdrop-blur px-2 text-slate-500 font-medium">Or continue with</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:5050/api'}/auth/google/login`}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-slate-600/50 rounded-xl text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:bg-slate-800/50 hover:border-slate-500 transition-all duration-300 backdrop-blur-sm group"
          >
            <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span className="group-hover:text-slate-900 dark:text-white transition-colors">Continue with Google</span>
          </button>
        </div>

        <div className="mt-6 pt-6 border-t border-slate-300 dark:border-slate-700/50 space-y-3">
          <p className="text-sm text-slate-600 dark:text-slate-400 text-center">
            Don't have an account?{' '}
            <Link to="/register" className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors">
              Create account
            </Link>
          </p>
          <p className="text-xs text-slate-500 text-center">
            <Link to="/admin/login" className="hover:text-slate-600 dark:text-slate-400 transition-colors inline-flex items-center gap-1">
              <span>Admin access</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
};

export default Login;