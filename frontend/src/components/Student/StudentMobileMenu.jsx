import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Award, Settings, LogOut, X } from 'lucide-react';
import { getOfficialStudentName, getStudentDisplayName } from '../../utils/studentDisplayName';

const StudentMobileMenu = ({ 
  isOpen, 
  onClose, 
  currentStudent, 
  user, 
  goToReportCard, 
  openAccountSettings, 
  handleLogout 
}) => {
  const handleItemClick = (action) => {
    onClose(); // Close menu first to start animation
    setTimeout(() => {
      action(); // Execute action after a brief delay
    }, 150);
  };

  const displayName = getStudentDisplayName({ currentStudent, user });
  const officialName = getOfficialStudentName({ currentStudent, user });
  const hasCustomDisplayName = displayName !== officialName;

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black bg-opacity-50" 
            onClick={onClose} 
          />
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 20 }}
            className="absolute top-0 right-0 h-full w-80 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex justify-end mb-6">
                <button 
                  onClick={onClose}
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <X className="w-6 h-6 text-gray-600" />
                </button>
              </div>
              
              {/* Profile Section */}
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-blue-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-xl font-bold text-gray-800">
                  {displayName}
                </h2>
                {hasCustomDisplayName && (
                  <p className="text-gray-500 text-xs mt-1">
                    Official: {officialName}
                  </p>
                )}
                <p className="text-gray-500 text-sm mt-1">
                  {currentStudent?.class?.grade_level} - {currentStudent?.class?.section}
                </p>
                <div className="mt-3 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs inline-block">
                  LRN: {currentStudent?.lrn || 'N/A'}
                </div>
              </div>
              
              {/* Menu Items */}
              <div className="space-y-3">
                <motion.button 
                  whileHover={{ x: 5 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleItemClick(goToReportCard)}
                  className="w-full flex items-center p-4 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all group"
                >
                  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center mr-4">
                    <Award className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-medium text-gray-700 group-hover:text-gray-900">Report Card</span>
                </motion.button>
                
                <motion.button 
                  whileHover={{ x: 5 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleItemClick(openAccountSettings)}
                  className="w-full flex items-center p-4 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all group"
                >
                  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center mr-4">
                    <Settings className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-medium text-gray-700 group-hover:text-gray-900">Account Settings</span>
                </motion.button>
                
                <motion.button 
                  whileHover={{ x: 5 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleItemClick(handleLogout)}
                  className="w-full flex items-center p-4 bg-red-50 hover:bg-red-100 rounded-xl transition-all group"
                >
                  <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center mr-4">
                    <LogOut className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-medium text-red-600 group-hover:text-red-700">Logout</span>
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default StudentMobileMenu;
