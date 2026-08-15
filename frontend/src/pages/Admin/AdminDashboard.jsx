import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuditLogStore } from '../../store/auditLogStore';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import { useAdminStore } from '../../store/adminStore';
// import { useStudentStore } from '../../store/studentStore';
import CreateTeacher from '../../components/Modals/CreateTeacher';
import CreateClass from '../../components/Modals/CreateClass';
import AccountSettingsModal from '../../components/Modals/AccountSettingsModal';
import { useSchoolYearStore } from '../../store/schoolYearStore';
import { useSiteMetricsStore } from '../../store/siteMetricsStore';
import {
  Users,
  UserCheck,
  BookOpen,
  School,
  User,
  Calendar,
  ChevronRight,
  Settings,
  UserPlus,
  UserCog,
  GraduationCap
} from 'lucide-react';
import { formatAuditAction } from '../../utils/formatAuditAction';

const AdminDashboard = () => {
  const { user } = useAuthStore();
  const { teachers, classes, analyticsData, isLoading: adminStoreLoading, fetchTeachers, fetchClasses, fetchAnalytics } = useAdminStore();
  const { selected, fetchYears } = useSchoolYearStore();
  const navigate = useNavigate();
  
  const [isLoading, setIsLoading] = useState(true);
  const { totalUnique, fetchTotal } = useSiteMetricsStore();
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [showClassModal, setShowClassModal] = useState(false);
  const [accountSettingsOpen, setAccountSettingsOpen] = useState(false);
  const { logs: recentLogs, fetchLogs: fetchAudit } = useAuditLogStore();

  // Memoize stats calculation to prevent unnecessary recalculations
  const stats = useMemo(() => ({
    totalTeachers: Array.isArray(teachers) ? teachers.length : 0,
    totalClasses: Array.isArray(classes) ? classes.length : 0,
    totalStudents: analyticsData?.overview?.totalStudents ?? 0
  }), [teachers, classes, analyticsData]);

  // Memoize the fetch function to prevent it from changing on every render
  const fetchDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Only fetch data that we don't already have
      const promises = [];
      
      if (!teachers || teachers.length === 0) {
        promises.push(fetchTeachers().catch(err => {
          console.error('Error fetching teachers:', err);
          return [];
        }));
      }
      
      // Students are derived from analytics per school year to ensure historical accuracy
      
      if (!classes || classes.length === 0) {
        promises.push(fetchClasses(selected || undefined).catch(err => {
          console.error('Error fetching classes:', err);
          return [];
        }));
      }
      // Always fetch analytics for accurate per-year totals
      const startYear = selected?.match(/^(\d{4})-/)?.[1] || null;
      promises.push(fetchAnalytics(startYear).catch(err => {
        console.error('Error fetching analytics:', err);
        return null;
      }));
      
      // Only fetch if we have promises to execute
      if (promises.length > 0) {
        await Promise.all(promises);
      }
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [fetchTeachers, fetchClasses, fetchAnalytics, teachers, classes, selected]);

  // Use useEffect with proper dependencies
  useEffect(() => {
    // Only fetch data on initial load
    if (isLoading) {
      // Ensure school years are loaded too
      fetchYears().finally(() => fetchDashboardData());
      // Fetch a small batch of recent audit logs for the widget
      fetchAudit({ limit: 6 }).catch(()=>{});
      // Fetch site unique visitors for the metric card
      fetchTotal().catch(()=>{});
    }
  }, []); // Empty dependency array for initial load only

  // Separate useEffect to handle loading state when stores are loading
  useEffect(() => {
    if (!adminStoreLoading && isLoading) {
      setIsLoading(false);
    }
  }, [adminStoreLoading, isLoading]);

  // Handle successful teacher creation - use callback to prevent re-renders
  const handleTeacherSuccess = useCallback(async () => {
    try {
      await fetchTeachers();
    } catch (error) {
      console.error('Error refreshing teacher data:', error);
    }
  }, [fetchTeachers]);

  // Handle successful class creation - use callback to prevent re-renders
  const handleClassSuccess = useCallback(async () => {
    try {
      await fetchClasses(selected || undefined);
    } catch (error) {
      console.error('Error refreshing class data:', error);
    }
  }, [fetchClasses, selected]);

  // Refetch year-scoped data when the selected school year changes
  useEffect(() => {
    if (selected) {
      setIsLoading(true);
      const startYear = selected.match(/^(\d{4})-/)?.[1] || null;
      Promise.all([
        fetchClasses(selected).catch(() => {}),
        fetchAnalytics(startYear).catch(() => {})
      ]).finally(() => setIsLoading(false));
    }
  }, [selected, fetchClasses, fetchAnalytics]);

  // Memoize components to prevent unnecessary re-renders
  const QuickActions = useMemo(() => (
    <div className="card-modern p-6">
      <h2 className="text-xl font-display font-bold text-gray-900 mb-6 flex items-center">
        <Settings className="h-5 w-5 mr-2 text-primary-600" />
        Quick Actions
      </h2>
      <div className="grid grid-cols-2 gap-4">
        <button 
          onClick={() => setShowTeacherModal(true)}
          className="flex flex-col items-center p-5 rounded-2xl bg-gradient-to-br from-success-50 to-success-100 hover:from-success-100 hover:to-success-200 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 group"
        >
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-success-500 to-success-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-md">
            <UserPlus className="h-6 w-6 text-white" />
          </div>
          <span className="text-sm font-semibold text-gray-800">Add Teacher</span>
        </button>
        
        <button 
          onClick={() => setShowClassModal(true)}
          className="flex flex-col items-center p-5 rounded-2xl bg-gradient-to-br from-secondary-50 to-secondary-100 hover:from-secondary-100 hover:to-secondary-200 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 group"
        >
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-secondary-500 to-secondary-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-md">
            <School className="h-6 w-6 text-white" />
          </div>
          <span className="text-sm font-semibold text-gray-800">Create Class</span>
        </button>

        <Link 
          to="/admin/subjects" 
          className="flex flex-col items-center p-5 rounded-2xl bg-gradient-to-br from-primary-50 to-primary-100 hover:from-primary-100 hover:to-primary-200 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 group"
        >
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-md">
            <BookOpen className="h-6 w-6 text-white" />
          </div>
          <span className="text-sm font-semibold text-gray-800">Manage Subjects</span>
        </Link>

        <button 
          onClick={() => setAccountSettingsOpen(true)}
          className="flex flex-col items-center p-5 rounded-2xl bg-gradient-to-br from-warning-50 to-warning-100 hover:from-warning-100 hover:to-warning-200 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 group"
        >
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-warning-500 to-warning-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-md">
            <UserCog className="h-6 w-6 text-white" />
          </div>
          <span className="text-sm font-semibold text-gray-800">Account Settings</span>
        </button>
      </div>
    </div>
  ), []);

  // Memoize recent teachers section
  const RecentTeachers = useMemo(() => (
    <div className="card-modern p-6 mb-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-display font-bold text-gray-900 flex items-center">
          <UserCheck className="h-6 w-6 mr-2 text-success-600" />
          Recent Teachers
        </h2>
        <Link 
          to="/admin/teachers" 
          className="text-sm text-success-600 hover:text-success-800 font-semibold flex items-center group"
        >
          View all
          <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      {!Array.isArray(teachers) || teachers.length === 0 ? (
        <div className="text-center py-12">
          <div className="h-20 w-20 mx-auto mb-4 rounded-2xl bg-success-100 flex items-center justify-center">
            <UserCheck className="h-10 w-10 text-success-500" />
          </div>
          <p className="text-gray-600 font-medium mb-4">No teachers found</p>
          <button 
            onClick={() => setShowTeacherModal(true)}
            className="btn-primary"
          >
            Add First Teacher
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {teachers.slice(0, 5).map((teacher) => (
            <div key={teacher.id} className="flex items-center gap-4 p-4 hover:bg-gray-50 rounded-xl transition-all duration-200 group">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-success-500 to-success-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform shadow-md">
                <UserCheck className="h-6 w-6 text-white" />
              </div>
              <div className="flex-grow min-w-0">
                <p className="text-gray-900 font-semibold truncate">{teacher.user_fullname}</p>
                <p className="text-sm text-gray-500 truncate">{teacher.user_email}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  ), [teachers, setShowTeacherModal]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-4 pt-20 sm:pt-24 sm:p-8 w-full max-w-7xl mx-auto"
    >
      {/* Welcome Header with Modern Gradient */}
      <div className="relative overflow-hidden rounded-3xl mb-8 p-8 md:p-10 bg-gradient-to-br from-primary-600 via-primary-700 to-secondary-700 text-white shadow-xl">
        <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-secondary-500/20 rounded-full blur-3xl"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <GraduationCap className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-display font-bold">
                Welcome back, {user?.user_fullname || 'Admin'}
              </h1>
              <p className="text-primary-100 mt-1">
                School Administration Dashboard
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Loading State */}
      {(isLoading || adminStoreLoading) && (
        <div className="flex flex-col justify-center items-center py-20">
          <div className="spinner mb-4"></div>
          <span className="text-gray-600 font-medium">Loading dashboard data...</span>
        </div>
      )}
      
      {/* Stats Cards - Modern card design */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Teachers Card */}
        <motion.div 
          className="card-modern hover-lift p-6 bg-gradient-to-br from-success-50 to-white border-success-200"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <p className="text-success-600 text-sm font-semibold uppercase tracking-wide">Teachers</p>
              <h3 className="text-4xl font-display font-bold text-gray-900 mt-2">{stats.totalTeachers}</h3>
            </div>
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-success-500 to-success-600 flex items-center justify-center shadow-lg">
              <UserCheck className="h-7 w-7 text-white" />
            </div>
          </div>
          <Link 
            to="/admin/teachers" 
            className="text-sm text-success-700 hover:text-success-800 font-semibold flex items-center group"
          >
            View all teachers
            <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>
        
        {/* Students Card */}
        <motion.div 
          className="card-modern hover-lift p-6 bg-gradient-to-br from-primary-50 to-white border-primary-200"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <p className="text-primary-600 text-sm font-semibold uppercase tracking-wide">Students</p>
              <h3 className="text-4xl font-display font-bold text-gray-900 mt-2">{stats.totalStudents}</h3>
            </div>
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg">
              <GraduationCap className="h-7 w-7 text-white" />
            </div>
          </div>
          <Link 
            to="/admin/students" 
            className="text-sm text-primary-700 hover:text-primary-800 font-semibold flex items-center group"
          >
            Manage students
            <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>
        
        {/* Classes Card */}
        <motion.div 
          className="card-modern hover-lift p-6 bg-gradient-to-br from-secondary-50 to-white border-secondary-200"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <p className="text-secondary-600 text-sm font-semibold uppercase tracking-wide">Classes</p>
              <h3 className="text-4xl font-display font-bold text-gray-900 mt-2">{stats.totalClasses}</h3>
            </div>
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-secondary-500 to-secondary-600 flex items-center justify-center shadow-lg">
              <School className="h-7 w-7 text-white" />
            </div>
          </div>
          <Link 
            to="/admin/classes" 
            className="text-sm text-secondary-700 hover:text-secondary-800 font-semibold flex items-center group"
          >
            View all classes
            <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>
        
        {/* Visits Card */}
        <motion.div 
          className="card-modern hover-lift p-6 bg-gradient-to-br from-accent-50 to-white border-accent-200"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <p className="text-accent-600 text-sm font-semibold uppercase tracking-wide">Site Visits</p>
              <h3 className="text-4xl font-display font-bold text-gray-900 mt-2">{(totalUnique || 0).toLocaleString()}</h3>
            </div>
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-accent-500 to-accent-600 flex items-center justify-center shadow-lg">
              <Users className="h-7 w-7 text-white" />
            </div>
          </div>
          <p className="text-xs text-gray-500 font-medium">Total unique visitors</p>
        </motion.div>
      </div>
      
      {/* Main Dashboard Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left/Center Content */}
        <div className="lg:col-span-2">
          {/* Recent Teachers Section - Shows actual teacher data */}
          {RecentTeachers}
        </div>
        
        {/* Right Sidebar */}
        <div>
          {/* Quick Actions */}
          {QuickActions}          {/* Recent Activity Widget */}
          <div className="bg-white rounded-2xl shadow-md p-6 mt-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">Recent Activity</h2>
              <Link to="/admin/audit-logs" className="text-sm text-blue-600">View all</Link>
            </div>
            <div className="space-y-3">
              {(recentLogs || []).slice(0,6).map((l) => (
                <div key={l.id} className="flex items-start gap-3">
                  <div className="mt-1 h-2 w-2 rounded-full bg-blue-500" />
                  <div className="text-sm">
                    <div className="text-gray-800 font-medium truncate max-w-[260px]">{formatAuditAction(l)}</div>
                    <div className="text-gray-500 text-xs">{new Date(l.created_at).toLocaleString()} • {l.user_email || '—'}</div>
                  </div>
                </div>
              ))}
              {(!recentLogs || recentLogs.length === 0) && (
                <div className="text-sm text-gray-500">No recent activity.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <CreateTeacher
        isOpen={showTeacherModal}
        onClose={() => setShowTeacherModal(false)}
        onSuccess={handleTeacherSuccess}
      />

      <CreateClass
        isOpen={showClassModal}
        onClose={() => setShowClassModal(false)}
        onSuccess={handleClassSuccess}
      />

      <AccountSettingsModal 
        isOpen={accountSettingsOpen}
        onClose={() => setAccountSettingsOpen(false)}
      />
    </motion.div>
  );
};

export default AdminDashboard;