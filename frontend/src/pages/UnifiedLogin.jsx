import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { BookOpen, User, KeyRound, EyeOff, Eye, Mail, Lock, GraduationCap, Users, ArrowRight } from 'lucide-react';
import PrivacyPolicyModal from '../components/PrivacyPolicyModal';

const UnifiedLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isStudent, setIsStudent] = useState(location.pathname === '/student-login');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const { login, studentLogin } = useAuthStore();
  
  // Teacher form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  // Student form state
  const [formData, setFormData] = useState({
    lrn: '',
    password: ''
  });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear errors when user types
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validateStudentForm = () => {
    const newErrors = {};
    
    // Check if the field is empty
    if (!formData.lrn) {
      newErrors.lrn = 'Email is required';
    } else {
      // If it has @ symbol, validate as email
      if (formData.lrn.includes('@')) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.lrn)) {
          newErrors.lrn = 'Please enter a valid email address';
        }
      } 
      // Otherwise validate as LRN (12 digits)
      else if (!/^\d{12}$/.test(formData.lrn)) {
        newErrors.lrn = 'LRN must be exactly 12 digits';
      }
    }
    
    // Validate password
    if (!formData.password) {
      newErrors.password = 'Password is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleTeacherLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      await login(email, password);
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStudentLogin = async (e) => {
    e.preventDefault();
    
    if (!validateStudentForm()) return;
    
    setIsLoading(true);
    try {
      // Format the input as email if it's just an LRN
      const formattedInput = formData.lrn.includes('@') ? formData.lrn : `${formData.lrn}@gmail.com`;
      
      // Use the studentLogin method from authStore
      await studentLogin(formattedInput, formData.password);
      
      toast.success('Login successful!');
      
      // Navigate to student dashboard
      navigate('/student-dashboard', { replace: true });
      
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed. Please try again.';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = () => {
    const newMode = !isStudent;
    setIsStudent(newMode);
    // Update URL without page reload
    navigate(newMode ? '/student-login' : '/login', { replace: true });
    // Clear all form data and errors when switching
    setEmail('');
    setPassword('');
    setFormData({ lrn: '', password: '' });
    setErrors({});
    setError('');
    setShowPassword(false);
  };

  // Update mode when URL changes (back/forward navigation)
  useEffect(() => {
    setIsStudent(location.pathname === '/student-login');
  }, [location.pathname]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white px-4"
    >
      {/* Logo */}
      <Link to="/" className="absolute top-6 left-6 flex items-center hover:opacity-80 transition-opacity">
        <BookOpen className="h-8 w-8 text-blue-600" />
        <h1 className="text-2xl font-bold text-blue-800 ml-2">EduPortal</h1>
      </Link>

      <div className="w-full max-w-md">
        <motion.div 
          layout
          className="bg-white rounded-xl shadow-lg p-8 overflow-hidden"
        >
          {/* Animated Header */}
          <motion.div layout className="flex justify-center mb-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={isStudent ? 'student' : 'teacher'}
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 180 }}
                transition={{ duration: 0.5, type: 'spring' }}
                className={`${isStudent ? 'bg-purple-100' : 'bg-blue-100'} p-3 rounded-full`}
              >
                {isStudent ? (
                  <Users size={32} className="text-purple-600" />
                ) : (
                  <GraduationCap size={32} className="text-blue-600" />
                )}
              </motion.div>
            </AnimatePresence>
          </motion.div>
          
          {/* Animated Title */}
          <AnimatePresence mode="wait">
            <motion.div
              key={isStudent ? 'student-title' : 'teacher-title'}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">
                {isStudent ? 'Student Portal' : 'Teacher Portal'}
              </h2>
              <p className="text-center text-gray-600 mb-8">
                {isStudent ? 'Login with your Email' : 'Welcome back! Please sign in to continue'}
              </p>
            </motion.div>
          </AnimatePresence>
          
          {/* Error Message */}
          <AnimatePresence>
            {(error || Object.keys(errors).length > 0) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-md overflow-hidden"
              >
                <p className="text-red-800 text-sm">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Animated Form */}
          <AnimatePresence mode="wait">
            {isStudent ? (
              <motion.form
                key="student-form"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.4 }}
                onSubmit={handleStudentLogin}
              >
                {/* LRN/Email Field */}
                <div className="mb-5">
                  <label htmlFor="lrn" className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User size={18} className="text-gray-400" />
                    </div>
                    <input
                      id="lrn"
                      name="lrn"
                      type="text"
                      value={formData.lrn}
                      onChange={handleChange}
                      className={`appearance-none block w-full pl-10 pr-3 py-2.5 border ${
                        errors.lrn ? 'border-red-500' : 'border-gray-300'
                      } rounded-lg focus:outline-none focus:ring-purple-500 focus:border-purple-500`}
                      placeholder="Enter your Email"
                      autoComplete="off"
                    />
                  </div>
                  {errors.lrn && (
                    <p className="mt-1 text-sm text-red-600">{errors.lrn}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    Enter Your Email Address.
                  </p>
                </div>
                
                {/* Password Field */}
                <div className="mb-5">
                  <label htmlFor="student-password" className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <KeyRound size={18} className="text-gray-400" />
                    </div>
                    <input
                      id="student-password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={handleChange}
                      className={`appearance-none block w-full pl-10 pr-10 py-2.5 border ${
                        errors.password ? 'border-red-500' : 'border-gray-300'
                      } rounded-lg focus:outline-none focus:ring-purple-500 focus:border-purple-500`}
                      placeholder="Enter your password"
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
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                  )}
                </div>
                
                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2.5 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors duration-200 flex items-center justify-center"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Logging in...
                    </>
                  ) : (
                    'Log in'
                  )}
                </button>
                
                <div className="mt-4 text-right">
                  <Link to="/student/forgot-password" className="text-sm text-purple-600 hover:text-purple-800">
                    Forgot your password?
                  </Link>
                </div>
              </motion.form>
            ) : (
              <motion.form
                key="teacher-form"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.4 }}
                onSubmit={handleTeacherLogin}
              >
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
                  <label htmlFor="teacher-password" className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock size={18} className="text-gray-400" />
                    </div>
                    <input
                      id="teacher-password"
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
                
                <div className="mt-4 text-right">
                  <Link to="/forgot-password" className="text-sm text-blue-600 hover:text-blue-800">
                    Forgot your password?
                  </Link>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Switch Mode Button */}
          <motion.div 
            layout
            className="mt-6 pt-6 border-t border-gray-200"
          >
            <button
              onClick={switchMode}
              className={`w-full ${
                isStudent 
                  ? 'bg-blue-50 hover:bg-blue-100 text-blue-700' 
                  : 'bg-purple-50 hover:bg-purple-100 text-purple-700'
              } font-medium py-2.5 px-4 rounded-lg transition-all duration-300 flex items-center justify-center group`}
            >
              <span>
                {isStudent ? 'Switch to Teacher Login' : 'Switch to Student Login'}
              </span>
              <ArrowRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        </motion.div>

        <div className="text-center mt-6 space-y-2">
          <button
            onClick={() => setShowPrivacyPolicy(true)}
            className="text-sm text-blue-600 hover:text-blue-800 hover:underline transition-colors"
          >
            Privacy Policy
          </button>
          <p className="text-xs text-gray-500">
            © {new Date().getFullYear()} EduPortal. All rights reserved.
          </p>
        </div>
      </div>
      
      {/* Privacy Policy Modal */}
      <PrivacyPolicyModal 
        isOpen={showPrivacyPolicy} 
        onClose={() => setShowPrivacyPolicy(false)} 
      />
    </motion.div>
  );
};

export default UnifiedLogin;
