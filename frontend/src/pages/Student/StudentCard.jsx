import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useGradeStore } from "../../store/gradeStore";
import { useAuthStore } from "../../store/authStore";
import { useStudentStore } from "../../store/studentStore";
import { useAttendanceStore } from "../../store/attendanceStore";
import { useSchoolYearStore } from "../../store/schoolYearStore";
import toast from "react-hot-toast";
import { ChevronLeft, User, Calendar, GraduationCap, FileText, Heart, Users, Leaf, Flag, Printer } from "lucide-react";

const StudentCard = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { getStudentCard, isLoading, error } = useGradeStore();
  const { fetchStudentByUserId } = useStudentStore();
  const { getStudentAttendance, isLoading: attendanceLoading } = useAttendanceStore();
  
  const [student, setStudent] = useState(null);
  const [reportCard, setReportCard] = useState(null);
  const [schoolYear, setSchoolYear] = useState(`${new Date().getFullYear()}-${new Date().getFullYear() + 1}`);
  const selectedYear = useSchoolYearStore((s) => s.selected);
  const years = useSchoolYearStore((s) => s.years);
  const fetchYears = useSchoolYearStore((s) => s.fetchYears);
  const selectYear = useSchoolYearStore((s) => s.selectYear);
  const [attendanceData, setAttendanceData] = useState({
    schoolDays: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    presentDays: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    absentDays: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  });

  const MONTHS = [
    "June", "July", "August", "September", "October", "November",
    "December", "January", "February", "March", "Total"
  ];

  // Load student data
  useEffect(() => {
    const loadStudentData = async () => {
      try {
        if (user?.id) {
          const studentData = await fetchStudentByUserId(user.id);
          setStudent(studentData);
        }
      } catch (error) {
        console.error("Failed to load student data:", error);
        toast.error("Failed to load student information");
      }
    };
    
    if (user?.id) {
      loadStudentData();
    }
  }, [user?.id, fetchStudentByUserId]);

  // Load attendance data
  useEffect(() => {
    const loadAttendanceData = async () => {
      if (!student) return;
      
      try {
        const data = await getStudentAttendance(student.id, schoolYear);
        
        if (data && data.monthly && data.monthly.length > 0) {
          const tempSchoolDays = Array(12).fill(0);
          const tempPresentDays = Array(12).fill(0);
          const tempAbsentDays = Array(12).fill(0);
          
          const monthIndexMap = {
            'June': 0, 'July': 1, 'August': 2, 'September': 3, 
            'October': 4, 'November': 5, 'December': 6, 'January': 7,
            'February': 8, 'March': 9
          };
          
          data.monthly.forEach(monthData => {
            const index = monthIndexMap[monthData.month];
            if (index !== undefined) {
              tempSchoolDays[index] = monthData.school_days || 0;
              tempPresentDays[index] = monthData.days_present || 0;
              tempAbsentDays[index] = monthData.days_absent || 0;
            }
          });
          
          tempSchoolDays[10] = tempSchoolDays.slice(0, 10).reduce((sum, days) => sum + days, 0);
          tempPresentDays[10] = tempPresentDays.slice(0, 10).reduce((sum, days) => sum + days, 0);
          tempAbsentDays[10] = tempAbsentDays.slice(0, 10).reduce((sum, days) => sum + days, 0);
          
          setAttendanceData({
            schoolDays: tempSchoolDays,
            presentDays: tempPresentDays,
            absentDays: tempAbsentDays
          });
        }
      } catch (error) {
        console.error("Failed to load attendance data:", error);
      }
    };
    
    if (student) {
      loadAttendanceData();
    }
  }, [student, schoolYear, getStudentAttendance]);

  // Load report card
  useEffect(() => {
    const loadReportCard = async () => {
      if (!student) return;
      
      try {
        const reportCardData = await getStudentCard(student.id, schoolYear);
        setReportCard(reportCardData);
      } catch (error) {
        console.error("Failed to load report card:", error);
        toast.error("Failed to load report card");
      }
    };
    
    if (student) {
      loadReportCard();
    }
  }, [student, schoolYear, getStudentCard]);

  // Ensure school years loaded and sync with global selection
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

  const handleBack = () => {
    navigate('/student-dashboard');
  };


  // Format grade helper
  const formatGrade = (grade) => {
    if (!grade) return '';
    const numericGrade = parseFloat(grade);
    return isNaN(numericGrade) ? '' : Math.round(numericGrade).toString();
  };

  // Get remarks based on grade
  const getRemarks = (grade) => {
    const numericGrade = parseFloat(grade);
    return isNaN(numericGrade) ? '' : (numericGrade >= 75 ? "Passed" : "Failed");
  };

  // Core values data with default empty ratings
  const coreValues = [
    {
      name: "Maka-Diyos",
      icon: <Heart className="text-purple-600" size={24} />,
      color: "purple",
      behaviors: [
        "Expresses one's spiritual beliefs while respecting the spiritual beliefs of others.",
        "Shows adherence to ethical principles by upholding truth"
      ],
      ratings: ["", "", "", ""] // Q1, Q2, Q3, Q4
    },
    {
      name: "Makatao",
      icon: <Users className="text-blue-600" size={24} />,
      color: "blue",
      behaviors: [
        "Is sensitive to individual, social, and cultural differences",
        "Demonstrates contributions toward solidarity"
      ],
      ratings: ["", "", "", ""]
    },
    {
      name: "Makakalikasan",
      icon: <Leaf className="text-green-600" size={24} />,
      color: "green",
      behaviors: [
        "Cares for the environment and utilizes resources wisely, judiciously, and economically"
      ],
      ratings: ["", "", "", ""]
    },
    {
      name: "Makabansa",
      icon: <Flag className="text-red-600" size={24} />,
      color: "red",
      behaviors: [
        "Demonstrates pride in being a Filipino; exercises the rights and responsibilities of a Filipino citizen",
        "Demonstrates appropriate behavior in carrying out activities in the school, community, and country"
      ],
      ratings: ["", "", "", ""]
    }
  ];

  if (isLoading || attendanceLoading || !student) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const subjectData = reportCard?.subjects || [];
  const generalAverage = reportCard?.quarterlyAverages?.final_average || null;

  const computeQuarterlyAverages = () => {
    const keys = ['q1_grade', 'q2_grade', 'q3_grade', 'q4_grade'];
    return keys.map((key) => {
      let sum = 0;
      let count = 0;
      subjectData.forEach((subj) => {
        const val = parseFloat(subj[key]);
        if (!isNaN(val)) {
          sum += val;
          count += 1;
        }
      });
      return count > 0 ? sum / count : null;
    });
  };

  const quarterlyAverages = computeQuarterlyAverages();

  return (
    <div className="min-h-screen bg-gray-50 p-4 print:p-0 print:bg-white">
      {/* Header Controls - Hidden when printing */}
      <div className="max-w-7xl mx-auto mb-6 print:hidden">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white rounded-lg shadow-sm p-4">
          <button 
            onClick={handleBack} 
            className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
          >
            <ChevronLeft size={20} />
            <span>Back to Dashboard</span>
          </button>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <select
              value={schoolYear}
              onChange={(e) => {
                const val = e.target.value;
                setSchoolYear(val);
                selectYear?.(val);
              }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {(years && years.length > 0
                ? years.map((y) => y.name)
                : (() => {
                    const base = new Date().getFullYear();
                    return Array.from({ length: 5 }, (_, i) => `${base - 2 + i}-${base - 1 + i}`);
                  })()
              ).map((name) => (
                <option key={name} value={name}>
                  SY: {name}
                </option>
              ))}
            </select>

            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm transition-colors"
            >
              <Printer size={16} />
              Print
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto space-y-6 print:space-y-4">
        {/* School Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-lg shadow-lg p-6 print:bg-blue-800 print:rounded-none">
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2 mb-4">
              <GraduationCap size={32} />
              <div>
                <h1 className="text-xl sm:text-2xl font-bold">Tapinac Elementary School</h1>
                <p className="text-blue-100 text-sm">Schools Division Office of Olongapo City</p>
              </div>
            </div>
            <h2 className="text-lg sm:text-xl font-semibold">LEARNER'S PROGRESS REPORT CARD</h2>
            <p className="text-blue-100">School Year {schoolYear}</p>
          </div>
        </div>

        {/* Student Information */}
        <div className="bg-white rounded-lg shadow-sm p-6 print:shadow-none print:border print:border-gray-300">
          <div className="flex items-center gap-3 mb-4">
            <User className="text-blue-600" size={24} />
            <h3 className="text-lg font-semibold text-gray-800">Student Information</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">LRN</label>
              <p className="text-lg font-semibold text-gray-800">{student?.lrn || reportCard?.student?.lrn || "-"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Full Name</label>
              <p className="text-lg font-semibold text-gray-800">
                {reportCard?.student?.last_name}, {reportCard?.student?.first_name} {reportCard?.student?.middle_name}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Date of Birth</label>
              <p className="text-lg font-semibold text-gray-800">{reportCard?.student?.birthdate || "-"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Age</label>
              <p className="text-lg font-semibold text-gray-800">{reportCard?.student?.age || "-"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Grade</label>
              <p className="text-lg font-semibold text-gray-800">{reportCard?.class?.grade_level || "-"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Section</label>
              <p className="text-lg font-semibold text-gray-800">{reportCard?.class?.section || "-"}</p>
            </div>
          </div>
        </div>

        {/* Combined Report Card */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 print:grid-cols-1">
          {/* Grades Section */}
          <div className="bg-white rounded-lg shadow-sm p-6 print:shadow-none print:border print:border-gray-300">
            <div className="flex items-center gap-3 mb-6">
              <FileText className="text-green-600" size={24} />
              <h3 className="text-lg font-semibold text-gray-800">Learning Progress and Achievement</h3>
            </div>

            {/* Desktop Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-3 px-2 font-semibold text-gray-700">Learning Areas</th>
                    <th className="text-center py-3 px-2 font-semibold text-gray-700">Q1</th>
                    <th className="text-center py-3 px-2 font-semibold text-gray-700">Q2</th>
                    <th className="text-center py-3 px-2 font-semibold text-gray-700">Q3</th>
                    <th className="text-center py-3 px-2 font-semibold text-gray-700">Q4</th>
                    <th className="text-center py-3 px-2 font-semibold text-gray-700">Final</th>
                    <th className="text-center py-3 px-2 font-semibold text-gray-700">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {subjectData.map((subject, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 print:hover:bg-white">
                      <td className="py-3 px-2 font-medium text-gray-800">{subject.subject_name}</td>
                      <td className="text-center py-3 px-2">{formatGrade(subject.q1_grade) || '-'}</td>
                      <td className="text-center py-3 px-2">{formatGrade(subject.q2_grade) || '-'}</td>
                      <td className="text-center py-3 px-2">{formatGrade(subject.q3_grade) || '-'}</td>
                      <td className="text-center py-3 px-2">{formatGrade(subject.q4_grade) || '-'}</td>
                      <td className="text-center py-3 px-2 font-semibold">{formatGrade(subject.final_grade) || '-'}</td>
                      <td className="text-center py-3 px-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          subject.final_grade >= 75 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        } print:bg-transparent print:border print:border-gray-400`}>
                          {subject.final_grade ? getRemarks(subject.final_grade) : '-'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {(generalAverage || quarterlyAverages.some(Boolean)) && (
                    <tr className="border-t-2 border-gray-200 bg-blue-50 print:bg-gray-100">
                      <td className="py-3 px-2 font-bold text-gray-800">General Average</td>
                      <td className="text-center py-3 px-2">{formatGrade(quarterlyAverages[0]) || '-'}</td>
                      <td className="text-center py-3 px-2">{formatGrade(quarterlyAverages[1]) || '-'}</td>
                      <td className="text-center py-3 px-2">{formatGrade(quarterlyAverages[2]) || '-'}</td>
                      <td className="text-center py-3 px-2">{formatGrade(quarterlyAverages[3]) || '-'}</td>
                      <td className="text-center py-3 px-2 font-bold text-lg">{formatGrade(generalAverage)}</td>
                      <td className="text-center py-3 px-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          generalAverage >= 75 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        } print:bg-transparent print:border print:border-gray-400`}>
                          {getRemarks(generalAverage)}
                        </span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Grading Scale */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg print:bg-gray-100">
              <h4 className="font-semibold text-gray-800 mb-3">Grading Scale</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-sm">
                <div className="flex justify-between">
                  <span>Outstanding:</span>
                  <span className="font-medium">90-100</span>
                </div>
                <div className="flex justify-between">
                  <span>Very Satisfactory:</span>
                  <span className="font-medium">85-89</span>
                </div>
                <div className="flex justify-between">
                  <span>Satisfactory:</span>
                  <span className="font-medium">80-84</span>
                </div>
                <div className="flex justify-between">
                  <span>Fairly Satisfactory:</span>
                  <span className="font-medium">75-79</span>
                </div>
              </div>
            </div>
          </div>

          {/* Attendance Section */}
          <div className="bg-white rounded-lg shadow-sm p-6 print:shadow-none print:border print:border-gray-300">
            <div className="flex items-center gap-3 mb-6">
              <Calendar className="text-orange-600" size={24} />
              <h3 className="text-lg font-semibold text-gray-800">Report on Attendance</h3>
            </div>

            {/* Attendance Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-2 px-1 font-semibold text-gray-700">Month</th>
                    {MONTHS.map((month, index) => (
                      <th key={index} className="text-center py-2 px-1 font-semibold text-gray-700">
                        <div className="transform -rotate-45 h-12 flex items-center justify-center">
                          <span className="text-xs">{month.slice(0, 3)}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-100">
                    <td className="py-2 px-1 font-medium text-gray-800">School Days</td>
                    {attendanceData.schoolDays.map((days, index) => (
                      <td key={index} className="text-center py-2 px-1">{days > 0 ? days : '-'}</td>
                    ))}
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-2 px-1 font-medium text-gray-800">Present</td>
                    {attendanceData.presentDays.map((days, index) => (
                      <td key={index} className="text-center py-2 px-1 text-green-600">{days > 0 ? days : '-'}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2 px-1 font-medium text-gray-800">Absent</td>
                    {attendanceData.absentDays.map((days, index) => (
                      <td key={index} className="text-center py-2 px-1 text-red-600">{days > 0 ? days : '-'}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

     
         
            </div>
          </div>

  );
}

export default StudentCard;