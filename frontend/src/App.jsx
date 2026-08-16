import { Navigate, Route, Routes, useLocation, BrowserRouter as Router } from "react-router-dom";
import UnifiedLogin from "./pages/UnifiedLogin";
import LoginPage from "./pages/Teacher/LoginPage";
import SignUpPage from "./pages/Teacher/SignUpPage";
import ForgotPasswordPage from "./pages/Teacher/ForgotPasswordPage"; // Teacher/Admin forgot password
import StudentForgotPasswordPage from "./pages/Student/StudentForgotPasswordPage"; // Student forgot password
import ResetPasswordPage from "./pages/Teacher/ResetPasswordPage"; // Add this import
import DashboardPage from "./pages/Teacher/DashboardPage";
import AnnouncementPage from "./pages/Teacher/AnnouncementPage";
import AdminStudentListPage from "./pages/Admin/AdminStudentListPage"; // Add this import
import AdminStudentProfilePage from "./pages/Admin/AdminStudentProfilePage"; // Add this import
import StudentArchivePage from "./pages/Admin/StudentArchivePage";
import StudentEditPage from "./pages/Teacher/StudentEditPage";
import StudentProfilePage from "./pages/Teacher/StudentProfilePage";
import StudentReportCardPage from "./pages/Teacher/StudentReportCardPage";
import ClassSubjectPage from "./pages/Admin/ClassSubjectPage";
import StudentCard from "./pages/Student/StudentCard";
import TeacherBackCard from "./pages/Teacher/ReportCard/TeacherBackCard";
import TeacherFrontCard from "./pages/Teacher/ReportCard/TeacherFrontCard";
import StudentDashboard from "./pages/Student/StudentDashboard";
import StudentLoginPage from "./pages/Student/StudentLogin";
import ClassStudentsPage from "./pages/Teacher/ClassStudentsPage";
import ClassAnalyticsPage from "./pages/Teacher/ClassAnalyticsPage"; // Add this import
import TeacherClassSubjectsPage from "./pages/Teacher/TeacherClassSubjectsPage.jsx";
import AdminLogin from "./pages/Admin/AdminLogin";
import AdminDashboard from "./pages/Admin/AdminDashboard";
import AnnouncementArchivePage from "./pages/Teacher/AnnouncementArchivePage";
import TopNavbar from "./components/TopNavbar"; // Teacher navigation
import AdminTopNav from "./components/AdminTopNav"; // Admin navigation
import SuperAdminTopNav from "./components/SuperAdminTopNav"; // Superadmin navigation
import LoadingSpinner from "./components/LoadingSpinner";
import { Toaster } from "react-hot-toast";
import { useAuthStore } from "./store/authStore";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import StudentAttendancePage from "./pages/Teacher/StudentAttendancePage";
import TeachersList from "./pages/Admin/TeachersList";
import ClassesList from "./pages/Admin/ClassesList";
import SubjectManagementPage from "./pages/Admin/SubjectManagementPage";
import PublicAnnouncement from './pages/Public/PublicAnnouncement';
import InstallPrompt from './components/InstallPrompt';
import AllAnnouncements from './pages/Student/AllAnnouncements';
import StudentPortalProfilePage from './pages/Student/StudentProfilePage';
import AccountActivationPage from "./pages/Teacher/AccountActivationPage"; // Add this import
import AdminAnalyticsPage from "./pages/Admin/AdminAnalyticsPage";
import SchoolYearManagementPage from "./pages/Admin/SchoolYearManagementPage";
import ReportLogPage from "./pages/Admin/ReportLogPage";
import SuperAdminReportLogPage from "./pages/SuperAdmin/ReportLogPage";
import SuperAdminUserManagement from "./pages/SuperAdmin/SuperAdminUserManagement";
import SuperAdminArchivedUsers from "./pages/SuperAdmin/SuperAdminArchivedUsers";
import OfflineIndicator from './components/OfflineIndicator';
import AdminStudentEditPage from './pages/Admin/AdminStudentEditPage';
import SuperAdminLogin from "./pages/SuperAdmin/SuperAdminLogin";
import SuperAdminDashboard from "./pages/SuperAdmin/SuperAdminDashboard";
import SuperAdminAnalyticsPage from "./pages/SuperAdmin/SuperAdminAnalyticsPage";
import LandingPage from "./pages/LandingPage";
import { useSiteMetricsStore } from "./store/siteMetricsStore";
import StudentBottomNav from "./components/Student/StudentBottomNav";
import TeacherBottomNav from "./components/Teacher/TeacherBottomNav";

