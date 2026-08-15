import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { useAdminStore } from '../../store/adminStore'; // Add this import
import { useSchoolYearStore } from '../../store/schoolYearStore';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Area, AreaChart
} from 'recharts';
import {
  Users, GraduationCap, BookOpen, School, Award,
  Calendar, Clock, ArrowLeft, BarChart3, PieChart as PieChartIcon,
  Zap, AlertCircle, CheckCircle, Download,
  Filter, RefreshCw, Eye, ChevronDown
} from 'lucide-react';

const COLORS = ['#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#6366F1'];

const AdminAnalyticsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  // Use the admin store including available years
  const { 
    analyticsData, 
    availableYears, // Add this from store
    isLoading, 
    error, 
    fetchAnalytics,
    fetchAvailableYears, // Add this from store
    clearMessages 
  } = useAdminStore();
  const { current, selected: globalSelected, fetchYears } = useSchoolYearStore();
  
  const [selectedYear, setSelectedYear] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  // Format "YYYY - YYYY+1"
  const formatSchoolYear = (yearLike) => {
    const y = parseInt(yearLike, 10);
    if (Number.isNaN(y)) return String(yearLike);
    return `${y} - ${y + 1}`;
  };

  // Check admin access
  useEffect(() => {
    if (user?.user_role !== 'admin') {
      navigate('/unauthorized');
      return;
    }
  }, [user, navigate]);

  // Fetch available years on component mount
  useEffect(() => {
    if (user?.user_role === 'admin') {
      fetchAvailableYears();
      // Ensure global school years are loaded so we know the active one
      fetchYears().catch(() => {});
    }
  }, [user, fetchAvailableYears, fetchYears]);

  // Update selected year when available years change
  useEffect(() => {
    if (selectedYear) return; // don't override once set
    // Prefer active school year from global store if available
    const activeName = current?.name || globalSelected || null; // format: YYYY-YYYY
    if (activeName && /^\d{4}-\d{4}$/.test(activeName)) {
      const start = activeName.slice(0, 4);
      setSelectedYear(start);
      return;
    }
    // Fallback to most recent available year list
    if (availableYears && availableYears.length > 0) {
      setSelectedYear(availableYears[0].toString());
    } else {
      // Last resort: current calendar year
      setSelectedYear(new Date().getFullYear().toString());
    }
  }, [availableYears, current, globalSelected, selectedYear]);

  // Fetch analytics data using store
  const handleFetchAnalytics = async () => {
    try {
      clearMessages(); // Clear any previous errors
      await fetchAnalytics(selectedYear);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics data');
    }
  };

  useEffect(() => {
    if (user?.user_role === 'admin' && selectedYear) {
      handleFetchAnalytics();
    }
  }, [selectedYear, user]);

  const handleBack = () => {
    navigate('/admin/dashboard');
  };

  const MetricCard = ({ title, value, icon: Icon, color, change, description }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-md p-6 border border-gray-100"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
          {change && (
            <p className={`text-sm mt-1 ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {change > 0 ? '+' : ''}{change}% from last year
            </p>
          )}
          {description && (
            <p className="text-xs text-gray-500 mt-1">{description}</p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </motion.div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4 pt-20 sm:pt-24">
        <div className="animate-spin w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full"></div>
        <span className="ml-3 text-gray-600">Loading analytics...</span>
      </div>
    );
  }

  if (error || !analyticsData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 pt-20 sm:pt-24">
        <AlertCircle className="w-16 h-16 text-gray-300 mb-4" />
        <p className="text-gray-500 text-lg mb-2">Failed to load analytics data</p>
        {error && <p className="text-red-500 text-sm mb-6">{error}</p>}
        <button 
          onClick={handleFetchAnalytics}
          className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors"
          disabled={isLoading}
        >
          <RefreshCw className={`w-5 h-5 mr-2 inline ${isLoading ? 'animate-spin' : ''}`} />
          Retry
        </button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-4 pt-20 sm:pt-24 sm:p-8 w-full max-w-7xl mx-auto"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-800 text-white p-6 rounded-2xl shadow-lg relative mb-8">
        <div className="absolute top-0 right-0 opacity-10 pointer-events-none">
          <BarChart3 className="w-32 h-32" />
        </div>
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
          <div>
            <button 
              onClick={handleBack}
              className="flex items-center text-purple-100 hover:text-white mb-2 transition-colors"
            >
              <ArrowLeft size={20} className="mr-1" />
              <span>Back to Dashboard</span>
            </button>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">School Analytics</h1>
            <p className="text-purple-100">Comprehensive insights and performance metrics for {formatSchoolYear(selectedYear)}</p>
          </div>
          
          <div className="flex gap-3">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-white bg-opacity-20 text-white border border-white border-opacity-30 rounded-lg px-3 py-2 text-sm"
              disabled={isLoading}
            >
              {availableYears.length > 0 ? (
                availableYears.map(year => (
                  <option key={year} value={year.toString()} className="text-gray-900">
                    SY {formatSchoolYear(year)}
                  </option>
                ))
              ) : (
                // Fallback while loading
                <option value={new Date().getFullYear().toString()} className="text-gray-900">
                  SY {formatSchoolYear(new Date().getFullYear())}
                </option>
              )}
            </select>
            <button 
              onClick={handleFetchAnalytics}
              disabled={isLoading}
              className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Year Summary Banner */}
      {analyticsData && (
        <div className="bg-white rounded-xl shadow-md p-4 mb-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Analytics for SY {formatSchoolYear(selectedYear)}
              </h3>
              <p className="text-sm text-gray-600">
                Data filtered for the selected academic year
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Available Years</p>
              <div className="flex gap-1 mt-1">
                {availableYears.slice(0, 3).map(year => (
                  <span 
                    key={year} 
                    className={`px-2 py-1 text-xs rounded ${
                      year.toString() === selectedYear 
                        ? 'bg-purple-100 text-purple-700' 
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {formatSchoolYear(year)}
                  </span>
                ))}
                {availableYears.length > 3 && (
                  <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-600">
                    +{availableYears.length - 3}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Overview Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Total Students"
          value={analyticsData.overview.totalStudents.toLocaleString()}
          icon={Users}
          color="bg-blue-600"
          description={`Active enrollments in ${selectedYear}-${parseInt(selectedYear) + 1}`}
        />
        <MetricCard
          title="Total Teachers"
          value={analyticsData.overview.totalTeachers.toLocaleString()}
          icon={GraduationCap}
          color="bg-green-600"
          description="Active faculty members"
        />
        <MetricCard
          title="Total Classes"
          value={analyticsData.overview.totalClasses.toLocaleString()}
          icon={School}
          color="bg-purple-600"
          description={`Active sections in ${selectedYear}`}
        />
        <MetricCard
          title="Total Subjects"
          value={analyticsData.overview.totalSubjects.toLocaleString()}
          icon={BookOpen}
          color="bg-orange-600"
          description="Available curriculum subjects"
        />
      </div>

      {/* System Health Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-1 gap-6 mb-8">
        <MetricCard
          title="Average Class Size"
          value={analyticsData.overview.systemMetrics.averageClassSize}
          icon={Users}
          color="bg-indigo-600"
          description="Students per class"
        />
      </div>

         {/* Tab Navigation */}
      <div className="bg-white rounded-2xl shadow-md overflow-hidden mb-6">
        <div className="flex border-b overflow-x-auto">
          {[ 
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'demographics', label: 'Demographics', icon: Users },
            { id: 'enrollment', label: 'Enrollment', icon: School },
            { id: 'teachers', label: 'Teachers', icon: GraduationCap }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 flex items-center px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-purple-600 border-b-2 border-purple-500 bg-purple-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Gender Distribution */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <PieChartIcon className="w-5 h-5 mr-2 text-purple-600" />
                    Gender Distribution (SY {formatSchoolYear(selectedYear)})
                  </h3>
                  {analyticsData.demographics.genderDistribution.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={analyticsData.demographics.genderDistribution}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ sex, count }) => `${sex}: ${count}`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="count"
                          nameKey="sex"
                        >
                          {analyticsData.demographics.genderDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-64 text-gray-500">
                      <div className="text-center">
                        <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No student data for SY {formatSchoolYear(selectedYear)}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Grade Distribution */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <BarChart3 className="w-5 h-5 mr-2 text-purple-600" />
                    Students by Grade Level (SY {formatSchoolYear(selectedYear)})
                  </h3>
                  {analyticsData.demographics.gradeDistribution.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={analyticsData.demographics.gradeDistribution}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="grade_level" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="student_count" fill="#8B5CF6" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-64 text-gray-500">
                      <div className="text-center">
                        <School className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No grade data for SY {formatSchoolYear(selectedYear)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Demographics Tab */}
          {activeTab === 'demographics' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Age Distribution */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">Age Distribution (SY {formatSchoolYear(selectedYear)})</h3>
                  {analyticsData.demographics.ageDistribution.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={analyticsData.demographics.ageDistribution}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="age" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#10B981" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-72 text-gray-500">
                      <div className="text-center">
                        <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No age data for SY {formatSchoolYear(selectedYear)}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Gender Distribution */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">Gender Distribution (SY {formatSchoolYear(selectedYear)})</h3>
                  {analyticsData.demographics.genderDistribution.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={analyticsData.demographics.genderDistribution}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="count"
                          label={({ sex, count }) => `${sex}: ${count}`}
                        >
                          {analyticsData.demographics.genderDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-72 text-gray-500">
                      <div className="text-center">
                        <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No gender data for SY {formatSchoolYear(selectedYear)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Enrollment Tab */}
          {activeTab === 'enrollment' && (
            <div className="space-y-6">
              {/* Class Enrollment Table */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <School className="w-5 h-5 mr-2 text-purple-600" />
                  Class Enrollment Summary (SY {formatSchoolYear(selectedYear)})
                </h3>
                {analyticsData.enrollment.classEnrollment.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse">
                      <thead className="bg-white">
                        <tr>
                          <th className="border p-3 text-left text-sm font-medium text-gray-700">Grade</th>
                          <th className="border p-3 text-left text-sm font-medium text-gray-700">Section</th>
                          <th className="border p-3 text-left text-sm font-medium text-gray-700">Adviser</th>
                          <th className="border p-3 text-center text-sm font-medium text-gray-700">Enrolled</th>
                          <th className="border p-3 text-center text-sm font-medium text-gray-700">Capacity</th>
                          {analyticsData.enrollment.classEnrollment[0]?.school_year && (
                            <th className="border p-3 text-center text-sm font-medium text-gray-700">School Year</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {analyticsData.enrollment.classEnrollment.map((classInfo, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="border p-3 font-medium">{classInfo.grade_level}</td>
                            <td className="border p-3">{classInfo.section}</td>
                            <td className="border p-3">{classInfo.adviser_name}</td>
                            <td className="border p-3 text-center">{classInfo.total_students}</td>
                            <td className="border p-3 text-center">{classInfo.capacity}</td>
                            {classInfo.school_year && (
                              <td className="border p-3 text-center text-sm">{classInfo.school_year}</td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-64 text-gray-500">
                    <div className="text-center">
                      <School className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No class enrollment data for SY {formatSchoolYear(selectedYear)}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Teachers Tab */}
          {activeTab === 'teachers' && (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <GraduationCap className="w-5 h-5 mr-2 text-purple-600" />
                  Teacher Workload Distribution (SY {formatSchoolYear(selectedYear)})
                </h3>
                {analyticsData.teachers.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse">
                      <thead className="bg-white">
                        <tr>
                          <th className="border p-3 text-left text-sm font-medium text-gray-700">Teacher</th>
                          <th className="border p-3 text-left text-sm font-medium text-gray-700">Title</th>
                          <th className="border p-3 text-center text-sm font-medium text-gray-700">Classes</th>
                          <th className="border p-3 text-center text-sm font-medium text-gray-700">Students</th>
                          {/* Workload column removed */}
                        </tr>
                      </thead>
                      <tbody>
                        {analyticsData.teachers.map((teacher, index) => {
                          const workloadLevel = teacher.total_students_handled > 100 ? 'High' :
                                              teacher.total_students_handled > 50 ? 'Medium' : 'Light';
                          const workloadColor = workloadLevel === 'High' ? 'bg-red-100 text-red-800' :
                                              workloadLevel === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                                              'bg-green-100 text-green-800';
                          
                          return (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="border p-3 font-medium">{teacher.user_fullname}</td>
                              <td className="border p-3">{teacher.teacher_title}</td>
                              <td className="border p-3 text-center">{teacher.classes_assigned}</td>
                              <td className="border p-3 text-center">{teacher.total_students_handled}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-64 text-gray-500">
                    <div className="text-center">
                      <GraduationCap className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No teacher workload data for SY {formatSchoolYear(selectedYear)}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Trends tab removed */}
        </div>
      </div>
    </motion.div>
  );
};

export default AdminAnalyticsPage;