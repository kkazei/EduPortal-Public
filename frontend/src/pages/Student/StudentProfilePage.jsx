import React, { lazy, Suspense, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, UserCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import NotificationToggle from '../../components/NotificationToggle';
import StudentProfileCard from '../../components/Student/StudentProfileCard';
import StudentReportCardPreview from '../../components/Student/StudentReportCardPreview';
import { useAuthStore } from '../../store/authStore';
import { useStudentStore } from '../../store/studentStore';

const AccountSettingsModal = lazy(() => import('../../components/Modals/AccountSettingsModal'));

const StudentProfilePage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { currentStudent, fetchStudentByUserId, isLoading: loadingStudent } = useStudentStore();
  const [accountSettingsOpen, setAccountSettingsOpen] = useState(false);

  useEffect(() => {
    if (user?.id && !currentStudent) {
      fetchStudentByUserId(user.id);
    }
  }, [currentStudent, fetchStudentByUserId, user?.id]);

  const goToReportCard = () => {
    navigate('/student-report-card');
  };

  const handleLogout = async () => {
    await logout();
    navigate('/student-login', { replace: true });
  };

  return (
    <motion.main
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.24 }}
      className="min-h-screen bg-slate-50"
    >
      <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
        <section className="mb-6 rounded-3xl border border-blue-100 bg-white p-5 shadow-xl shadow-blue-900/5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-900/10">
                <UserCircle className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Student Profile</h1>
                <p className="mt-1 text-sm text-slate-500">
                  Profile details, account settings, and report card summary.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate('/student-dashboard')}
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 px-4 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
            >
              Return to Dashboard
            </button>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-4 xl:col-span-3">
            <StudentProfileCard
              currentStudent={currentStudent}
              user={user}
              loadingStudent={loadingStudent}
              openAccountSettings={() => setAccountSettingsOpen(true)}
              goToReportCard={goToReportCard}
              handleLogout={handleLogout}
              extraQuickAction={
                <motion.div
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center justify-between rounded-2xl border border-blue-100 bg-blue-50/80 p-3 transition-all hover:bg-blue-100/80"
                >
                  <div className="flex min-w-0 items-center">
                    <div className="mr-3 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-blue-600">
                      <Bell className="h-4 w-4 text-white" />
                    </div>
                    <span className="truncate text-sm font-semibold text-slate-700 sm:text-base">Enable Notifications</span>
                  </div>
                  <NotificationToggle variant="student" />
                </motion.div>
              }
            />
          </div>

          <div className="lg:col-span-8 xl:col-span-9">
            <StudentReportCardPreview
              currentStudent={currentStudent}
              onViewFull={goToReportCard}
            />
          </div>
        </div>
      </div>

      <Suspense fallback={null}>
        <AccountSettingsModal
          isOpen={accountSettingsOpen}
          onClose={() => setAccountSettingsOpen(false)}
        />
      </Suspense>
    </motion.main>
  );
};

export default StudentProfilePage;
