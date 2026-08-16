import React, { useMemo, useState, useEffect, lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Award, Bell, BookOpen, Calendar, FileText, UserCheck, UserCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { useAnnouncementStore } from '../../store/announcementStore';
import { useStudentStore } from '../../store/studentStore';
import AnnouncementsList from '../../components/Student/AnnouncementList';
import { useSchoolYearStore } from '../../store/schoolYearStore';
import { useGradeStore } from '../../store/gradeStore';
import { getStudentGreetingName } from '../../utils/studentDisplayName';

// Lazy load modal-only components
const AnnouncementModal = lazy(() => import('../../components/Modals/AnnouncementModal'));
const FirstTimePasswordModal = lazy(() => import('../../components/Modals/FirstTimePasswordModal'));
const EmailOnlySetupModal = lazy(() => import('../../components/Modals/EmailOnlySetupModal'));

const FIRST_TIME_SNOOZE_KEY = 'firstTimeVerifySnoozeUntil';
const EMAIL_ONLY_SNOOZE_KEY = 'emailOnlyVerifySnoozeUntil';
const getSnoozeKey = (userId) => `${FIRST_TIME_SNOOZE_KEY}:${userId || 'unknown'}`;
const getEmailOnlySnoozeKey = (userId) => `${EMAIL_ONLY_SNOOZE_KEY}:${userId || 'unknown'}`;

const StudentDashboard = () => {
  const { user } = useAuthStore();
  const { announcements, fetchAdviserAnnouncements } = useAnnouncementStore();
  const { currentStudent, fetchStudentByUserId, isLoading: loadingStudent } = useStudentStore();
  const selectedYear = useSchoolYearStore((s) => s.selected);
  const fetchYears = useSchoolYearStore((s) => s.fetchYears);
  const { getStudentCard } = useGradeStore();
  const navigate = useNavigate();

  // State management
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAnnouncementIndex, setSelectedAnnouncementIndex] = useState(0);
  const [firstTimePasswordModalOpen, setFirstTimePasswordModalOpen] = useState(false);
  const [emailOnlySetupOpen, setEmailOnlySetupOpen] = useState(false);
  const [reportSummary, setReportSummary] = useState(null);
  const [reportSummaryLoading, setReportSummaryLoading] = useState(false);

  // Handle View All Announcements
  const handleViewAllAnnouncements = () => {
    console.log('View All button clicked - navigating to /student/announcements');
    navigate('/student/announcements');
  };

  useEffect(() => {
    fetchYears?.();
  }, [fetchYears]);

  useEffect(() => {
    const loadReportSummary = async () => {
      if (!currentStudent?.id) return;

      setReportSummaryLoading(true);
      try {
        const data = await getStudentCard(currentStudent.id, selectedYear || null);
        setReportSummary(data);
      } catch (error) {
        console.error('Failed to load dashboard report summary:', error);
        setReportSummary(null);
      } finally {
        setReportSummaryLoading(false);
      }
    };

    loadReportSummary();
  }, [currentStudent?.id, getStudentCard, selectedYear]);

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
  const greetingName = getStudentGreetingName({ currentStudent, user });
  const subjects = reportSummary?.subjects || [];
  const finalAverage = reportSummary?.quarterlyAverages?.final_average
    || (() => {
      const gradedSubjects = subjects.filter((subject) => Number.isFinite(parseFloat(subject.final_grade)));
      if (gradedSubjects.length === 0) return null;
      const total = gradedSubjects.reduce((sum, subject) => sum + parseFloat(subject.final_grade), 0);
      return total / gradedSubjects.length;
    })();
  const gradedSubjectsCount = useMemo(
    () => subjects.filter((subject) => Number.isFinite(parseFloat(subject.final_grade))).length,
    [subjects]
  );
  const formatGrade = (grade) => {
    const numericGrade = parseFloat(grade);
    return Number.isFinite(numericGrade) ? Math.round(numericGrade).toString() : '--';
  };
  const dashboardStats = [
    {
      label: 'School Year',
      value: selectedYear || currentStudent?.school_year || 'Not set',
      icon: Calendar
    },
    {
      label: 'Class',
      value: currentStudent?.class
        ? `${currentStudent.class.grade_level} - ${currentStudent.class.section}`
        : 'Not assigned',
      icon: BookOpen
    },
    {
      label: 'Class Adviser',
      value: currentStudent?.class?.adviser?.user_fullname || 'Not assigned',
      icon: UserCheck
    },
    {
      label: 'Announcements',
      value: `${activeAnnouncements.length} active`,
      icon: Bell
    }
  ];

  return (
    <motion.main 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-slate-50"
    >
      <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
        <section className="mb-5 rounded-3xl border border-blue-100 bg-white p-5 shadow-xl shadow-blue-900/5 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Student Dashboard</p>
              <h1 className="mt-2 text-3xl font-bold text-slate-900">
                Welcome, {greetingName}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
                Here are the essentials for your class today.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => navigate('/student-profile')}
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 px-4 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
              >
                Profile
              </button>
              <button
                type="button"
                onClick={() => navigate('/student-report-card')}
                className="inline-flex h-11 items-center justify-center rounded-2xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Report Card
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {dashboardStats.map(({ label, value, icon: Icon }) => (
              <div key={label} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
                <p className="mt-1 truncate text-base font-bold text-slate-900">{value}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="grid gap-5 xl:grid-cols-12">
          <div className="xl:col-span-8">
            <AnnouncementsList
              announcements={activeAnnouncements}
              onAnnouncementClick={openAnnouncementModal}
              onViewAll={handleViewAllAnnouncements}
              isLoading={loadingStudent}
            />
          </div>

          <aside className="grid gap-5 xl:col-span-4">
            <section className="rounded-3xl border border-blue-100 bg-white p-5 shadow-xl shadow-blue-900/5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-blue-600">Report Card</p>
                  <h2 className="mt-1 text-xl font-bold text-slate-900">Progress Summary</h2>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                  <Award className="h-5 w-5" />
                </div>
              </div>

              <div className="rounded-3xl border border-blue-100 bg-blue-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">General Average</p>
                <div className="mt-2 flex items-end justify-between gap-3">
                  <p className="text-4xl font-bold text-slate-900">
                    {reportSummaryLoading ? '--' : formatGrade(finalAverage)}
                  </p>
                  <p className="pb-1 text-sm font-semibold text-slate-500">
                    {gradedSubjectsCount}/{subjects.length || 0} subjects
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {subjects.slice(0, 3).map((subject) => (
                  <div key={subject.subject_id || subject.subject_name} className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2">
                    <p className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-700">{subject.subject_name}</p>
                    <span className="ml-3 rounded-full bg-white px-3 py-1 text-sm font-bold text-blue-700">
                      {formatGrade(subject.final_grade)}
                    </span>
                  </div>
                ))}
                {!reportSummaryLoading && subjects.length === 0 && (
                  <div className="rounded-2xl bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">
                    Grades are not available yet.
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => navigate('/student-report-card')}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Report Card
                <ArrowRight className="h-4 w-4" />
              </button>
            </section>

            <section className="rounded-3xl border border-blue-100 bg-white p-5 shadow-xl shadow-blue-900/5">
              <h2 className="text-xl font-bold text-slate-900">Pages</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                {[
                  { label: 'Profile', path: '/student-profile', icon: UserCircle },
                  { label: 'Report Card', path: '/student-report-card', icon: FileText },
                  { label: 'Announcements', path: '/student/announcements', icon: Bell }
                ].map(({ label, path, icon: Icon }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => navigate(path)}
                    className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-3 text-left transition hover:border-blue-100 hover:bg-blue-50"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="truncate text-sm font-bold text-slate-800">{label}</span>
                    </span>
                    <ArrowRight className="h-4 w-4 flex-shrink-0 text-slate-400" />
                  </button>
                ))}
              </div>
            </section>
          </aside>
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

        </Suspense>
      </div>
    </motion.main>
  );
};

export default StudentDashboard;
