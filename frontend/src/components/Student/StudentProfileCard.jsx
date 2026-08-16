import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Calendar, Book, UserCheck, Loader, AlertCircle, Settings, FileText, LogOut, ChevronRight } from 'lucide-react';
import { useSchoolYearStore } from '../../store/schoolYearStore';
import { getOfficialStudentName, getStudentDisplayName } from '../../utils/studentDisplayName';

const StudentProfileCard = ({ 
  currentStudent, 
  user,
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
      <div className="rounded-3xl border border-blue-100 bg-white p-6 shadow-xl shadow-blue-900/5">
        <div className="flex justify-center items-center py-20">
          <Loader className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      </div>
    );
  }

  if (!currentStudent) {
    return (
      <div className="rounded-3xl border border-blue-100 bg-white p-6 shadow-xl shadow-blue-900/5">
        <div className="text-center py-20 text-gray-500">
          <AlertCircle className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <p className="text-lg">Student information not available</p>
        </div>
      </div>
    );
  }

  const displayName = getStudentDisplayName({ currentStudent, user });
  const officialName = getOfficialStudentName({ currentStudent, user });
  const hasCustomDisplayName = displayName !== officialName;

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-xl shadow-blue-900/5 lg:sticky lg:top-6"
    >
      {/* Profile Header */}
      <div className="relative bg-blue-700 px-6 py-7 text-center text-white">
        <div className="absolute -right-10 -top-16 h-36 w-36 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-20 left-1/2 h-36 w-36 -translate-x-1/2 rounded-full bg-white/10 blur-3xl" />
        <div className="relative mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-3xl bg-white/15 shadow-xl ring-1 ring-white/25 backdrop-blur-sm">
          <User className="h-12 w-12 text-white" />
        </div>
        <h2 className="relative text-xl font-bold">
          {displayName}
        </h2>
        <p className="relative mt-1 text-sm text-blue-100">
          {hasCustomDisplayName ? `Official: ${officialName}` : 'Student Profile'}
        </p>
        <div className="relative mt-3 inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-blue-50 ring-1 ring-white/25">
          LRN: {currentStudent.lrn || 'N/A'}
        </div>
      </div>

      <div className="p-5 sm:p-6">
        {/* Student Details */}
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <div className="flex items-center rounded-2xl border border-slate-100 bg-slate-50 p-3">
            <div className="mr-3 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-100">
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-slate-500">School Year</p>
              <p className="font-semibold text-slate-800">
                {selectedYear || currentStudent.school_year || 'Not set'}
              </p>
            </div>
          </div>

          <div className="flex items-center rounded-2xl border border-slate-100 bg-slate-50 p-3">
            <div className="mr-3 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-100">
              <Book className="h-5 w-5 text-blue-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-slate-500">Class Section</p>
              <p className="font-semibold text-slate-800">
                {currentStudent.class?.grade_level} - {currentStudent.class?.section}
              </p>
            </div>
          </div>

          <div className="flex items-center rounded-2xl border border-slate-100 bg-slate-50 p-3 sm:col-span-2 lg:col-span-1">
            <div className="mr-3 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-100">
              <UserCheck className="h-5 w-5 text-blue-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-slate-500">Class Adviser</p>
              <p className="truncate font-semibold text-slate-800">
                {currentStudent.class?.adviser?.user_fullname || 'Not Assigned'}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-2">
          <h3 className="mb-3 text-sm font-semibold text-slate-800 sm:text-base">Quick Actions</h3>
          
          <motion.button 
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={openAccountSettings}
            className="group flex w-full touch-manipulation items-center justify-between rounded-2xl border border-blue-100 bg-blue-50/80 p-3 transition-all hover:bg-blue-100/80"
          >
            <div className="flex items-center">
              <div className="mr-3 flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600">
                <Settings className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-semibold text-slate-700 sm:text-base">Account Settings</span>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-slate-600" />
          </motion.button>
          
          <motion.button 
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={goToReportCard}
            className="group flex w-full touch-manipulation items-center justify-between rounded-2xl border border-blue-100 bg-blue-50/80 p-3 transition-all hover:bg-blue-100/80"
          >
            <div className="flex items-center">
              <div className="mr-3 flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600">
                <FileText className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-semibold text-slate-700 sm:text-base">Report Card</span>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-slate-600" />
          </motion.button>

          {extraQuickAction && (
            <div className="mt-2">
              {extraQuickAction}
            </div>
          )}
          
          <motion.button 
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleLogout}
            className="group flex w-full touch-manipulation items-center justify-between rounded-2xl border border-red-100 bg-red-50 p-3 transition-all hover:bg-red-100"
          >
            <div className="flex items-center">
              <div className="mr-3 flex h-9 w-9 items-center justify-center rounded-xl bg-red-500">
                <LogOut className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-semibold text-red-600 sm:text-base">Logout</span>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-red-500" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

export default StudentProfileCard;
