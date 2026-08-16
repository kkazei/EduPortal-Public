import React, { useState } from "react";
import { motion } from "framer-motion";
import { Mail, ArrowLeft, BookOpen, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";

const StudentForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [isEmailSent, setIsEmailSent] = useState(false);

  const { forgotPassword, isLoading, error, message, clearMessages } = useAuthStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearMessages();

    try {
      await forgotPassword(email);
      setIsEmailSent(true);
    } catch (error) {
      // handled in store
    }
  };

  if (isEmailSent) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="min-h-screen flex items-center justify-center bg-slate-50 px-4"
      >
        {/* Logo */}
        <div className="absolute top-6 left-6 flex items-center">
          <BookOpen className="h-8 w-8 text-blue-600" />
          <h1 className="text-2xl font-bold text-blue-800 ml-2">EduPortal</h1>
        </div>

        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="flex justify-center mb-6">
              <div className="bg-green-100 p-3 rounded-full">
                <CheckCircle size={32} className="text-green-600" />
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-800 mb-4">Check Your Email</h2>
            <p className="text-gray-600 mb-6">
              We've sent password reset instructions to <strong>{email}</strong>.
              If you don't see it, please check your Spam/Junk or Promotions folder.
            </p>

            <div className="space-y-4">
              <Link
                to="/student-login"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200 inline-block"
              >
                Back to Student Login
              </Link>

              <button
                onClick={() => {
                  setIsEmailSent(false);
                  setEmail("");
                  clearMessages();
                }}
                className="w-full text-blue-600 hover:text-blue-800 font-medium py-2.5 px-4 rounded-lg border border-blue-600 hover:bg-blue-50 transition-colors duration-200"
              >
                Try Different Email
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen flex items-center justify-center bg-slate-50 px-4"
    >
      {/* Logo */}
      <div className="absolute top-6 left-6 flex items-center">
        <BookOpen className="h-8 w-8 text-blue-600" />
        <h1 className="text-2xl font-bold text-blue-800 ml-2">EduPortal</h1>
      </div>

      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex items-center justify-between mb-6">
            <Link
              to="/student-login"
              className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium"
            >
              <ArrowLeft size={18} className="mr-2" />
              Back to Student Login
            </Link>
          </div>

          <h2 className="text-2xl font-bold text-gray-800 mb-2">Forgot Password?</h2>
          <p className="text-gray-600 mb-8">
            Enter your email address and we'll send you instructions to reset your password.
          </p>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-md">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {message && (
            <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6 rounded-md">
              <p className="text-green-800 text-sm">{message}</p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail size={18} className="text-gray-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="student@example.com"
                  autoComplete="email"
                  required
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">Tip: Check Spam/Junk or Promotions if you don’t see the email.</p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200 flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Sending...
                </>
              ) : (
                'Send Reset Instructions'
              )}
            </button>
          </form>
        </div>

        <div className="text-center mt-6">
          <p className="text-xs text-gray-500">
            © {new Date().getFullYear()} EduPortal. All rights reserved.
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default StudentForgotPasswordPage;
