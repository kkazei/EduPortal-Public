import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Lock, AlertCircle, CheckCircle, Mail, RefreshCw, ShieldCheck } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';

const FirstTimePasswordModal = ({ isOpen, userFullName, onVerifyLater }) => {
  const [formData, setFormData] = useState({
    email: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [step, setStep] = useState(1); // 1: set email+password, 2: verify code
  const [code, setCode] = useState('');

  const { initiateFirstTimeSetup, verifyFirstTimeEmail, resendFirstTimeEmailCode } = useAuthStore();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleVerifyLater = () => {
    if (typeof onVerifyLater === 'function') {
      onVerifyLater();
    }
  };

  const validatePassword = (password) => {
    const errors = [];
    if (password.length < 6) {
      errors.push('Password must be at least 6 characters long');
    }
    return errors;
  };

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    // Validate passwords
    const passwordErrors = validatePassword(formData.newPassword);
    const newErrors = {};

    if (passwordErrors.length > 0) {
      newErrors.newPassword = passwordErrors[0];
    }

    if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.newPassword) {
      newErrors.newPassword = 'New password is required';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    }

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    try {
      await initiateFirstTimeSetup(formData.newPassword, formData.email);
      toast.success('We sent a 6-digit code to your email. Enter it below to verify.');
      setStep(2);
    } catch (error) {
      toast.error(error.message || 'Failed to update password');
      setErrors({ submit: error.message || 'Failed to update password' });
    } finally {
      setIsLoading(false);
    }
  };

  const getPasswordStrength = (password) => {
    if (password.length === 0) return null;
    if (password.length < 6) return { level: 'weak', color: 'bg-red-500', text: 'Too Short' };
    if (password.length < 8) return { level: 'medium', color: 'bg-yellow-500', text: 'Good' };
    return { level: 'strong', color: 'bg-green-500', text: 'Strong' };
  };

  const passwordStrength = formData.newPassword ? getPasswordStrength(formData.newPassword) : null;

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!code || code.length < 6) {
      setErrors({ code: 'Please enter the 6-digit code' });
      return;
    }
    setIsLoading(true);
    try {
      await verifyFirstTimeEmail(code);
      toast.success('Email verified. Setup complete!');
      // Close handled by parent when user.is_first_login becomes false
    } catch (err) {
      setErrors({ code: err.message || 'Verification failed' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await resendFirstTimeEmailCode();
      toast.success('We sent a new code. Please check Inbox/Spam.');
    } catch (err) {
      toast.error(err?.message || 'Failed to resend code');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="teacher-modal-overlay">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="teacher-modal-panel sm:max-w-md"
      >
        {/* Header */}
        <div className="bg-blue-700 p-6 text-white">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center mr-4">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Welcome to EduPortal!</h2>
              <p className="text-blue-100 text-sm">{step === 1 ? 'Please set your email and password' : 'Verify your email to finish setup'}</p>
            </div>
          </div>
        </div>

        {step === 1 ? (
        <form onSubmit={handleSubmit} className="teacher-modal-body space-y-4">
          {/* Welcome message */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Hello, {userFullName}!</p>
                <p>
                  For your security, please enter your email and create a password to access your account.
                </p>
              </div>
            </div>
          </div>

          {/* Error message */}
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                <p className="text-sm text-red-700">{errors.submit}</p>
              </div>
            </div>
          )}

          {/* Email */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.email ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter your email"
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                <Mail className="w-5 h-5" />
              </div>
            </div>
            {errors.email && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.email}
              </p>
            )}
          </div>

          {/* New Password */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                className={`w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.newPassword ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter your new password"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            
            {/* Simplified password strength indicator */}
            {formData.newPassword && passwordStrength && (
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                  <span>Password strength:</span>
                  <span className={`font-medium ${
                    passwordStrength.level === 'strong' ? 'text-green-600' : 
                    passwordStrength.level === 'medium' ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {passwordStrength.text}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${passwordStrength.color}`}
                    style={{ 
                      width: passwordStrength.level === 'strong' ? '100%' : 
                             passwordStrength.level === 'medium' ? '66%' : '33%' 
                    }}
                  ></div>
                </div>
              </div>
            )}

            {errors.newPassword && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.newPassword}
              </p>
            )}
          </div>

          {/* Confirm Password */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm New Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Confirm your new password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            
            {formData.confirmPassword && formData.newPassword === formData.confirmPassword && (
              <p className="mt-1 text-sm text-green-600 flex items-center">
                <CheckCircle className="w-4 h-4 mr-1" />
                Passwords match
              </p>
            )}

            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.confirmPassword}
              </p>
            )}
          </div>

          {/* Simplified password requirements */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Password Requirements:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-2 ${
                  formData.newPassword.length >= 6 ? 'bg-green-500' : 'bg-gray-300'
                }`}></div>
                At least 6 characters long
              </li>
            </ul>
            <p className="text-xs text-gray-500 mt-2">
              💡 Tip: Use a combination of letters, numbers, or symbols for better security
            </p>
          </div>

          {/* Submit button */}
          <div className="space-y-3">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-4 rounded-xl transition-colors duration-200 flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  Sending code...
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5 mr-2" />
                  Continue & verify
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleVerifyLater}
              className="w-full border-2 border-gray-200 bg-gray-50 hover:border-gray-300 text-gray-800 font-semibold py-3 px-4 rounded-xl transition-colors duration-200"
            >
              Remind me later
            </button>
            <p className="text-xs text-center text-gray-600">
              You can keep using your account and finish verification later. We’ll prompt you again soon.
            </p>
          </div>
        </form>
        ) : (
          <form onSubmit={handleVerify} className="teacher-modal-body space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <ShieldCheck className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Check your email</p>
                  <p>We sent a verification code to your email. Enter the 6-digit code to verify.</p>
                  <p className="text-xs text-blue-600 mt-2">Tip: If you don’t see it, check your Spam/Junk or Promotions folder.</p>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Verification Code</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.code ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="Enter 6-digit code"
              />
              {errors.code && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.code}
                </p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <button type="button" onClick={handleResend} className="text-blue-600 hover:underline flex items-center justify-center">
                <RefreshCw className="w-4 h-4 mr-2" /> Resend code
              </button>
              <button type="button" onClick={() => setStep(1)} className="text-gray-600 hover:underline text-sm text-center">
                Change email
              </button>
            </div>

            <div className="space-y-3">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-4 rounded-xl transition-colors duration-200 flex items-center justify-center"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                    Verifying...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-5 h-5 mr-2" />
                    Verify now
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleVerifyLater}
                className="w-full border-2 border-gray-200 bg-gray-50 hover:border-gray-300 text-gray-800 font-semibold py-3 px-4 rounded-xl transition-colors duration-200"
              >
                Remind me later
              </button>
              <p className="text-xs text-center text-gray-600">
                Need time? We’ll remind you soon. You can also verify anytime in Account Settings.
              </p>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
};

export default FirstTimePasswordModal;
