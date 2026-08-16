import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, Check, AlertCircle, Eye, EyeOff, Loader, Mail, RefreshCw, ShieldCheck, UserRound, Verified } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

const AccountSettingsModal = ({ isOpen, onClose }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { changePassword, updateStudentDisplayName, initiateEmailChange, verifyEmailChange, resendEmailChangeCode, user, initiateVerifyAccount, resendVerifyAccount, confirmVerifyAccount } = useAuthStore();

  const isStudentUser = user?.user_role === 'student';
  const isDefaultLrnEmail = user?.user_email ? /^\d{10,}@gmail\.com$/i.test(user.user_email) : false;

  // Student display name state
  const [displayName, setDisplayName] = useState('');
  const [displayError, setDisplayError] = useState('');
  const [displaySuccess, setDisplaySuccess] = useState('');
  const [displaySubmitting, setDisplaySubmitting] = useState(false);

  // Email change state
  const [newEmail, setNewEmail] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [emailStep, setEmailStep] = useState(1); // 1: enter email, 2: enter code
  const [emailError, setEmailError] = useState('');
  const [emailSuccess, setEmailSuccess] = useState('');
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  
  // Verify current email state (for legacy unverified users)
  const [verifyStep, setVerifyStep] = useState(1); // 1: prompt, 2: enter code
  const [verifyCode, setVerifyCode] = useState('');
  const [verifyError, setVerifyError] = useState('');
  const [verifySuccess, setVerifySuccess] = useState('');
  const [verifySubmitting, setVerifySubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && isStudentUser) {
      setDisplayName(user?.student_display_name || '');
      setDisplayError('');
      setDisplaySuccess('');
      setDisplaySubmitting(false);
    }
  }, [isOpen, isStudentUser, user?.student_display_name]);
  
  const resetForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setError('');
    setSuccess('');
    setNewEmail('');
    setEmailCode('');
    setEmailStep(1);
    setEmailError('');
    setEmailSuccess('');
    setEmailSubmitting(false);
    setDisplayName(user?.student_display_name || '');
    setDisplayError('');
    setDisplaySuccess('');
    setDisplaySubmitting(false);
    // Reset verify state
    setVerifyStep(1);
    setVerifyCode('');
    setVerifyError('');
    setVerifySuccess('');
    setVerifySubmitting(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };
  
  const validateForm = () => {
    if (!currentPassword) {
      setError('Current password is required');
      return false;
    }
    
    if (!newPassword) {
      setError('New password is required');
      return false;
    }
    
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long');
      return false;
    }
    
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return false;
    }
    
    if (currentPassword === newPassword) {
      setError('New password must be different from current password');
      return false;
    }
    
    return true;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setError('');
    setSuccess('');
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await changePassword(currentPassword, newPassword);
      setSuccess('Password changed successfully');
      // Reset form fields after successful change
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDisplayNameSubmit = async (e) => {
    e.preventDefault();
    setDisplayError('');
    setDisplaySuccess('');

    const normalizedName = displayName.replace(/\s+/g, ' ').trim();

    if (normalizedName.length > 80) {
      setDisplayError('Display name must be 80 characters or fewer');
      return;
    }

    setDisplaySubmitting(true);

    try {
      await updateStudentDisplayName(normalizedName);
      setDisplayName(normalizedName);
      setDisplaySuccess(normalizedName ? 'Display name updated successfully' : 'Display name cleared');
    } catch (err) {
      setDisplayError(err.message || 'Failed to update display name');
    } finally {
      setDisplaySubmitting(false);
    }
  };

  const handleInitiateEmailChange = async (e) => {
    e.preventDefault();
    setEmailError('');
    setEmailSuccess('');
    if (!newEmail) {
      setEmailError('Please enter a new email');
      return;
    }
    // Basic email validation
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!re.test(newEmail)) {
      setEmailError('Please enter a valid email address');
      return;
    }
    if (user?.user_email && newEmail === user.user_email) {
      setEmailError('New email must be different from current email');
      return;
    }
    setEmailSubmitting(true);
    try {
      await initiateEmailChange(newEmail);
      setEmailSuccess('We sent a 6-digit code to your new email. Check Inbox/Spam.');
      setEmailStep(2);
    } catch (err) {
      setEmailError(err.message || 'Failed to start email change');
    } finally {
      setEmailSubmitting(false);
    }
  };

  const handleVerifyEmailChange = async (e) => {
    e.preventDefault();
    setEmailError('');
    if (!emailCode || emailCode.length < 6) {
      setEmailError('Please enter the 6-digit code');
      return;
    }
    setEmailSubmitting(true);
    try {
      await verifyEmailChange(emailCode);
      setEmailSuccess('Email updated successfully');
      setNewEmail('');
      setEmailCode('');
      setEmailStep(1);
    } catch (err) {
      setEmailError(err.message || 'Verification failed');
    } finally {
      setEmailSubmitting(false);
    }
  };

  const handleResendEmailChange = async () => {
    try {
      await resendEmailChangeCode();
      setEmailSuccess('A new verification code has been sent. Check Inbox/Spam.');
    } catch (err) {
      setEmailError(err?.message || 'Failed to resend code. Please try again.');
    }
  };

  const handleInitiateVerifyAccount = async () => {
    setVerifyError('');
    setVerifySuccess('');
    setVerifySubmitting(true);
    try {
      await initiateVerifyAccount();
      setVerifySuccess('We sent a 6-digit code to your current email. Check Inbox/Spam.');
      setVerifyStep(2);
    } catch (err) {
      setVerifyError(err.message || 'Failed to send verification code');
    } finally {
      setVerifySubmitting(false);
    }
  };

  const handleConfirmVerifyAccount = async (e) => {
    e.preventDefault();
    setVerifyError('');
    if (!verifyCode || verifyCode.length < 6) {
      setVerifyError('Please enter the 6-digit code');
      return;
    }
    setVerifySubmitting(true);
    try {
      await confirmVerifyAccount(verifyCode);
      setVerifySuccess('Your email has been verified.');
      setVerifyCode('');
      setVerifyStep(1);
    } catch (err) {
      setVerifyError(err.message || 'Verification failed');
    } finally {
      setVerifySubmitting(false);
    }
  };

  const handleResendVerifyAccount = async () => {
    setVerifyError('');
    try {
      await resendVerifyAccount();
      setVerifySuccess('A new code has been sent. Check Inbox/Spam.');
    } catch (err) {
      setVerifyError(err.message || 'Failed to resend code');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="teacher-modal-overlay"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', damping: 25 }}
            className="teacher-modal-panel sm:max-w-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="teacher-modal-header">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Account Settings</h2>
                <p className="mt-1 text-sm text-gray-500">
                  {isStudentUser ? 'Manage your display name, email, verification, and password.' : 'Manage your email, verification, and password.'}
                </p>
              </div>
              <button
                onClick={handleClose}
                className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="teacher-modal-body">
              {isStudentUser && (
                <div className="mb-8">
                  <h3 className="font-semibold text-gray-800 mb-1 flex items-center">
                    <UserRound className="h-5 w-5 mr-2 text-blue-600" />
                    Student Display Name
                  </h3>

                  {displayError && (
                    <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 rounded">
                      <div className="flex">
                        <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                        <p className="text-sm text-red-700">{displayError}</p>
                      </div>
                    </div>
                  )}

                  {displaySuccess && (
                    <div className="mb-4 p-3 bg-green-50 border-l-4 border-green-500 rounded">
                      <div className="flex">
                        <Check className="h-5 w-5 text-green-500 mr-2" />
                        <p className="text-sm text-green-700">{displaySuccess}</p>
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleDisplayNameSubmit}>
                    <label htmlFor="student-display-name" className="block text-sm font-medium text-gray-700 mb-1">
                      Display Name
                    </label>
                    <input
                      id="student-display-name"
                      type="text"
                      maxLength={80}
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-3"
                      placeholder={user?.user_fullname?.split(' ')[0] || 'Student'}
                    />
                    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                      <button
                        type="button"
                        onClick={() => setDisplayName('')}
                        disabled={displaySubmitting}
                        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-70 sm:w-auto"
                      >
                        Clear
                      </button>
                      <button
                        type="submit"
                        disabled={displaySubmitting}
                        className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-white transition-colors hover:bg-blue-700 disabled:opacity-70 sm:w-auto"
                      >
                        {displaySubmitting ? (
                          <div className="flex items-center justify-center">
                            <Loader className="animate-spin h-4 w-4 mr-2" />
                            Saving...
                          </div>
                        ) : (
                          'Save Display Name'
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Email Change */}
              <h3 className="font-semibold text-gray-800 mb-1 flex items-center">
                <Mail className="h-5 w-5 mr-2 text-blue-600" />
                Update Email
              </h3>
              <p className="text-xs text-gray-500 mb-3">
                Current email: <span className="font-medium text-gray-700">{user?.user_email || '—'}</span>
                {typeof user?.is_email_verified === 'boolean' && (
                  <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${user.is_email_verified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {user.is_email_verified ? 'Verified' : 'Unverified'}
                  </span>
                )}
              </p>
              {isDefaultLrnEmail && (
                <p className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 mb-3">
                  This looks like a placeholder school email (LRN-based). Please enter your personal email below and verify it so we can send you codes that actually arrive.
                </p>
              )}

              {user && user.is_email_verified === false && (
                <div className="mb-6 p-4 border rounded-lg bg-yellow-50 border-yellow-200">
                  <div className="flex items-start mb-3">
                    <Verified className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-gray-800">Verify your account</p>
                      <p className="text-xs text-gray-600">We noticed your email isn't verified. Verify to secure your account and enable all features.</p>
                      {isDefaultLrnEmail && (
                        <p className="text-xs text-gray-700 mt-1">If this address does not exist, add your personal email below and verify that one instead.</p>
                      )}
                    </div>
                  </div>

                  {verifyError && (
                    <div className="mb-3 p-3 bg-red-50 border-l-4 border-red-500 rounded">
                      <div className="flex"><AlertCircle className="h-5 w-5 text-red-500 mr-2" /><p className="text-sm text-red-700">{verifyError}</p></div>
                    </div>
                  )}
                  {verifySuccess && (
                    <div className="mb-3 p-3 bg-green-50 border-l-4 border-green-500 rounded">
                      <div className="flex"><Check className="h-5 w-5 text-green-500 mr-2" /><p className="text-sm text-green-700">{verifySuccess}</p></div>
                    </div>
                  )}

                  {verifyStep === 1 ? (
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={handleInitiateVerifyAccount}
                        disabled={verifySubmitting}
                        className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-70 w-full md:w-auto"
                      >
                        {verifySubmitting ? (
                          <div className="flex items-center"><Loader className="animate-spin h-4 w-4 mr-2" /> Sending...</div>
                        ) : (
                          'Send Code'
                        )}
                      </button>
                      <p className="text-[11px] text-gray-600 md:ml-3">We’ll email a 6-digit code to {user.user_email}. Check Spam/Junk if not in Inbox.</p>
                    </div>
                  ) : (
                    <form onSubmit={handleConfirmVerifyAccount}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Enter Verification Code</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        value={verifyCode}
                        onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-3"
                        placeholder="6-digit code"
                      />
                      <div className="flex items-center justify-between mb-3">
                        <button type="button" onClick={handleResendVerifyAccount} className="text-blue-600 hover:underline flex items-center">
                          <RefreshCw className="h-4 w-4 mr-1" /> Resend code
                        </button>
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={verifySubmitting}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-70 w-full md:w-auto"
                        >
                          {verifySubmitting ? (
                            <div className="flex items-center"><Loader className="animate-spin h-4 w-4 mr-2" /> Verifying...</div>
                          ) : (
                            <span className="flex items-center"><ShieldCheck className="h-4 w-4 mr-2" /> Verify Account</span>
                          )}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {emailError && (
                <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 rounded">
                  <div className="flex">
                    <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                    <p className="text-sm text-red-700">{emailError}</p>
                  </div>
                </div>
              )}

              {emailSuccess && (
                <div className="mb-4 p-3 bg-green-50 border-l-4 border-green-500 rounded">
                  <div className="flex">
                    <Check className="h-5 w-5 text-green-500 mr-2" />
                    <p className="text-sm text-green-700">{emailSuccess}</p>
                  </div>
                </div>
              )}

              {emailStep === 1 ? (
                <form onSubmit={handleInitiateEmailChange} className="mb-8">
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Email</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-3"
                    placeholder="yourname@example.com"
                  />
                  <div className="flex md:justify-end">
                    <button
                      type="submit"
                      disabled={emailSubmitting}
                      className="w-full md:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-70"
                    >
                      {emailSubmitting ? (
                        <div className="flex items-center">
                          <Loader className="animate-spin h-4 w-4 mr-2" />
                          Sending...
                        </div>
                      ) : (
                        'Send Code'
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">We’ll send a 6-digit code to your new email. Please also check your Spam/Junk folder.</p>
                </form>
              ) : (
                <form onSubmit={handleVerifyEmailChange} className="mb-8">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Enter Verification Code</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={emailCode}
                    onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-3"
                    placeholder="6-digit code"
                  />
                  <div className="flex items-center justify-between mb-3">
                    <button type="button" onClick={handleResendEmailChange} className="text-blue-600 hover:underline flex items-center">
                      <RefreshCw className="h-4 w-4 mr-1" /> Resend code
                    </button>
                  </div>
                  <div className="flex md:justify-end">
                    <button
                      type="submit"
                      disabled={emailSubmitting}
                      className="w-full md:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-70"
                    >
                      {emailSubmitting ? (
                        <div className="flex items-center">
                          <Loader className="animate-spin h-4 w-4 mr-2" />
                          Verifying...
                        </div>
                      ) : (
                        <span className="flex items-center"><ShieldCheck className="h-4 w-4 mr-2" /> Verify & Update Email</span>
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Didn’t get the email? Check Spam/Junk or Promotions folders, or resend a new code.</p>
                </form>
              )}
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center">
                <Lock className="h-5 w-5 mr-2 text-blue-600" />
                Change Password
              </h3>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 rounded">
                  <div className="flex">
                    <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              )}

              {success && (
                <div className="mb-4 p-3 bg-green-50 border-l-4 border-green-500 rounded">
                  <div className="flex">
                    <Check className="h-5 w-5 text-green-500 mr-2" />
                    <p className="text-sm text-green-700">{success}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} autoComplete="off">
                <div className="mb-4">
                  <label htmlFor="current-password" className="block text-sm font-medium text-gray-700 mb-1">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      id="current-password"
                      type={showCurrentPassword ? "text" : "password"}
                      name="cpw"
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter current password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="mb-4">
                  <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-1">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      id="new-password"
                      type={showNewPassword ? "text" : "password"}
                      name="npw"
                      autoComplete="new-password"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="mb-6">
                  <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      id="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      name="cnpw"
                      autoComplete="new-password"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Confirm new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-700 transition-colors hover:bg-gray-50 sm:w-auto"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-white transition-colors hover:bg-blue-700 disabled:opacity-70 sm:w-auto"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center">
                        <Loader className="animate-spin h-4 w-4 mr-2" />
                        Updating...
                      </div>
                    ) : (
                      'Change Password'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AccountSettingsModal;
