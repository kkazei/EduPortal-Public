import React, { useState, useEffect, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { useAnnouncementStore } from '../../store/announcementStore';
import { useStudentStore } from '../../store/studentStore';
import NotificationToggle from '../../components/NotificationToggle'; // Static import

// Lazy load other components
const StudentHeader = lazy(() => import('../../components/Student/StudentHeader'));
const StudentMobileMenu = lazy(() => import('../../components/Student/StudentMobileMenu'));
const StudentProfileCard = lazy(() => import('../../components/Student/StudentProfileCard'));
const AnnouncementsList = lazy(() => import('../../components/Student/AnnouncementList'));
const AnnouncementModal = lazy(() => import('../../components/Modals/AnnouncementModal'));
const AccountSettingsModal = lazy(() => import('../../components/Modals/AccountSettingsModal'));
const FirstTimePasswordModal = lazy(() => import('../../components/Modals/FirstTimePasswordModal'));
const EmailOnlySetupModal = lazy(() => import('../../components/Modals/EmailOnlySetupModal'));

const FIRST_TIME_SNOOZE_KEY = 'firstTimeVerifySnoozeUntil';
const EMAIL_ONLY_SNOOZE_KEY = 'emailOnlyVerifySnoozeUntil';
const getSnoozeKey = (userId) => `${FIRST_TIME_SNOOZE_KEY}:${userId || 'unknown'}`;
const getEmailOnlySnoozeKey = (userId) => `${EMAIL_ONLY_SNOOZE_KEY}:${userId || 'unknown'}`;

// Loading component
const LoadingSpinner = () => (
  <div className="flex justify-center items-center py-8">
    <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
  </div>
);

const StudentDashboard = () => {
  const { user, logout } = useAuthStore();
  const { announcements, fetchAdviserAnnouncements } = useAnnouncementStore();
  const { currentStudent, fetchStudentByUserId, isLoading: loadingStudent } = useStudentStore();
  const navigate = useNavigate();

  // State management
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAnnouncementIndex, setSelectedAnnouncementIndex] = useState(0);
  const [accountSettingsOpen, setAccountSettingsOpen] = useState(false);
  const [firstTimePasswordModalOpen, setFirstTimePasswordModalOpen] = useState(false);
  const [emailOnlySetupOpen, setEmailOnlySetupOpen] = useState(false);

  // Navigation functions
  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);
  const openAccountSettings = () => {
    setAccountSettingsOpen(true);
    setMobileMenuOpen(false);
  };
  const goToReportCard = () => {
    navigate('/student-report-card');
    setMobileMenuOpen(false);
  };

  // Handle View All Announcements
  const handleViewAllAnnouncements = () => {
    console.log('View All button clicked - navigating to /student/announcements');
    navigate('/student/announcements');
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/student-login', { replace: true });
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleVerifyLater = () => {
    try {
      const snoozeUntil = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
      if (typeof window !== 'undefined') {
        const key = getSnoozeKey(user?.id);
        localStorage.setItem(key, snoozeUntil);
      }
      setFirstTimePasswordModalOpen(false);
      toast('Reminder set. Please verify your account later.');
    } catch (err) {
      console.error('Failed to snooze verification prompt:', err);
      setFirstTimePasswordModalOpen(false);
    }
  };

  const handleEmailOnlyLater = () => {
    try {
      const snoozeUntil = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
      if (typeof window !== 'undefined') {
        const key = getEmailOnlySnoozeKey(user?.id);
        localStorage.setItem(key, snoozeUntil);
      }
      setEmailOnlySetupOpen(false);
      toast('Reminder set. Please verify your email later.');
    } catch (err) {
      console.error('Failed to snooze email-only prompt:', err);
      setEmailOnlySetupOpen(false);
    }
  };

  // Show or hide first-time setup modal based on user state
  useEffect(() => {
    const snoozeKey = getSnoozeKey(user?.id);
    const snoozeUntil = typeof window !== 'undefined' ? localStorage.getItem(snoozeKey) : null;
    const snoozed = snoozeUntil ? new Date(snoozeUntil) > new Date() : false;

    if (user && !user.is_first_login && typeof window !== 'undefined') {
      localStorage.removeItem(FIRST_TIME_SNOOZE_KEY); // legacy cleanup
      localStorage.removeItem(snoozeKey);
    }

    if (user && user.user_role === 'student' && user.is_first_login && !snoozed) {
      setFirstTimePasswordModalOpen(true);
    } else {
      setFirstTimePasswordModalOpen(false);
    }
    // Gate for email-only setup if sentinel token is set
    const emailSnoozeKey = getEmailOnlySnoozeKey(user?.id);
    const emailSnoozeUntil = typeof window !== 'undefined' ? localStorage.getItem(emailSnoozeKey) : null;
    const emailSnoozed = emailSnoozeUntil ? new Date(emailSnoozeUntil) > new Date() : false;

    if (user && user.user_role === 'student' && user.resetPasswordToken === 'REQUIRE_EMAIL_ONLY' && !emailSnoozed) {
      setEmailOnlySetupOpen(true);
    } else {
      setEmailOnlySetupOpen(false);
    }
    // Clear snooze if requirement gone
    if (user && user.resetPasswordToken !== 'REQUIRE_EMAIL_ONLY' && typeof window !== 'undefined') {
      localStorage.removeItem(emailSnoozeKey);
    }
  }, [user]);

  // Announcement modal functions
  const openAnnouncementModal = (index) => {
    setSelectedAnnouncementIndex(index);
    setModalOpen(true);
  };

  const closeAnnouncementModal = () => setModalOpen(false);

  const goToNextAnnouncement = () => {
    const activeAnnouncements = announcements.filter(a => a.is_active);
    if (selectedAnnouncementIndex < activeAnnouncements.length - 1) {
      setSelectedAnnouncementIndex(selectedAnnouncementIndex + 1);
    }
  };

  const goToPreviousAnnouncement = () => {
    if (selectedAnnouncementIndex > 0) {
      setSelectedAnnouncementIndex(selectedAnnouncementIndex - 1);
    }
  };

  // Data fetching - Modified to fetch adviser announcements only
  useEffect(() => {
    const loadData = async () => {
      try {
        if (user?.id) {
          // First fetch the student data
          const studentData = await fetchStudentByUserId(user.id);
          
          // Then fetch announcements from adviser only
          if (studentData?.class?.adviser?.id) {
            console.log('Fetching announcements from adviser:', studentData.class.adviser.id);
            await fetchAdviserAnnouncements(studentData.class.adviser.id, {
              limit: 10
            });
          } else {
            console.log('No adviser found for student');
          }
        }
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    loadData();
  }, [user, fetchStudentByUserId, fetchAdviserAnnouncements]);

  // Modified polling to use adviser announcements
  useEffect(() => {
    const pollAnnouncements = setInterval(() => {
      console.log('Polling for new adviser announcements...');
      if (user?.id && currentStudent?.class?.adviser?.id) {
        fetchAdviserAnnouncements(currentStudent.class.adviser.id, {
          limit: 10
        });
      }
    }, 30000); // Poll every 30 seconds

    return () => clearInterval(pollAnnouncements);
  }, [user, currentStudent, fetchAdviserAnnouncements]);

  // Service worker message handling - Updated for adviser announcements
  useEffect(() => {
    const handleServiceWorkerMessage = (event) => {
      if (event.data?.type === 'REFRESH_ANNOUNCEMENTS') {
        console.log('Service worker requested announcement refresh');
        if (currentStudent?.class?.adviser?.id) {
          fetchAdviserAnnouncements(currentStudent.class.adviser.id, {
            limit: 10
          });
        }
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
      return () => {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      };
    }
  }, [currentStudent, fetchAdviserAnnouncements]);

  const activeAnnouncements = announcements.filter(announcement => announcement.is_active);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-gray-50"
    >
      <div className="max-w-7xl mx-auto p-4 lg:p-8">
        <Suspense fallback={<LoadingSpinner />}>
          <StudentHeader
            currentStudent={currentStudent}
            user={user}
            mobileMenuOpen={mobileMenuOpen}
            toggleMobileMenu={toggleMobileMenu}
            goToReportCard={goToReportCard}
            openAccountSettings={openAccountSettings}
            handleLogout={handleLogout}
          />

          <StudentMobileMenu
            isOpen={mobileMenuOpen}
            onClose={() => setMobileMenuOpen(false)}
            currentStudent={currentStudent}
            user={user}
            goToReportCard={goToReportCard}
            openAccountSettings={openAccountSettings}
            handleLogout={handleLogout}
          />
        </Suspense>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <Suspense fallback={<LoadingSpinner />}>
              <StudentProfileCard
                currentStudent={currentStudent}
                loadingStudent={loadingStudent}
                openAccountSettings={openAccountSettings}
                goToReportCard={goToReportCard}
                handleLogout={handleLogout}
                // Pass the NotificationToggle as a prop
                extraQuickAction={
                  <motion.div 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center justify-between p-3 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all group"
                  >
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                        <Bell className="w-4 h-4 text-white" />
                      </div>
                      <span className="font-medium text-gray-700">Enable Notifications</span>
                    </div>
                    <NotificationToggle variant="student" />
                  </motion.div>
                }
              />
            </Suspense>
          </div>

          {/* Announcements */}
          <div className="lg:col-span-2">
            <Suspense fallback={<LoadingSpinner />}>
              <AnnouncementsList
                announcements={activeAnnouncements}
                onAnnouncementClick={openAnnouncementModal}
                onViewAll={handleViewAllAnnouncements}
                isLoading={loadingStudent}
              />
            </Suspense>
          </div>
        </div>

        {/* Modals */}
        <Suspense fallback={null}>
          <FirstTimePasswordModal
            isOpen={firstTimePasswordModalOpen}
            userFullName={user?.user_fullname}
            onVerifyLater={handleVerifyLater}
          />

          <EmailOnlySetupModal
            isOpen={emailOnlySetupOpen}
            onRemindLater={handleEmailOnlyLater}
          />

          <AnnouncementModal
            announcement={activeAnnouncements[selectedAnnouncementIndex]}
            isOpen={modalOpen}
            onClose={closeAnnouncementModal}
            onNext={goToNextAnnouncement}
            onPrevious={goToPreviousAnnouncement}
            hasNext={selectedAnnouncementIndex < activeAnnouncements.length - 1}
            hasPrevious={selectedAnnouncementIndex > 0}
          />

          <AccountSettingsModal 
            isOpen={accountSettingsOpen}
            onClose={() => setAccountSettingsOpen(false)}
          />
        </Suspense>
      </div>
    </motion.div>
  );
};

export default StudentDashboard;