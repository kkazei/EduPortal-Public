import React, { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, BookOpen, GraduationCap } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const { login, isLoading, error } = useAuthStore();

  const handleLogin = async (e) => {
    e.preventDefault();
    await login(email, password);
  };

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
          {/* Header */}
          <div className="flex justify-center mb-6">
            <div className="bg-blue-100 p-3 rounded-full">
              <GraduationCap size={32} className="text-blue-600" />
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">Teacher Portal</h2>
          <p className="text-center text-gray-600 mb-8">Welcome back! Please sign in to continue</p>
          
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-md">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}
          
          <form onSubmit={handleLogin}>
            {/* Email Field */}
            <div className="mb-5">
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
                  placeholder="teacher@eduportal.com"
                  autoComplete="email"
                />
              </div>
            </div>
            
            {/* Password Field */}
            <div className="mb-5">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock size={18} className="text-gray-400" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff size={18} className="text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye size={18} className="text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
            </div>
            
            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200 flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Footer Links */}
          <div className="text-center mt-6 space-y-2">
            <div>
              <Link to="/forgot-password" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                Forgot your password?
              </Link>
            </div>
            <p className="text-sm text-gray-600">
              Not a Teacher?{' '}
              <Link to="/student-login" className="text-blue-600 font-medium hover:text-blue-800">
                Student Login
              </Link>
            </p>
          </div>
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

export default LoginPage;
