import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import { useSuperadminStore } from '../../store/superadminStore';
import { useSchoolYearStore } from '../../store/schoolYearStore';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import {
  Users, GraduationCap, BookOpen, School, BarChart3, RefreshCw, ArrowLeft,
} from 'lucide-react';

const COLORS = ['#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#6366F1'];

export default function SuperAdminAnalyticsPage() {
  const ENROLLMENT_PAGE_SIZE = 10;
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { current, selected: globalSelected, fetchYears } = useSchoolYearStore();
  const {
    analytics,
    availableYears,
    loading: isLoading,
    error,
    fetchAnalytics,
    fetchAvailableYears,
    clearAnalytics,
  } = useSuperadminStore();

  const [selectedYear, setSelectedYear] = useState('');
  const [enrollmentPage, setEnrollmentPage] = useState(1);

  const formatSchoolYear = (yearLike) => {
    const y = parseInt(yearLike, 10);
    if (Number.isNaN(y)) return String(yearLike);
    return `${y} - ${y + 1}`;
  };

  useEffect(() => {
    if (user?.user_role !== 'superadmin') {
      navigate('/unauthorized');
      return;
    }
  }, [user, navigate]);

  useEffect(() => {
    if (user?.user_role === 'superadmin') {
      fetchAvailableYears();
      fetchYears().catch(() => {});
    }
  }, [user, fetchAvailableYears, fetchYears]);

  useEffect(() => {
    const yearOptions = (availableYears || []).map((year) => String(year));
    const activeName = current?.name || globalSelected || null;
    const activeStart = activeName && /^\d{4}-\d{4}$/.test(activeName)
      ? activeName.slice(0, 4)
      : null;

    if (selectedYear && yearOptions.includes(String(selectedYear))) {
      return;
    }

    if (activeStart && yearOptions.includes(activeStart)) {
      setSelectedYear(activeStart);
      return;
    }

    if (yearOptions.length > 0) {
      setSelectedYear(yearOptions[0]);
      return;
    }

    if (selectedYear) {
      setSelectedYear('');
    }
  }, [availableYears, current, globalSelected, selectedYear]);

  const handleFetch = useCallback(async () => {
    clearAnalytics();
    await fetchAnalytics(selectedYear);
  }, [clearAnalytics, fetchAnalytics, selectedYear]);

  useEffect(() => {
    if (user?.user_role === 'superadmin' && selectedYear) {
      handleFetch();
    }
  }, [handleFetch, selectedYear, user]);

  const metrics = useMemo(() => ({
    totalUsers: analytics?.overview?.totalUsers ?? 0,
    totalStudents: analytics?.overview?.totalStudents ?? 0,
    totalTeachers: analytics?.overview?.totalTeachers ?? 0,
    totalAdmins: analytics?.overview?.totalAdmins ?? 0,
    totalSuperAdmins: analytics?.overview?.totalSuperAdmins ?? 0,
    totalClasses: analytics?.overview?.totalClasses ?? 0,
    totalSubjects: analytics?.overview?.totalSubjects ?? 0,
  }), [analytics]);

  const enrollmentRows = useMemo(() => analytics?.enrollment?.largestClasses || [], [analytics]);
  const totalEnrollmentPages = Math.max(1, Math.ceil(enrollmentRows.length / ENROLLMENT_PAGE_SIZE));
  const paginatedEnrollmentRows = useMemo(() => {
    const startIndex = (enrollmentPage - 1) * ENROLLMENT_PAGE_SIZE;
    return enrollmentRows.slice(startIndex, startIndex + ENROLLMENT_PAGE_SIZE);
  }, [enrollmentPage, enrollmentRows]);

  useEffect(() => {
    setEnrollmentPage(1);
  }, [selectedYear]);

  useEffect(() => {
    if (enrollmentPage > totalEnrollmentPages) {
      setEnrollmentPage(totalEnrollmentPages);
    }
  }, [enrollmentPage, totalEnrollmentPages]);

  const MetricCard = ({ title, value, icon: Icon, color }) => (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-sm p-5 border border-gray-100"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-gray-900">{Number(value).toLocaleString()}</h3>
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </motion.div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="p-4 pt-20 sm:pt-24 sm:p-8 w-full max-w-7xl mx-auto"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white p-6 rounded-2xl shadow-lg relative mb-8">
        <div className="absolute top-0 right-0 opacity-10 pointer-events-none">
          <BarChart3 className="w-28 h-28" />
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
          <div>
            <button
              onClick={() => navigate('/superadmin/dashboard')}
              className="flex items-center text-indigo-100 hover:text-white mb-2 transition-colors"
            >
              <ArrowLeft size={18} className="mr-1" />
              <span>Back to Dashboard</span>
            </button>
            <h1 className="text-2xl sm:text-3xl font-bold mb-1">System Analytics</h1>
            <p className="text-indigo-100">High-level metrics for SY {selectedYear ? formatSchoolYear(selectedYear) : 'No school year selected'}</p>
          </div>
          <div className="flex gap-3">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-white bg-opacity-20 text-white border border-white border-opacity-30 rounded-lg px-3 py-2 text-sm"
              disabled={isLoading}
            >
              {(availableYears || []).map((y) => (
                <option key={y} value={y.toString()} className="text-gray-900">SY {formatSchoolYear(y)}</option>
              ))}
            </select>
            <button
              onClick={handleFetch}
              disabled={isLoading}
              className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
  <MetricCard title="Total Users" value={metrics.totalUsers} icon={Users} color="bg-blue-600" />
  <MetricCard title="Students" value={metrics.totalStudents} icon={Users} color="bg-indigo-600" />
  <MetricCard title="Teachers" value={metrics.totalTeachers} icon={GraduationCap} color="bg-emerald-600" />
  <MetricCard title="Classes" value={metrics.totalClasses} icon={School} color="bg-purple-600" />
      </div>

      {/* Activity snapshot */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
        <MetricCard title="Active users (24h)" value={analytics?.activity?.activeUsers?.last24h ?? 0} icon={Users} color="bg-fuchsia-600" />
        <MetricCard title="Active users (7d)" value={analytics?.activity?.activeUsers?.last7d ?? 0} icon={Users} color="bg-rose-600" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold mb-4">Roles Breakdown</h3>
          {analytics?.rolesBreakdown?.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={analytics.rolesBreakdown}
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  dataKey="count"
                  nameKey="role"
                  label={({ role, count }) => `${role}: ${count}`}
                >
                  {analytics.rolesBreakdown.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 grid place-items-center text-gray-500">No data</div>
          )}
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold mb-4">Logins (last 14 days)</h3>
          {analytics?.activity?.loginSeries?.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={analytics.activity.loginSeries}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="total" stroke="#8B5CF6" fillOpacity={1} fill="url(#colorTotal)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 grid place-items-center text-gray-500">No activity</div>
          )}
        </div>
      </div>

      {/* Enrollment table */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Class Enrollment</h3>
          <span className="text-xs text-gray-500">SY {formatSchoolYear(selectedYear)}</span>
        </div>
        {enrollmentRows.length ? (
          <div className="space-y-4">
            <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border p-2 text-left text-xs font-medium text-gray-600">Grade</th>
                  <th className="border p-2 text-left text-xs font-medium text-gray-600">Section</th>
                  <th className="border p-2 text-left text-xs font-medium text-gray-600">Adviser</th>
                  <th className="border p-2 text-center text-xs font-medium text-gray-600">Enrolled</th>
                </tr>
              </thead>
              <tbody>
                {paginatedEnrollmentRows.map((c, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="border p-2 text-sm font-medium">{c.grade_level}</td>
                    <td className="border p-2 text-sm">{c.section}</td>
                    <td className="border p-2 text-sm">{c.adviser_name}</td>
                    <td className="border p-2 text-sm text-center">{c.student_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
            {enrollmentRows.length > ENROLLMENT_PAGE_SIZE && (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-gray-500">
                  Showing {(enrollmentPage - 1) * ENROLLMENT_PAGE_SIZE + 1}
                  {' '}-{' '}
                  {Math.min(enrollmentPage * ENROLLMENT_PAGE_SIZE, enrollmentRows.length)} of {enrollmentRows.length} classes
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEnrollmentPage((page) => Math.max(1, page - 1))}
                    disabled={enrollmentPage === 1}
                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-500">
                    Page {enrollmentPage} of {totalEnrollmentPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setEnrollmentPage((page) => Math.min(totalEnrollmentPages, page + 1))}
                    disabled={enrollmentPage === totalEnrollmentPages}
                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="h-32 grid place-items-center text-gray-500">No enrollment data</div>
        )}
      </div>
    </motion.div>
  );
}
