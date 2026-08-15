import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useStudentStore } from '../../store/studentStore';
import { useAuthStore } from '../../store/authStore';
import { useGradeStore } from "../../store/gradeStore";
import { useAttendanceStore } from "../../store/attendanceStore";
import { useSchoolYearStore } from "../../store/schoolYearStore";
import {
  User,
  Book,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Award,
  ChevronLeft,
  Edit,
  Trash2,
  FileEdit,
  Clock,
  CheckCircle,
  X,
  Archive,
  Eye,
  Loader,
  Printer,
  Key,
  Settings,
  Shield,
  UserCheck,
  AlertTriangle,
  School,
  GraduationCap
} from 'lucide-react';
import { format } from 'date-fns';
import maskStudentId from '../../utils/maskStudentId';

// GradeCell component to display grades with color coding
const GradeCell = ({ value, isFinal = false }) => {
  if (!value) return <span>-</span>;
  
  const grade = parseFloat(value);
  let bgColor, textColor;
  
  if (grade >= 90) {
    bgColor = 'bg-green-100';
    textColor = 'text-green-800';
  } else if (grade >= 80) {
    bgColor = 'bg-blue-100';
    textColor = 'text-blue-800';
  } else if (grade >= 75) {
    bgColor = 'bg-yellow-100';
    textColor = 'text-yellow-800';
  } else {
    bgColor = 'bg-red-100';
    textColor = 'text-red-800';
  }
  
  return (
    <span className={`px-2 py-1 rounded-full ${bgColor} ${textColor} ${isFinal ? 'font-bold' : ''}`}>
      {value}
    </span>
  );
};

const AdminStudentProfilePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { 
    currentStudent, 
    fetchStudentById, 
    deleteStudent,
    resetStudentPassword,
    isLoading 
  } = useStudentStore();
  
  const { getStudentGrades, getStudentReportCard } = useGradeStore();
  const { getStudentAttendance } = useAttendanceStore();
  const selectedYear = useSchoolYearStore((s) => s.selected);
  const years = useSchoolYearStore((s) => s.years);
  const fetchYears = useSchoolYearStore((s) => s.fetchYears);
  const selectYear = useSchoolYearStore((s) => s.selectYear);
  
  const [grades, setGrades] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [schoolYear, setSchoolYear] = useState(null);
  const [reportClassInfo, setReportClassInfo] = useState(null);
  
  const [activeTab, setActiveTab] = useState('profile');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPasswordResetConfirm, setShowPasswordResetConfirm] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // Check admin access
  useEffect(() => {
    if (user?.user_role !== 'admin') {
      navigate('/unauthorized');
      return;
    }
  }, [user, navigate]);

  useEffect(() => {
    if (id) {
      fetchStudentById(id);
    }
  }, [id, fetchStudentById]);

  // Ensure school years are loaded and sync local year with global selection
  useEffect(() => {
    if (!years || years.length === 0) {
      fetchYears?.();
    }
  }, [years, fetchYears]);

  useEffect(() => {
    if (selectedYear && selectedYear !== schoolYear) {
      setSchoolYear(selectedYear);
    }
  }, [selectedYear]);

  // Fetch grades and attendance when student or school year changes
  useEffect(() => {
    const loadStudentData = async () => {
      if (!currentStudent) return;
      const effectiveYear = schoolYear || selectedYear || null;
      
      setIsLoadingData(true);
      try {
        // Fetch year-specific report card and map to grades shape used in UI
        const reportCard = await getStudentReportCard(currentStudent.id, effectiveYear);
        if (reportCard && Array.isArray(reportCard.subjects)) {
          const mappedGrades = reportCard.subjects.map((s) => ({
            subject: { subject_name: s.subject_name, subject_code: s.subject_code },
            q1_grade: s.q1_grade,
            q2_grade: s.q2_grade,
            q3_grade: s.q3_grade,
            q4_grade: s.q4_grade,
            final_grade: s.final_grade,
            remarks: s.remarks,
          }));
          setGrades(mappedGrades);
          currentStudent.grades = mappedGrades;
        } else {
          setGrades([]);
          currentStudent.grades = [];
        }
        // Capture the class info for the selected school year
        setReportClassInfo(reportCard?.class || null);
        
        // Fetch attendance for selected year
        const attendanceData = await getStudentAttendance(currentStudent.id, effectiveYear);
        if (attendanceData) {
          if (attendanceData.daily && Array.isArray(attendanceData.daily)) {
            setAttendance(attendanceData.daily);
            currentStudent.attendance = attendanceData.daily;
          } else if (attendanceData.monthly && Array.isArray(attendanceData.monthly)) {
            const convertedAttendance = [];
            attendanceData.monthly.forEach(month => {
              const startYear = effectiveYear ? parseInt(String(effectiveYear).split('-')[0], 10) : new Date().getFullYear();
              convertedAttendance.push({
                date: new Date(`${month.month} 1, ${startYear}`).toISOString(),
                status: 'Summary',
                remarks: `School Days: ${month.school_days}, Present: ${month.days_present}, Absent: ${month.days_absent}`
              });
            });
            setAttendance(convertedAttendance);
            currentStudent.attendance = convertedAttendance;
          } else {
            setAttendance([]);
            currentStudent.attendance = [];
          }
        }
      } catch (error) {
        console.error("Failed to load student data:", error);
        toast.error("Failed to load complete student information");
      } finally {
        setIsLoadingData(false);
      }
    };
    
    if (currentStudent) {
      loadStudentData();
    }
  }, [currentStudent, schoolYear, selectedYear, getStudentReportCard, getStudentAttendance]);

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMMM d, yyyy');
    } catch (error) {
      return 'Invalid Date';
    }
  };

  // Calculate age from birthdate
  const calculateAge = (birthdate) => {
    if (!birthdate) return 'N/A';
    try {
      const today = new Date();
      const birth = new Date(birthdate);
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      return age;
    } catch (error) {
      return 'N/A';
    }
  };

  // Handle student deletion
  const handleDelete = async () => {
    try {
      await deleteStudent(id);
      toast.success('Student has been deleted successfully');
      navigate('/admin/students');
    } catch (error) {
      toast.error('Failed to delete student');
    }
  };

  // Handle password reset
  const handlePasswordReset = async () => {
    if (!currentStudent) return;
    
    setIsResettingPassword(true);
    try {
      await resetStudentPassword(currentStudent.id);
      toast.success(`Password reset for ${currentStudent.first_name} ${currentStudent.last_name}. Default password: ${currentStudent.lrn}`);
      setShowPasswordResetConfirm(false);
    } catch (error) {
      toast.error('Failed to reset password');
    } finally {
      setIsResettingPassword(false);
    }
  };

  // Handle tab navigation
  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  const handleBack = () => {
    navigate('/admin/students');
  };

  if (isLoading || isLoadingData) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4 pt-20 sm:pt-24">
        <div className="animate-spin w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full"></div>
        <span className="ml-3 text-gray-600">Loading student information...</span>
      </div>
    );
  }

  if (!currentStudent) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 pt-20 sm:pt-24 w-full max-w-7xl mx-auto">
        <div className="bg-white p-8 rounded-2xl shadow-md text-center max-w-md w-full">
          <User className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-600 text-lg mb-6">Student not found or may have been removed.</p>
          <button 
            onClick={() => navigate('/admin/students')}
            className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors inline-flex items-center"
          >
            <ChevronLeft className="w-5 h-5 mr-2" />
            Back to Student Management
          </button>
        </div>
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
      {/* Header with gradient background - Admin styled */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-800 text-white p-6 rounded-2xl shadow-lg relative mb-8">
        <div className="absolute top-0 right-0 opacity-10 pointer-events-none">
          <svg width="200" height="200" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M160 0H40C17.9086 0 0 17.9086 0 40V160C0 182.091 17.9086 200 40 200H160C182.091 200 200 182.091 200 160V40C200 17.9086 182.091 0 160 0Z" fill="white"/>
          </svg>
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
          <div>
            <button 
              onClick={handleBack}
              className="flex items-center text-purple-100 hover:text-white mb-2 transition-colors"
            >
              <ChevronLeft size={20} className="mr-1" />
              <span>Back to Student Management</span>
            </button>
            <div className="flex items-center mb-2">
              <Shield className="h-6 w-6 mr-2 text-purple-200" />
              <span className="text-purple-200 text-sm font-medium">ADMIN VIEW</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold">
              {currentStudent.first_name} {currentStudent.middle_name ? `${currentStudent.middle_name} ` : ''}{currentStudent.last_name}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-purple-100 mt-1">
              <div className="flex items-center">
                <Book size={16} className="mr-1.5" />
                <span>{currentStudent.class?.grade_level || 'Grade'} - {currentStudent.class?.section || 'Section'}</span>
              </div>
              <div className="flex items-center">
                <Calendar size={16} className="mr-1.5" />
                <span>LRN: {maskStudentId(currentStudent.lrn)}</span>
              </div>
              <div className="flex items-center">
                <UserCheck size={16} className="mr-1.5" />
                <span>ID: {currentStudent.id}</span>
              </div>
            </div>
          </div>
          
          {/* Admin Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <Link
              to={`/students/edit/${id}`}
              className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-300 flex items-center shadow-md"
            >
              <Edit className="h-4 w-4 mr-1.5" />
              Edit Student
            </Link>
            <button 
              onClick={() => setShowPasswordResetConfirm(true)}
              className="bg-orange-500 bg-opacity-80 hover:bg-opacity-100 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-300 flex items-center shadow-md"
            >
              <Key className="h-4 w-4 mr-1.5" />
              Reset Password
            </button>
            <Link 
              to={`/student/${id}/report-card`}
              className="bg-green-600 bg-opacity-80 hover:bg-opacity-100 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-300 flex items-center shadow-md"
            >
              <FileEdit className="h-4 w-4 mr-1.5" />
              Report Card
            </Link>
            <button 
              onClick={() => setShowDeleteConfirm(true)}
              className="bg-red-500 bg-opacity-80 hover:bg-opacity-100 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-300 flex items-center shadow-md"
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Admin Dashboard Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-2xl shadow-md p-6 border border-purple-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm font-medium">Student Status</p>
              <h3 className="text-xl font-bold text-gray-800 mt-1">{currentStudent.status}</h3>
            </div>
            <div className={`p-3 rounded-lg ${
              currentStudent.status === 'Active' ? 'bg-green-100' : 
              currentStudent.status === 'Inactive' ? 'bg-gray-100' :
              'bg-yellow-100'
            }`}>
              <CheckCircle className={`h-6 w-6 ${
                currentStudent.status === 'Active' ? 'text-green-600' : 
                currentStudent.status === 'Inactive' ? 'text-gray-600' :
                'text-yellow-600'
              }`} />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl shadow-md p-6 border border-blue-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm font-medium">Grade Level</p>
              <h3 className="text-xl font-bold text-gray-800 mt-1">
                {currentStudent.class?.grade_level || 'Not assigned'}
              </h3>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <School className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl shadow-md p-6 border border-green-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm font-medium">Age</p>
              <h3 className="text-xl font-bold text-gray-800 mt-1">
                {calculateAge(currentStudent.birthdate)} years
              </h3>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <User className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-6 border border-amber-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm font-medium">Account Created</p>
              <h3 className="text-sm font-bold text-gray-800 mt-1">
                {formatDate(currentStudent.created_at)}
              </h3>
            </div>
            <div className="bg-amber-100 p-3 rounded-lg">
              <Calendar className="h-6 w-6 text-amber-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-2xl shadow-md overflow-hidden mb-6 border border-gray-200">
        <div className="flex border-b">
          <button
            className={`flex-1 py-4 px-4 text-center focus:outline-none transition-colors ${
              activeTab === 'profile' ? 'text-purple-600 border-b-2 border-purple-500 font-medium' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
            onClick={() => handleTabChange('profile')}
          >
            <span className="flex items-center justify-center">
              <User className="w-5 h-5 mr-2" />
              Student Profile
            </span>
          </button>
          <button
            className={`flex-1 py-4 px-4 text-center focus:outline-none transition-colors ${
              activeTab === 'academics' ? 'text-purple-600 border-b-2 border-purple-500 font-medium' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
            onClick={() => handleTabChange('academics')}
          >
            <span className="flex items-center justify-center">
              <Award className="w-5 h-5 mr-2" />
              Academic Records
            </span>
          </button>
          <button
            className={`flex-1 py-4 px-4 text-center focus:outline-none transition-colors ${
              activeTab === 'attendance' ? 'text-purple-600 border-b-2 border-purple-500 font-medium' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
            onClick={() => handleTabChange('attendance')}
          >
            <span className="flex items-center justify-center">
              <Calendar className="w-5 h-5 mr-2" />
              Attendance
            </span>
          </button>
          <button
            className={`flex-1 py-4 px-4 text-center focus:outline-none transition-colors ${
              activeTab === 'admin' ? 'text-purple-600 border-b-2 border-purple-500 font-medium' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
            onClick={() => handleTabChange('admin')}
          >
            <span className="flex items-center justify-center">
              <Shield className="w-5 h-5 mr-2" />
              Admin Settings
            </span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center mb-4">
                <User className="h-5 w-5 text-purple-600 mr-2" />
                <h2 className="text-xl font-bold text-gray-800">Personal Information</h2>
              </div>
              <div className="h-1 w-full bg-gradient-to-r from-purple-500 to-purple-300 rounded-full mb-6"></div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Full Name</p>
                  <p className="font-medium">
                    {currentStudent.first_name} {currentStudent.middle_name ? `${currentStudent.middle_name} ` : ''}{currentStudent.last_name}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">LRN</p>
                  <p className="font-medium">{maskStudentId(currentStudent.lrn)}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Age</p>
                  <p className="font-medium">{calculateAge(currentStudent.birthdate)} years</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Gender</p>
                  <p className="font-medium">{currentStudent.sex}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Birthdate</p>
                  <p className="font-medium">{formatDate(currentStudent.birthdate)}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Status</p>
                  <p className="font-medium flex items-center">
                    {currentStudent.status}
                    <span className={`ml-2 inline-block w-2.5 h-2.5 rounded-full ${
                      currentStudent.status === 'Active' ? 'bg-green-500' : 
                      currentStudent.status === 'Inactive' ? 'bg-gray-500' :
                      'bg-yellow-500'
                    }`}></span>
                  </p>
                </div>
              </div>

              <div className="flex items-center mb-4">
                <Phone className="h-5 w-5 text-purple-600 mr-2" />
                <h2 className="text-xl font-bold text-gray-800">Contact Information</h2>
              </div>
              <div className="h-1 w-full bg-gradient-to-r from-purple-500 to-purple-300 rounded-full mb-6"></div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg flex items-start">
                  <Phone className="w-5 h-5 mr-3 text-purple-500 mt-1" />
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Contact Number</p>
                    <p className="font-medium">{currentStudent.contact_number || 'Not provided'}</p>
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg flex items-start">
                  <Mail className="w-5 h-5 mr-3 text-purple-500 mt-1" />
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Email Address</p>
                    <p className="font-medium">{currentStudent.email || `${maskStudentId(currentStudent.lrn)}@gmail.com`}</p>
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg md:col-span-2 flex items-start">
                  <MapPin className="w-5 h-5 mr-3 text-purple-500 mt-1" />
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Address</p>
                    <p className="font-medium">{currentStudent.address || 'Not provided'}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Academic Tab - Same as original but with purple theme */}
          {activeTab === 'academics' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center">
                  <Award className="h-5 w-5 text-purple-600 mr-2" />
                  <h2 className="text-xl font-bold text-gray-800">Academic Records</h2>
                </div>
                <div className="flex items-center gap-3">
                  <div className="hidden sm:flex items-center gap-2">
                    <span className="text-sm text-gray-600">School Year</span>
                    <select
                      value={schoolYear || selectedYear || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSchoolYear(val);
                        selectYear?.(val);
                      }}
                      className="border border-gray-300 rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    >
                      {(years && years.length > 0
                        ? years.map((y) => y.name)
                        : (() => {
                            const base = new Date().getFullYear();
                            return Array.from({ length: 5 }, (_, i) => `${base - 2 + i}-${base - 1 + i}`);
                          })()
                      ).map((name) => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                  </div>
                  <Link 
                    to={`/student/${id}/report-card`}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg text-sm flex items-center transition-colors"
                  >
                    <Eye className="w-4 h-4 mr-1.5" />
                    View Full Report Card
                  </Link>
                </div>
              </div>
              <div className="h-1 w-full bg-gradient-to-r from-purple-500 to-purple-300 rounded-full mb-6"></div>
              
              {/* Class Information */}
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center">
                    <Book className="w-5 h-5 mr-2 text-purple-500" />
                    <div>
                      <p className="text-xs text-gray-500">Class</p>
                      <p className="font-medium">
                        {(reportClassInfo?.grade_level || currentStudent.class?.grade_level) || 'N/A'}
                        {` - `}
                        {(reportClassInfo?.section || currentStudent.class?.section) || 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="w-5 h-5 mr-2 text-purple-500" />
                    <div>
                      <p className="text-xs text-gray-500">School Year</p>
                      <p className="font-medium">{schoolYear || selectedYear || ''}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Academic Performance Summary */}
              {currentStudent.grades && currentStudent.grades.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-md font-medium mb-3 text-gray-700">Academic Performance</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Average Grade Card */}
                    <div className="bg-purple-50 rounded-lg p-4 border border-purple-100 flex flex-col items-center">
                      <div className="text-purple-600 font-bold text-2xl mb-1">
                        {(() => {
                          const validGrades = currentStudent.grades
                            .filter(g => g.final_grade)
                            .map(g => parseFloat(g.final_grade));
                          
                          if (validGrades.length === 0) return "N/A";
                          
                          const avg = validGrades.reduce((sum, grade) => sum + grade, 0) / validGrades.length;
                          return avg.toFixed(1);
                        })()}
                      </div>
                      <p className="text-gray-600 text-sm text-center">General Average</p>
                    </div>
                    
                    {/* Highest Subject Card */}
                    <div className="bg-green-50 rounded-lg p-4 border border-green-100 flex flex-col items-center">
                      <div className="text-green-600 font-bold text-lg mb-1 text-center">
                        {(() => {
                          const validGrades = currentStudent.grades.filter(g => g.final_grade);
                          if (validGrades.length === 0) return "N/A";
                          
                          const highest = validGrades.reduce((prev, current) => 
                            (parseFloat(prev.final_grade) > parseFloat(current.final_grade)) ? prev : current
                          );
                          
                          return highest.subject?.subject_name || 'Subject';
                        })()}
                      </div>
                      <p className="text-gray-600 text-sm text-center">Highest Subject</p>
                    </div>
                    
                    {/* Subject Count Card */}
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-100 flex flex-col items-center">
                      <div className="text-blue-600 font-bold text-2xl mb-1">
                        {currentStudent.grades.length}
                      </div>
                      <p className="text-gray-600 text-sm text-center">Total Subjects</p>
                    </div>
                    
                    {/* Pass/Fail Card */}
                    <div className="bg-amber-50 rounded-lg p-4 border border-amber-100 flex flex-col items-center">
                      <div className="text-amber-600 font-bold text-lg mb-1">
                        {(() => {
                          const validGrades = currentStudent.grades.filter(g => g.final_grade);
                          if (validGrades.length === 0) return "N/A";
                          
                          const passed = validGrades.filter(g => parseFloat(g.final_grade) >= 75).length;
                          return `${passed}/${validGrades.length} Passed`;
                        })()}
                      </div>
                      <p className="text-gray-600 text-sm text-center">Passing Rate</p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Grades Summary */}
              <h3 className="text-md font-medium mb-3 text-gray-700">Recent Grades Summary</h3>
              {currentStudent.grades && currentStudent.grades.length > 0 ? (
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="min-w-full border-collapse">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="py-2 px-4 border text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                        <th className="py-2 px-4 border text-center text-xs font-medium text-gray-500 uppercase">1st Quarter</th>
                        <th className="py-2 px-4 border text-center text-xs font-medium text-gray-500 uppercase">2nd Quarter</th>
                        <th className="py-2 px-4 border text-center text-xs font-medium text-gray-500 uppercase">3rd Quarter</th>
                        <th className="py-2 px-4 border text-center text-xs font-medium text-gray-500 uppercase">4th Quarter</th>
                        <th className="py-2 px-4 border text-center text-xs font-medium text-gray-500 uppercase">Final</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {currentStudent.grades.map((grade, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="py-2 px-4 border">
                            <div className="font-medium">{grade.subject?.subject_name || 'Unknown Subject'}</div>
                          </td>
                          <td className="py-2 px-4 border text-center">
                            <GradeCell value={grade.q1_grade} />
                          </td>
                          <td className="py-2 px-4 border text-center">
                            <GradeCell value={grade.q2_grade} />
                          </td>
                          <td className="py-2 px-4 border text-center">
                            <GradeCell value={grade.q3_grade} />
                          </td>
                          <td className="py-2 px-4 border text-center">
                            <GradeCell value={grade.q4_grade} />
                          </td>
                          <td className="py-2 px-4 border text-center font-medium">
                            <GradeCell value={grade.final_grade} isFinal={true} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 border rounded-lg bg-gray-50">
                  <Award className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                  <p className="text-gray-500">No grades recorded yet.</p>
                </div>
              )}
            </motion.div>
          )}

          {/* Attendance Tab - Same as original but with purple theme */}
          {activeTab === 'attendance' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <Calendar className="h-5 w-5 text-purple-600 mr-2" />
                  <h2 className="text-xl font-bold text-gray-800">Attendance Records</h2>
                </div>
                <div className="flex items-center gap-3">
                  <div className="hidden sm:flex items-center gap-2">
                    <span className="text-sm text-gray-600">School Year</span>
                    <select
                      value={schoolYear || selectedYear || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSchoolYear(val);
                        selectYear?.(val);
                      }}
                      className="border border-gray-300 rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    >
                      {(years && years.length > 0
                        ? years.map((y) => y.name)
                        : (() => {
                            const base = new Date().getFullYear();
                            return Array.from({ length: 5 }, (_, i) => `${base - 2 + i}-${base - 1 + i}`);
                          })()
                      ).map((name) => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                  </div>
                  <Link 
                    to={`/student/${id}/attendance`}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg text-sm flex items-center transition-colors"
                  >
                    <Eye className="w-4 h-4 mr-1.5" />
                    Manage Attendance
                  </Link>
                </div>
              </div>
              <div className="h-1 w-full bg-gradient-to-r from-purple-500 to-purple-300 rounded-full mb-6"></div>
              
              {currentStudent.attendance && currentStudent.attendance.length > 0 ? (
                <>
                  {/* Attendance Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
                      <p className="text-sm text-gray-500 mb-1">School Days</p>
                      <div className="text-purple-600 font-bold text-2xl flex items-center">
                        <Calendar className="w-5 h-5 mr-2 text-purple-500" />
                        {currentStudent.attendance.reduce((total, record) => {
                          if (record.status === 'Summary') {
                            const match = record.remarks.match(/School Days: (\d+)/);
                            return total + (match ? parseInt(match[1]) : 0);
                          }
                          return total;
                        }, 0)}
                      </div>
                    </div>
                    
                    <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                      <p className="text-sm text-gray-500 mb-1">Present</p>
                      <div className="text-green-600 font-bold text-2xl flex items-center">
                        <CheckCircle className="w-5 h-5 mr-2 text-green-500" />
                        {currentStudent.attendance.reduce((total, record) => {
                          if (record.status === 'Summary') {
                            const match = record.remarks.match(/Present: (\d+)/);
                            return total + (match ? parseInt(match[1]) : 0);
                          }
                          return total;
                        }, 0)}
                      </div>
                    </div>
                    
                    <div className="bg-red-50 rounded-lg p-4 border border-red-100">
                      <p className="text-sm text-gray-500 mb-1">Absent</p>
                      <div className="text-red-600 font-bold text-2xl flex items-center">
                        <X className="w-5 h-5 mr-2 text-red-500" />
                        {currentStudent.attendance.reduce((total, record) => {
                          if (record.status === 'Summary') {
                            const match = record.remarks.match(/Absent: (\d+)/);
                            return total + (match ? parseInt(match[1]) : 0);
                          }
                          return total;
                        }, 0)}
                      </div>
                    </div>
                  </div>
                  
                  {/* Monthly Summary Table */}
                  <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="min-w-full border-collapse">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="py-3 px-4 border text-left text-xs font-medium text-gray-500 uppercase">Month</th>
                          <th className="py-3 px-4 border text-center text-xs font-medium text-gray-500 uppercase">School Days</th>
                          <th className="py-3 px-4 border text-center text-xs font-medium text-gray-500 uppercase">Present</th>
                          <th className="py-3 px-4 border text-center text-xs font-medium text-gray-500 uppercase">Absent</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {Array.from(
                          currentStudent.attendance.reduce((acc, record) => {
                            if (record.status === 'Summary') {
                              const match = record.remarks.match(/School Days: (\d+), Present: (\d+), Absent: (\d+)/);
                              if (match) {
                                const [, schoolDays, present, absent] = match;
                                const month = new Date(record.date).toLocaleDateString('en-US', { month: 'long' });
                                acc.set(month, { 
                                  schoolDays: parseInt(schoolDays), 
                                  present: parseInt(present), 
                                  absent: parseInt(absent) 
                                });
                              }
                            }
                            return acc;
                          }, new Map()),
                          ([month, data]) => (
                            <tr key={month}>
                              <td className="py-3 px-4 border font-medium">{month}</td>
                              <td className="py-3 px-4 border text-center">{data.schoolDays}</td>
                              <td className="py-3 px-4 border text-center">
                                <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                                  {data.present}
                                </span>
                              </td>
                              <td className="py-3 px-4 border text-center">
                                <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs">
                                  {data.absent}
                                </span>
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="text-center py-12 border rounded-lg bg-gray-50">
                  <Calendar className="w-16 h-16 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500 text-lg mb-1">No attendance records available.</p>
                  <p className="text-gray-400 text-sm">Records will appear here once attendance is taken.</p>
                </div>
              )}
            </motion.div>
          )}

          {/* Admin Settings Tab */}
          {activeTab === 'admin' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center mb-4">
                <Shield className="h-5 w-5 text-purple-600 mr-2" />
                <h2 className="text-xl font-bold text-gray-800">Administrative Settings</h2>
              </div>
              <div className="h-1 w-full bg-gradient-to-r from-purple-500 to-purple-300 rounded-full mb-6"></div>
              
              {/* Account Information */}
              <div className="bg-purple-50 p-6 rounded-lg mb-6 border border-purple-100">
                <h3 className="text-lg font-semibold mb-4 text-purple-800">Account Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1">Student ID</p>
                    <p className="font-medium">{currentStudent.id}</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1">Account Created</p>
                    <p className="font-medium">{formatDate(currentStudent.created_at)}</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1">Last Updated</p>
                    <p className="font-medium">{formatDate(currentStudent.updated_at)}</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1">Login Credentials</p>
                    <p className="font-medium">LRN: {maskStudentId(currentStudent.lrn)}</p>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-gray-50 p-6 rounded-lg mb-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-800">Quick Administrative Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Link
                    to={`/students/edit/${id}`}
                    className="bg-white p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200 flex items-center"
                  >
                    <Edit className="h-8 w-8 text-blue-600 mr-3" />
                    <div>
                      <p className="font-medium text-gray-800">Edit Profile</p>
                      <p className="text-sm text-gray-500">Update student information</p>
                    </div>
                  </Link>

                  <button
                    onClick={() => setShowPasswordResetConfirm(true)}
                    className="bg-white p-4 rounded-lg border border-gray-200 hover:border-orange-300 hover:shadow-md transition-all duration-200 flex items-center text-left"
                  >
                    <Key className="h-8 w-8 text-orange-600 mr-3" />
                    <div>
                      <p className="font-medium text-gray-800">Reset Password</p>
                      <p className="text-sm text-gray-500">Reset to default (LRN)</p>
                    </div>
                  </button>

                  <Link
                    to={`/student/${id}/report-card`}
                    className="bg-white p-4 rounded-lg border border-gray-200 hover:border-green-300 hover:shadow-md transition-all duration-200 flex items-center"
                  >
                    <FileEdit className="h-8 w-8 text-green-600 mr-3" />
                    <div>
                      <p className="font-medium text-gray-800">Report Card</p>
                      <p className="text-sm text-gray-500">View/edit grades</p>
                    </div>
                  </Link>

                  <Link
                    to={`/student/${id}/attendance`}
                    className="bg-white p-4 rounded-lg border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all duration-200 flex items-center"
                  >
                    <Calendar className="h-8 w-8 text-purple-600 mr-3" />
                    <div>
                      <p className="font-medium text-gray-800">Attendance</p>
                      <p className="text-sm text-gray-500">Manage attendance records</p>
                    </div>
                  </Link>

                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="bg-white p-4 rounded-lg border border-gray-200 hover:border-red-300 hover:shadow-md transition-all duration-200 flex items-center text-left"
                  >
                    <Trash2 className="h-8 w-8 text-red-600 mr-3" />
                    <div>
                      <p className="font-medium text-gray-800">Delete Student</p>
                      <p className="text-sm text-gray-500">Permanently remove</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Security Information */}
              <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200">
                <div className="flex items-start">
                  <AlertTriangle className="h-6 w-6 text-yellow-600 mr-3 mt-0.5" />
                  <div>
                    <h3 className="text-lg font-semibold text-yellow-800 mb-2">Security Notice</h3>
                    <ul className="text-sm text-yellow-700 space-y-1">
                      <li>• Student login credentials are based on their LRN</li>
                      <li>• Password resets will set the password to the student's LRN</li>
                      <li>• Students are required to change their password on first login</li>
                      <li>• All administrative actions are logged for security purposes</li>
                    </ul>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        >
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"
          >
            <div className="text-center mb-4">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
                <Trash2 className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Student</h3>
              <p className="text-gray-600">
                Are you sure you want to delete this student? This action cannot be undone and will remove all associated data.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleDelete}
                className="px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center"
              >
                <Trash2 className="h-5 w-5 mr-2" />
                Delete Student
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Password Reset Confirmation Modal */}
      {showPasswordResetConfirm && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        >
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"
          >
            <div className="text-center mb-4">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-orange-100 mb-4">
                <Key className="h-8 w-8 text-orange-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Reset Student Password</h3>
              <p className="text-gray-600 mb-4">
                Are you sure you want to reset the password for{' '}
                <span className="font-semibold">
                  {currentStudent?.first_name} {currentStudent?.last_name}
                </span>?
              </p>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-left">
                <div className="flex items-start">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-semibold mb-1">Warning:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Password will be reset to: <code className="bg-yellow-100 px-1 rounded">{currentStudent?.lrn}</code></li>
                      <li>Student must change password on next login</li>
                      <li>This action cannot be undone</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowPasswordResetConfirm(false)}
                className="px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                disabled={isResettingPassword}
              >
                Cancel
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handlePasswordReset}
                className="px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center"
                disabled={isResettingPassword}
              >
                {isResettingPassword ? (
                  <>
                    <Loader className="h-5 w-5 mr-2 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  <>
                    <Key className="h-5 w-5 mr-2" />
                    Reset Password
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default AdminStudentProfilePage;