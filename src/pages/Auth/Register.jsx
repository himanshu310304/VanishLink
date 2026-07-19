import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { Shield, Mail, User, KeyRound, ArrowRight, CheckCircle } from 'lucide-react';
import { ThemeToggle } from '../../components/ui/ThemeToggle';
import toast from 'react-hot-toast';
import api from '../../services/api';

const Register = () => {
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
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
      setErrorMessage('An account with this email already exists. Please login instead.');
      toast.error('Account already exists. Please login instead.');
    } else if (error === 'oauth_failed') {
      setErrorMessage('Google authentication failed. Please try again.');
      toast.error('Google authentication failed. Please try again.');
    } else if (error === 'oauth_unconfigured') {
      setErrorMessage('Google OAuth is not configured on the server. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in server/.env.');
      toast.error('Google OAuth is not configured on the server.');
    }
  }, [searchParams]);

  const startRegistration = async (e) => {
    e.preventDefault();
    setErrorMessage(''); // Clear previous errors

    if (!formData.name || !formData.email || !formData.password) {
      const message = 'All fields are required';
      setErrorMessage(message);
      toast.error(message);
      return;
    }

    if (formData.password.length < 6) {
      const message = 'Password must be at least 6 characters';
      setErrorMessage(message);
      toast.error(message);
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/register/initiate', formData);
      toast.success(res.data?.message || 'Verification code sent');
      if (res.data?.devCode) {
        toast.success(`[DEV MODE] Verification code: ${res.data.devCode}`, { duration: 15000 });
      }
      setStage('otp');
    } catch (err) {
      const message = err.response?.data?.message || 'Registration failed';
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const verifyRegistration = async (e) => {
    e.preventDefault();

    if (!code) {
      toast.error('Enter the code sent to your email');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/register/verify', {
        email: formData.email,
        code,
      });

      const { token, user } = res.data;
      login(user, token);
      toast.success('Account verified. Welcome!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification failed');
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

      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 -left-40 w-96 h-96 bg-emerald-500/5 rounded-full mix-blend-multiply blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/3 -right-40 w-96 h-96 bg-purple-500/5 rounded-full mix-blend-multiply blur-3xl animate-pulse animation-delay-2000"></div>
      </div>

      <Card className="w-full max-w-md p-8 z-10 relative">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 bg-linear-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30">
            {stage === 'form' ? (
              <Shield className="w-7 h-7 text-emerald-400" />
            ) : (
              <CheckCircle className="w-7 h-7 text-emerald-400" />
            )}
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">
            {stage === 'form' ? 'Create Account' : 'Verify Email'}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            {stage === 'form'
              ? 'Join vanishlink links community'
              : 'Enter the code from your email'}
          </p>
        </div>

        {/* Error Message Display */}
        {errorMessage && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="shrink-0 mt-0.5">
                <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm text-red-200 font-medium">{errorMessage}</p>
                {errorMessage.includes('already exists') && (
                  <Link 
                    to="/login" 
                    className="inline-flex items-center gap-1 text-xs text-red-300 hover:text-red-200 mt-2 font-medium"
                  >
                    Go to Login →
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}

        {stage === 'form' ? (
          <form onSubmit={startRegistration} className="space-y-5">
            <Input
              label="Full Name"
              type="text"
              placeholder="John Doe"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              icon={<User className="w-5 h-5" />}
            />

            <Input
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              icon={<Mail className="w-5 h-5" />}
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />

            <Button type="submit" isLoading={loading} className="w-full group">
              <span>Continue</span>
              {!loading && <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />}
            </Button>

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-300 dark:border-slate-700/50"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-slate-900/40 backdrop-blur px-2 text-slate-500 font-medium">Or</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:5050/api'}/auth/google/register`}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-slate-600/50 rounded-xl text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:bg-slate-800/50 hover:border-slate-500 transition-all duration-300 backdrop-blur-sm group"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span className="group-hover:text-slate-900 dark:text-white transition-colors">Sign up with Google</span>
            </button>
          </form>
        ) : (
          <form onSubmit={verifyRegistration} className="space-y-5">
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

            <Button type="submit" isLoading={loading} className="w-full group">
              <span>Verify & Create Account</span>
              {!loading && <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />}
            </Button>

            <p className="text-xs text-slate-500 text-center">
              Didn't receive code? Check spam or wait 1 minute to retry.
            </p>
          </form>
        )}

        <div className="mt-6 pt-6 border-t border-slate-300 dark:border-slate-700/50">
          <p className="text-sm text-slate-600 dark:text-slate-400 text-center">
            Already have an account?{' '}
            <Link to="/login" className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
};

export default Register;