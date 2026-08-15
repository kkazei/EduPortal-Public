import React from 'react';
import { motion } from 'framer-motion';
import { Award, Settings, LogOut, Menu, X, GraduationCap } from 'lucide-react';
import { useSchoolYearStore } from '../../store/schoolYearStore';

const StudentHeader = ({ 
  currentStudent, 
  user, 
  mobileMenuOpen, 
  toggleMobileMenu, 
  goToReportCard, 
  openAccountSettings, 
  handleLogout 
}) => {
  const selectedYear = useSchoolYearStore((s) => s.selected);
  const initials = (currentStudent?.first_name || user?.user_fullname || 'S')[0];
  
  return (
    <>
      {/* Mobile Menu Button */}
      <div className="lg:hidden mb-6">
        <div className="glass-card p-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-lg">
                {initials}
              </span>
            </div>
            <div>
              <h2 className="font-display font-bold text-gray-900">
                {currentStudent?.first_name || user?.user_fullname?.split(' ')[0] || 'Student'}
              </h2>
              <p className="text-sm text-gray-600 font-medium">
                {currentStudent?.class?.grade_level} - {currentStudent?.class?.section}
              </p>
              {selectedYear && (
                <p className="text-xs text-primary-600 font-medium mt-0.5">S.Y. {selectedYear}</p>
              )}
            </div>
          </div>
          <button 
            onClick={toggleMobileMenu}
            className="p-2.5 rounded-xl bg-primary-50 hover:bg-primary-100 transition-colors"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6 text-primary-700" />
            ) : (
              <Menu className="w-6 h-6 text-primary-700" />
            )}
          </button>
        </div>
      </div>

      {/* Desktop Header */}
      <header className="hidden lg:block mb-8">
        <div className="relative overflow-hidden rounded-3xl p-8 bg-gradient-to-br from-primary-600 via-primary-700 to-secondary-700 text-white shadow-xl">
          <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          
          <div className="relative z-10 flex justify-between items-center">
            <div className="flex items-center gap-5">
              <div className="h-20 w-20 rounded-3xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-xl">
                <GraduationCap className="h-10 w-10 text-white" />
              </div>
              <div>
                <motion.h1 
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-4xl font-display font-bold mb-2"
                >
                  Welcome back, {currentStudent?.first_name || user?.user_fullname?.split(' ')[0] || 'Student'}!
                </motion.h1>
                <div className="flex items-center gap-4 text-primary-100">
                  <span className="flex items-center gap-2 text-lg font-medium">
                    <span className="w-2 h-2 bg-white rounded-full"></span>
                    {currentStudent?.class?.grade_level} - {currentStudent?.class?.section}
                  </span>
                  {selectedYear && (
                    <span className="text-sm px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm">
                      S.Y. {selectedYear}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <motion.button 
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={goToReportCard}
                className="flex items-center gap-2 px-5 py-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl transition-all shadow-lg border border-white/30"
              >
                <Award className="w-5 h-5" />
                <span className="font-semibold">Report Card</span>
              </motion.button>
              
              <motion.button 
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={openAccountSettings}
                className="flex items-center gap-2 px-5 py-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl transition-all shadow-lg border border-white/30"
              >
                <Settings className="w-5 h-5" />
                <span className="font-semibold">Settings</span>
              </motion.button>
              
              <motion.button 
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleLogout}
                className="flex items-center gap-2 px-5 py-3 bg-white text-danger-600 hover:bg-white/90 rounded-xl transition-all shadow-lg font-semibold"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-semibold">Logout</span>
              </motion.button>
            </div>
          </div>
        </div>
      </header>
    </>
  );
};

export default StudentHeader;