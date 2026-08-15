import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Calendar, Book, UserCheck, Loader, AlertCircle, Settings, FileText, LogOut, ChevronRight } from 'lucide-react';
import { useSchoolYearStore } from '../../store/schoolYearStore';

const StudentProfileCard = ({ 
  currentStudent, 
  loadingStudent, 
  openAccountSettings, 
  goToReportCard, 
  handleLogout,
  extraQuickAction // Add this prop
}) => {
  const selectedYear = useSchoolYearStore((s) => s.selected);
  const years = useSchoolYearStore((s) => s.years);
  const fetchYears = useSchoolYearStore((s) => s.fetchYears);

  useEffect(() => {
    if (!years || years.length === 0) {
      fetchYears?.();
    }
  }, [years, fetchYears]);
  if (loadingStudent) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
        <div className="flex justify-center items-center py-20">
          <Loader className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      </div>
    );
  }

  if (!currentStudent) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
        <div className="text-center py-20 text-gray-500">
          <AlertCircle className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <p className="text-lg">Student information not available</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100"
    >
      {/* Profile Header */}
      <div className="text-center mb-6">
        <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-blue-800 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
          <User className="w-12 h-12 text-white" />
        </div>
        <h2 className="text-xl font-bold text-gray-800">
          {currentStudent.first_name} {currentStudent.last_name}
        </h2>
        <p className="text-gray-500 text-sm mt-1">Student Profile</p>
        <div className="mt-3 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs inline-block">
          LRN: {currentStudent.lrn || 'N/A'}
        </div>
      </div>

      {/* Student Details */}
      <div className="space-y-3 mb-6">
        <div className="flex items-center p-3 bg-gray-50 rounded-xl">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
            <Calendar className="w-5 h-5 text-blue-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-gray-500 text-sm">School Year</p>
            <p className="font-semibold text-gray-800">
              {selectedYear || currentStudent.school_year || ''}
            </p>
          </div>
        </div>
        
        <div className="flex items-center p-3 bg-gray-50 rounded-xl">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
            <Book className="w-5 h-5 text-blue-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-gray-500 text-sm">Class Section</p>
            <p className="font-semibold text-gray-800">
              {currentStudent.class?.grade_level} - {currentStudent.class?.section}
            </p>
          </div>
        </div>

        <div className="flex items-center p-3 bg-gray-50 rounded-xl">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
            <UserCheck className="w-5 h-5 text-blue-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-gray-500 text-sm">Class Adviser</p>
            <p className="font-semibold text-gray-800">
              {currentStudent.class?.adviser?.user_fullname || 'Not Assigned'}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-2">
        <h3 className="font-semibold text-gray-800 mb-3 text-sm sm:text-base">Quick Actions</h3>
        
        <motion.button 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={openAccountSettings}
          className="w-full flex items-center justify-between p-3 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all group touch-manipulation"
        >
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
              <Settings className="w-4 h-4 text-white" />
            </div>
            <span className="font-medium text-gray-700 text-sm sm:text-base">Account Settings</span>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
        </motion.button>
        
        <motion.button 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={goToReportCard}
          className="w-full flex items-center justify-between p-3 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all group touch-manipulation"
        >
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <span className="font-medium text-gray-700 text-sm sm:text-base">View Report Card</span>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
        </motion.button>

        {/* Render extra quick action if provided */}
        {extraQuickAction && (
          <div className="mt-2">
            {extraQuickAction}
          </div>
        )}
        
        <motion.button 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleLogout}
          className="w-full flex items-center justify-between p-3 bg-red-50 hover:bg-red-100 rounded-xl transition-all group touch-manipulation"
        >
          <div className="flex items-center">
            <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center mr-3">
              <LogOut className="w-4 h-4 text-white" />
            </div>
            <span className="font-medium text-red-600 text-sm sm:text-base">Logout</span>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-red-500" />
        </motion.button>
      </div>
    </motion.div>
  );
};

export default StudentProfileCard;