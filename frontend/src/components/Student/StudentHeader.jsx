import React from 'react';
import { motion } from 'framer-motion';
import { Award, Settings, LogOut, GraduationCap } from 'lucide-react';
import { useSchoolYearStore } from '../../store/schoolYearStore';
import { getStudentGreetingName, getStudentInitial } from '../../utils/studentDisplayName';

const StudentHeader = ({ 
  currentStudent, 
  user, 
  goToReportCard, 
  openAccountSettings, 
  handleLogout 
}) => {
  const selectedYear = useSchoolYearStore((s) => s.selected);
  const initials = getStudentInitial({ currentStudent, user });
  const greetingName = getStudentGreetingName({ currentStudent, user });
  
  return (
    <>
      {/* Mobile Menu Button */}
      <div className="lg:hidden mb-6">
        <div className="glass-card p-4 flex items-center">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-lg">
                {initials}
              </span>
            </div>
            <div>
              <h2 className="font-display font-bold text-gray-900">
                {greetingName}
              </h2>
              <p className="text-sm text-gray-600 font-medium">
                {currentStudent?.class?.grade_level} - {currentStudent?.class?.section}
              </p>
              {selectedYear && (
                <p className="text-xs text-primary-600 font-medium mt-0.5">S.Y. {selectedYear}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Header */}
      <header className="hidden lg:block mb-8">
        <div className="relative overflow-hidden rounded-3xl border border-blue-100 bg-white p-8 text-slate-900 shadow-xl shadow-blue-900/5">
          
          <div className="relative z-10 flex justify-between items-center">
            <div className="flex items-center gap-5">
              <div className="h-20 w-20 rounded-3xl bg-blue-600 flex items-center justify-center shadow-xl shadow-blue-900/10">
                <GraduationCap className="h-10 w-10 text-white" />
              </div>
              <div>
                <motion.h1 
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-4xl font-display font-bold mb-2"
                >
                  Welcome back, {greetingName}!
                </motion.h1>
                <div className="flex items-center gap-4 text-slate-500">
                  <span className="flex items-center gap-2 text-lg font-medium">
                    <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                    {currentStudent?.class?.grade_level} - {currentStudent?.class?.section}
                  </span>
                  {selectedYear && (
                    <span className="text-sm px-3 py-1 rounded-full bg-blue-50 text-blue-700">
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
                className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white hover:bg-blue-700 rounded-xl transition-all shadow-lg shadow-blue-900/10"
              >
                <Award className="w-5 h-5" />
                <span className="font-semibold">Report Card</span>
              </motion.button>
              
              <motion.button 
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={openAccountSettings}
                className="flex items-center gap-2 px-5 py-3 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl transition-all border border-blue-100"
              >
                <Settings className="w-5 h-5" />
                <span className="font-semibold">Settings</span>
              </motion.button>
              
              <motion.button 
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleLogout}
                className="flex items-center gap-2 px-5 py-3 bg-red-50 text-danger-600 hover:bg-red-100 rounded-xl transition-all font-semibold"
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