// Role-based route protection
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.user_role)) {
    // Redirect based on role
    if (user?.user_role === 'student') {
      return <Navigate to="/student-dashboard" replace />;
    } else if (user?.user_role === 'admin') {
      return <Navigate to="/admin/dashboard" replace />;
    } else {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
};

// Convenience components for role-based routes
const StudentRoute = ({ children }) => (
  <ProtectedRoute allowedRoles={['student']}>{children}</ProtectedRoute>
);

const TeacherRoute = ({ children }) => (
  <ProtectedRoute allowedRoles={['teacher']}>{children}</ProtectedRoute>
);

const AdminRoute = ({ children }) => (
  <ProtectedRoute allowedRoles={['admin', 'superadmin']}>{children}</ProtectedRoute>
);

const SuperAdminRoute = ({ children }) => (
  <ProtectedRoute allowedRoles={['superadmin']}>{children}</ProtectedRoute>
);

// Redirect authenticated users
const RedirectAuthenticatedUser = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore();
  
  if (isAuthenticated) {
    // Redirect based on role
    if (user?.user_role === 'student') {
      return <Navigate to="/student-dashboard" replace />;
    } else if (user?.user_role === 'superadmin') {
      return <Navigate to="/superadmin/dashboard" replace />;
    } else if (user?.user_role === 'admin') {
      return <Navigate to="/admin/dashboard" replace />; 
    } else {
      return <Navigate to="/dashboard" replace />;
    }
  }
  
  return children;
};

