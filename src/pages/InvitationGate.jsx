import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';

const InvitationGate = () => {
  const { token } = useParams();
  const [invitation, setInvitation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Verification State
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  
  // Access State
  const [targetUrl, setTargetUrl] = useState(null);
  
  // StrictMode double-fire protection
  const otpRequested = useRef(false);

  useEffect(() => {
    fetchInvitation();
  }, [token]);

  const fetchInvitation = async () => {
    try {
      const res = await api.get(`/invitations/${token}`);
      const invData = res.data;
      setInvitation(invData);
      
      setLoading(false);
      // Automatically send the OTP so the user doesn't have to click a button
      const methods = invData.link?.allowedVerificationMethods || [];
      if (methods.includes('email_otp') && !otpRequested.current) {
        otpRequested.current = true;
        handleRequestOtp();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired invitation.');
      setLoading(false);
    }
  };

  const handleRequestOtp = async () => {
    setSendingOtp(true);
    setError(null);
    try {
      await api.post(`/zero-trust/request-otp`, { token });
      setOtpSent(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP.');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setVerifying(true);
    setError(null);
    try {
      // 1. Verify Identity
      await api.post(`/zero-trust/verify`, { token, otp, password });
      
      // 2. Register Device
      await api.post(`/zero-trust/register-device`, { token });
      
      // Verification successful, device registered. Now access.
      attemptAccess();
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed.');
      setVerifying(false);
    }
  };

  const attemptAccess = async () => {
    try {
      const res = await api.get(`/zero-trust/access/${token}`);
      setTargetUrl(res.data.targetUrl);
      // We could redirect automatically, but showing a button is safer for user experience
    } catch (err) {
      setError(err.response?.data?.message || 'Access Denied. Security anomaly detected.');
    } finally {
      setLoading(false);
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-xl text-gray-500">Checking invitation...</div>
      </div>
    );
  }

  if (error && !targetUrl) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 text-center border-t-4 border-red-500">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Access Denied</h2>
          <p className="text-red-500 dark:text-red-400 mb-6">{error}</p>
        </div>
      </div>
    );
  }

  if (targetUrl) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 text-center border-t-4 border-green-500">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Access Granted</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">Your device has been securely verified.</p>
          <a
            href={targetUrl}
            className="inline-block w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition duration-200"
          >
            Continue to Target
          </a>
        </div>
      </div>
    );
  }

  const allowedMethods = invitation?.link?.allowedVerificationMethods || [];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8 border-t-4 border-blue-500">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Secure Invitation</h2>
          <p className="text-gray-500 dark:text-gray-400">
            You have been invited to view <span className="font-semibold text-gray-700 dark:text-gray-300">{invitation?.link?.title || 'a secure link'}</span>.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            This invitation is exclusively for <strong>{invitation?.email}</strong>.
          </p>
        </div>

        {error && <div className="mb-4 bg-red-100 text-red-700 p-3 rounded text-sm text-center">{error}</div>}

        <form onSubmit={handleVerify} className="space-y-6">
          {allowedMethods.includes('email_otp') && (
            <div>
              <div className="flex justify-between items-end mb-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email OTP
                </label>
                <button
                  type="button"
                  onClick={handleRequestOtp}
                  disabled={sendingOtp}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 disabled:opacity-50"
                >
                  {sendingOtp ? 'Sending...' : otpSent ? 'Resend OTP' : 'Send OTP to Email'}
                </button>
              </div>
              <input
                type="text"
                className="w-full p-3 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="6-digit code"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required={!allowedMethods.includes('password')}
              />
              {otpSent && <p className="text-xs text-green-600 mt-1">OTP sent! Check your email (or server console).</p>}
            </div>
          )}

          {allowedMethods.includes('password') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Link Password
              </label>
              <input
                type="password"
                className="w-full p-3 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required={!allowedMethods.includes('email_otp')}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={verifying}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition duration-200 disabled:opacity-50"
          >
            {verifying ? 'Verifying & Registering Device...' : 'Verify Identity'}
          </button>
        </form>
        
        <div className="mt-6 text-xs text-center text-gray-400 dark:text-gray-500">
          Zero-Trust Security Enabled. This device will be registered upon successful verification.
        </div>
      </div>
    </div>
  );
};

export default InvitationGate;
