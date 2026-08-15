import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { BookOpen, User, KeyRound, EyeOff, Eye } from 'lucide-react';

const StudentLoginPage = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { studentLogin } = useAuthStore();
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

  const validateForm = () => {
    const newErrors = {};
    
    // Check if the field is empty
    if (!formData.lrn) {
      newErrors.lrn = 'LRN or Email is required';
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    try {
      // Format the input as email if it's just an LRN
      const formattedInput = formData.lrn.includes('@') ? formData.lrn : `${formData.lrn}@gmail.com`;
      
      // Use the studentLogin method from authStore
      const response = await studentLogin(formattedInput, formData.password);
      
      toast.success('Login successful!');
      
      // Since we're using the student-specific login, we should always navigate to the student dashboard
      navigate('/student-dashboard', { replace: true });
      
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed. Please try again.';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white px-4"
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
              <BookOpen size={32} className="text-blue-600" />
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">Student Portal</h2>
          <p className="text-center text-gray-600 mb-8">Login with your LRN or Email</p>
          
          <form onSubmit={handleSubmit}>
            {/* LRN/Email Field */}
            <div className="mb-5">
              <label htmlFor="lrn" className="block text-sm font-medium text-gray-700 mb-1">
                LRN or Email
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
                  } rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                  placeholder="Enter your LRN or Email"
                  autoComplete="off"
                />
              </div>
              {errors.lrn && (
                <p className="mt-1 text-sm text-red-600">{errors.lrn}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                You can enter either your 12-digit LRN or complete email address
              </p>
            </div>
            
            {/* Password Field */}
            <div className="mb-5">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <KeyRound size={18} className="text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange}
                  className={`appearance-none block w-full pl-10 pr-10 py-2.5 border ${
                    errors.password ? 'border-red-500' : 'border-gray-300'
                  } rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
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
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200 flex items-center justify-center"
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
          </form>

            <div className="mt-4 text-right">
              <Link to="/student/forgot-password" className="text-sm text-blue-600 hover:text-blue-800">
                Forgot your password?
              </Link>
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

export default StudentLoginPage;