function App() {
  const { isCheckingAuth, checkAuth, isAuthenticated, user } = useAuthStore();
  const registerVisit = useSiteMetricsStore((s) => s.registerVisit);
  const registerGuardRef = useState(false)[0];
  const [isMaximized, setIsMaximized] = useState(false);
  const location = useLocation(); // Get current URL path

 // Treat only public announcement detail pages as unauthenticated: /announcement/:id (excluding 'archive')
 const isPublicAnnouncementDetail = /^\/announcement\/(?!archive$)[^/]+$/.test(location.pathname);
 // Skip auth checking for login/signup and other public paths
  const isAuthPath = location.pathname === '/' ||
 location.pathname === '/login' || 
 location.pathname === '/signup' || 
 location.pathname === '/admin/login' ||
 location.pathname === '/superadmin/login' ||
 location.pathname === '/student-login' ||
 location.pathname === '/forgot-password' ||
 location.pathname.startsWith('/reset-password') ||
 location.pathname.startsWith('/activate-account') ||
 isPublicAnnouncementDetail;
  const showStudentBottomNav = isAuthenticated && !isAuthPath && user?.user_role === 'student';
  const showTeacherBottomNav = isAuthenticated && !isAuthPath && user?.user_role === 'teacher';
  const showMobileBottomNav = showStudentBottomNav || showTeacherBottomNav;
  const hasActiveSession = isAuthenticated && !!user;

  useEffect(() => {
    if (isAuthPath) {
      console.log("Skipping auth check for public route:", location.pathname);
      if (isCheckingAuth) {
        useAuthStore.setState({ isCheckingAuth: false });
      }
      return;
    }

    // Keep in-app navigation smooth once a session is already loaded.
    if (hasActiveSession) {
      if (isCheckingAuth) {
        useAuthStore.setState({ isCheckingAuth: false });
      }
      return;
    }

    console.log("App checking authentication for protected route...");
    checkAuth();
  }, [checkAuth, hasActiveSession, isAuthPath, isCheckingAuth, location.pathname]);

  // Register a unique site visit once per page load (StrictMode-safe with sessionStorage)
  useEffect(() => {
    if (registerGuardRef) return; // in case of re-render
    registerVisit();
  }, [registerVisit, registerGuardRef]);

  // Only show loading indicator for protected routes
  if (isCheckingAuth && !isAuthPath && !hasActiveSession) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-center" />
      <div className="min-h-screen bg-white flex flex-col relative">
        {/* Role-specific top navbars */}
        {isAuthenticated && !isAuthPath && user?.user_role === 'admin' && (
          <AdminTopNav
            isMaximized={isMaximized}
            setIsMaximized={setIsMaximized}
          />
        )}
        {isAuthenticated && !isAuthPath && user?.user_role === 'superadmin' && (
          <SuperAdminTopNav
            isMaximized={isMaximized}
            setIsMaximized={setIsMaximized}
          />
        )}
        
        {/* Show TopNavbar only for teacher users */}
        {isAuthenticated && !isAuthPath && user?.user_role === 'teacher' && (
          <TopNavbar
            isMaximized={isMaximized}
            setIsMaximized={setIsMaximized}
          />
        )}
        
        <div className={`flex-grow w-full ${showMobileBottomNav ? 'pb-32 sm:pb-36 lg:pb-0' : ''}`}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial={showMobileBottomNav ? { opacity: 0 } : false}
              animate={{ opacity: 1 }}
              exit={showMobileBottomNav ? { opacity: 0 } : undefined}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="min-h-full"
            >
          <Routes location={location}>
            {/* Public routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/announcement/:id" element={<PublicAnnouncement />} />
            <Route 
              path="/login" 
              element={<RedirectAuthenticatedUser><UnifiedLogin /></RedirectAuthenticatedUser>} 
            />
            <Route
              path="/student-login"
              element={<RedirectAuthenticatedUser><UnifiedLogin /></RedirectAuthenticatedUser>}
            />
            <Route
              path="/signup"
              element={<RedirectAuthenticatedUser><SignUpPage /></RedirectAuthenticatedUser>}
            />
            
            {/* Add these new routes for forgot password functionality */}
            <Route path="/forgot-password" element={<RedirectAuthenticatedUser><ForgotPasswordPage /></RedirectAuthenticatedUser>} />
            <Route path="/student/forgot-password" element={<RedirectAuthenticatedUser><StudentForgotPasswordPage /></RedirectAuthenticatedUser>} />
            <Route
              path="/reset-password/:token"
              element={<RedirectAuthenticatedUser><ResetPasswordPage /></RedirectAuthenticatedUser>}
            />
            <Route
              path="/activate-account/:token"
              element={<RedirectAuthenticatedUser><AccountActivationPage /></RedirectAuthenticatedUser>}
            />

            {/* Admin Login Route */}
            <Route 
              path="/admin/login"
              element={<RedirectAuthenticatedUser><AdminLogin /></RedirectAuthenticatedUser>}
            />

            {/* Superadmin Login Route */}
            <Route 
              path="/superadmin/login"
              element={<RedirectAuthenticatedUser><SuperAdminLogin /></RedirectAuthenticatedUser>}
            />

            {/* Admin Dashboard Route (placeholder - create this component next) */}
            <Route
              path="/admin/dashboard"
              element={<AdminRoute><AdminDashboard /></AdminRoute>}
            />
            <Route
              path="/admin/admin-dashboard"
              element={<Navigate to="/admin/dashboard" replace />}
            />
            <Route
              path="/admin/teachers"
              element={<AdminRoute><TeachersList /></AdminRoute>}
            />
            <Route
              path="/admin/classes"
              element={<AdminRoute><ClassesList /></AdminRoute>}
            />
            <Route
              path="/admin/subjects"
              element={<AdminRoute><SubjectManagementPage /></AdminRoute>}
            />
            <Route
              path="/admin/students"
              element={<AdminRoute><AdminStudentListPage /></AdminRoute>}
            />
            <Route
              path="/admin/student-management"
              element={<AdminRoute><AdminStudentListPage /></AdminRoute>}
            />
            <Route
              path="/admin/students/:id"
              element={<AdminRoute><AdminStudentProfilePage /></AdminRoute>}
            />
            <Route
              path="/admin/class-subjects"
              element={<AdminRoute><ClassSubjectPage /></AdminRoute>}
            />
            <Route
              path="/admin/students/archive"
              element={<AdminRoute><StudentArchivePage /></AdminRoute>}
            />
            <Route
              path="/admin/analytics"
              element={<AdminRoute><AdminAnalyticsPage /></AdminRoute>}
            />
            <Route
              path="/admin/school-years"
              element={<AdminRoute><SchoolYearManagementPage /></AdminRoute>}
            />
            <Route
              path="/admin/audit-logs"
              element={<AdminRoute><ReportLogPage /></AdminRoute>}
            />
            <Route
              path="/superadmin/users"
              element={<SuperAdminRoute><SuperAdminUserManagement /></SuperAdminRoute>}
            />
            <Route
              path="/superadmin/users/archived"
              element={<SuperAdminRoute><SuperAdminArchivedUsers /></SuperAdminRoute>}
            />
            <Route
              path="/superadmin/dashboard"
              element={<SuperAdminRoute><SuperAdminDashboard /></SuperAdminRoute>}
            />
            <Route
              path="/superadmin/audit-logs"
              element={<SuperAdminRoute><SuperAdminReportLogPage /></SuperAdminRoute>}
            />
            <Route
              path="/superadmin/analytics"
              element={<SuperAdminRoute><SuperAdminAnalyticsPage /></SuperAdminRoute>}
            />
            {/* Teacher/Admin routes */}
            <Route 
              path="/dashboard" 
              element={<TeacherRoute><DashboardPage /></TeacherRoute>} 
            />
            <Route
              path="/announcement"
              element={<TeacherRoute><AnnouncementPage /></TeacherRoute>}
            />
            <Route
              path="/announcement-teacher"
              element={<TeacherRoute><AnnouncementPage /></TeacherRoute>}
            />
            <Route
              path="/students/:id"
              element={<TeacherRoute><StudentProfilePage /></TeacherRoute>}
            />
            <Route
              path="/students/edit/:id"
              element={<TeacherRoute><StudentEditPage /></TeacherRoute>}
            />

            <Route
              path="/announcement/archive"
              element={<TeacherRoute><AnnouncementArchivePage /></TeacherRoute>}
            />
            <Route
              path="/student/:id/report-card"
              element={<TeacherRoute><StudentReportCardPage /></TeacherRoute>}
            />
            <Route
              path="/student/:id/attendance"
              element={<TeacherRoute><StudentAttendancePage /></TeacherRoute>}
            />
            <Route
              path="/class/:classId/students"
              element={<TeacherRoute><ClassStudentsPage /></TeacherRoute>}
            />
            {/* Add the analytics route */}
            <Route
              path="/class/:classId/analytics"
              element={<TeacherRoute><ClassAnalyticsPage /></TeacherRoute>}
            />
            <Route
              path="/teacher/class-subjects"
              element={<TeacherRoute><TeacherClassSubjectsPage /></TeacherRoute>}
            />

            {/* Teacher Report Card View Routes */}
            <Route
              path="/teacher/student-front-card/:id"
              element={<TeacherRoute><TeacherFrontCard /></TeacherRoute>}
            />
            <Route
              path="/teacher/student-card/:id"
              element={<TeacherRoute><TeacherBackCard /></TeacherRoute>}
            />
            
            {/* Student routes */}
            <Route
              path="/student-dashboard"
              element={<StudentRoute><StudentDashboard /></StudentRoute>}
            />
            <Route
              path="/student/announcements"
              element={<StudentRoute><AllAnnouncements /></StudentRoute>}
            />
            <Route
              path="/student-profile"
              element={<StudentRoute><StudentPortalProfilePage /></StudentRoute>}
            />
            <Route
              path="/student-report-card"
              element={<StudentRoute><StudentCard /></StudentRoute>}
            />

            
            {/* Default route redirect - based on role */}
            <Route 
              path="/" 
              element={
                isAuthenticated ? (
                  user?.user_role === 'student' ? 
                    <Navigate to="/student-dashboard" /> : 
                    user?.user_role === 'superadmin' ?
                      <Navigate to="/superadmin/dashboard" /> :
                      user?.user_role === 'admin' ?
                        <Navigate to="/admin/dashboard" /> :
                        <Navigate to="/dashboard" />
                ) : (
                  <Navigate to="/login" />
                )
              } 
            />
            <Route path="*" element={<Navigate to="/" replace />} />
            <Route
              path="/admin/students/edit/:id"
              element={
                <AdminRoute>
                  <AdminStudentEditPage />
                </AdminRoute>
              }
            />
          </Routes>
            </motion.div>
          </AnimatePresence>
        </div>
        {showStudentBottomNav && <StudentBottomNav />}
        {showTeacherBottomNav && <TeacherBottomNav />}
      </div>
      
      {/* Add the InstallPrompt component here, outside the main div */}
      <InstallPrompt />
      <OfflineIndicator />
    </>
  );
}

export default App;
