import React, { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Loader } from '../../components/ui/Loader';
import toast from 'react-hot-toast';
import api from '../../services/api';

const OAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const hasRun = useRef(false);

  useEffect(() => {
    // Prevent duplicate execution in React StrictMode
    if (hasRun.current) return;
    hasRun.current = true;
    const handleOAuth = async () => {
      const token = searchParams.get('token');
      const error = searchParams.get('error');

      if (error) {
        toast.error('OAuth login failed');
        navigate('/login', { replace: true });
        return;
      }

      if (!token) {
        toast.error('No token received');
        navigate('/login', { replace: true });
        return;
      }

      try {
        // Fetch user details
        const response = await api.get('/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const user = response.data.user;
        if (!user) throw new Error('No user data');

        // Login
        login(user, token);
        
        // Redirect
        const destination = user.role === 'admin' ? '/admin' : '/dashboard';
        toast.success(`Welcome, ${user.name}!`);
        navigate(destination, { replace: true });
      } catch (err) {
        console.error('OAuth error:', err);
        toast.error('Authentication failed');
        navigate('/login', { replace: true });
      }
    };

    handleOAuth();
  }, []); // Empty dependency - run once

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
      <Loader />
    </div>
  );
};

export default OAuthCallback;
