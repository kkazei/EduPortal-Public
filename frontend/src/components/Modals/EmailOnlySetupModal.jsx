import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, RefreshCw, ShieldCheck, AlertCircle, Loader } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';

const EmailOnlySetupModal = ({ isOpen, onRemindLater }) => {
  const { initiateEmailChange, verifyEmailChange, resendEmailChangeCode, user, checkAuth } = useAuthStore();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!isOpen) return null;

  const sendCode = async () => {
    setError('');
    setSuccess('');
    if (!email) {
      setError('Please enter your email');
      return;
    }
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!re.test(email)) {
      setError('Please enter a valid email');
      return;
    }
    setLoading(true);
    try {
      await initiateEmailChange(email);
      setSuccess('We sent a 6-digit code to your email.');
      setStep(2);
    } catch (e) {
      setError(e.message || 'Failed to send code');
    } finally {
      setLoading(false);
    }
  };

  const confirm = async () => {
    setError('');
    setSuccess('');
    if (!code || code.length < 6) {
      setError('Enter the 6-digit code');
      return;
    }
    setLoading(true);
    try {
      await verifyEmailChange(code);
      setSuccess('Email verified successfully.');
      // Refresh user to clear any gating token
      try { await checkAuth(); } catch (_) {}
    } catch (e) {
      setError(e.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setError('');
    try {
      await resendEmailChangeCode();
      setSuccess('A new code has been sent.');
    } catch (e) {
      setError(e.message || 'Failed to resend code');
    }
  };

  const handleRemindLater = () => {
    if (typeof onRemindLater === 'function') {
      onRemindLater();
    }
  };

  return (
    <div className="teacher-modal-overlay z-[1000]">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="teacher-modal-panel sm:max-w-md"
      >
        <div className="bg-blue-700 p-6 text-white">
          <h2 className="text-xl font-bold">Add your email</h2>
          <p className="text-blue-100 text-sm">Your school requires an email to continue.</p>
        </div>

        {step === 1 ? (
          <div className="teacher-modal-body">
            {error && (
              <div className="mb-3 p-3 bg-red-50 border-l-4 border-red-500 rounded flex items-start">
                <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
            {success && (
              <div className="mb-3 p-3 bg-green-50 border-l-4 border-green-500 rounded flex items-start">
                <ShieldCheck className="h-5 w-5 text-green-600 mr-2" />
                <p className="text-sm text-green-700">{success}</p>
              </div>
            )}

            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <div className="relative mb-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="you@example.com"
              />
              <Mail className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
            </div>

            <button
              onClick={sendCode}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
            >
              {loading ? (
                <>
                  <Loader className="h-5 w-5 mr-2 animate-spin" /> Sending...
                </>
              ) : (
                'Send Code'
              )}
            </button>
            <p className="text-xs text-gray-500 mt-2">We’ll send a 6-digit code to verify your email.</p>

            <button
              type="button"
              onClick={handleRemindLater}
              className="mt-4 w-full border-2 border-gray-200 bg-gray-50 hover:border-gray-300 text-gray-800 font-semibold py-3 px-4 rounded-xl transition-colors duration-200"
            >
              Remind me later
            </button>
            <p className="text-xs text-center text-gray-600 mt-2">Can’t access email now? You can keep using your account and verify later.</p>
          </div>
        ) : (
          <div className="teacher-modal-body">
            {error && (
              <div className="mb-3 p-3 bg-red-50 border-l-4 border-red-500 rounded flex items-start">
                <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
            {success && (
              <div className="mb-3 p-3 bg-green-50 border-l-4 border-green-500 rounded flex items-start">
                <ShieldCheck className="h-5 w-5 text-green-600 mr-2" />
                <p className="text-sm text-green-700">{success}</p>
              </div>
            )}

            <label className="block text-sm font-medium text-gray-700 mb-1">Verification Code</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-3"
              placeholder="Enter 6-digit code"
            />

            <div className="flex items-center justify-between mb-3">
              <button type="button" onClick={resend} className="text-blue-600 hover:underline flex items-center">
                <RefreshCw className="h-4 w-4 mr-1" /> Resend code
              </button>
            </div>

            <button
              onClick={confirm}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
            >
              {loading ? (
                <>
                  <Loader className="h-5 w-5 mr-2 animate-spin" /> Verifying...
                </>
              ) : (
                <>
                  <ShieldCheck className="h-5 w-5 mr-2" /> Verify Email
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleRemindLater}
              className="mt-4 w-full border-2 border-gray-200 bg-gray-50 hover:border-gray-300 text-gray-800 font-semibold py-3 px-4 rounded-xl transition-colors duration-200"
            >
              Remind me later
            </button>
            <p className="text-xs text-center text-gray-600 mt-2">If the code isn’t arriving, you can verify later from Account Settings.</p>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default EmailOnlySetupModal;
