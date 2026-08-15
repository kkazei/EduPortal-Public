import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useStudentStore } from "../../store/studentStore";
import { useAttendanceStore } from "../../store/attendanceStore";
import toast from "react-hot-toast";
import { 
  ChevronLeft, 
  Save, 
  AlertCircle, 
  Calendar, 
  CheckCircle, 
  XCircle,
  CheckCircle2
} from "lucide-react";

// IMPORTANT: Move months outside component
// This prevents the array from being recreated on every render
const MONTHS = [
  "June", "July", "August", "September", "October", "November",
  "December", "January", "February", "March"
];

const StudentAttendancePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { fetchStudentById } = useStudentStore();
  const { 
    getStudentAttendance, 
    bulkUpdateAttendance,
    isLoading, 
    error 
  } = useAttendanceStore();
  
  const [student, setStudent] = useState(null);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [schoolYear, setSchoolYear] = useState(`${new Date().getFullYear()}-${new Date().getFullYear() + 1}`);
  const [attendanceData, setAttendanceData] = useState(null);
  const [monthlyAttendance, setMonthlyAttendance] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  
  // No more months array here - use MONTHS instead

  // Load the student data - this is fine
  useEffect(() => {
    const loadStudentData = async () => {
      try {
        if (id) {
          const studentData = await fetchStudentById(id);
          setStudent(studentData);
        }
      } catch (error) {
        console.error("Failed to load student data:", error);
        toast.error("Failed to load student information");
      }
    };
    
    if (id) {
      loadStudentData();
    }
  }, [id, fetchStudentById]);

  // Fix the loadAttendance effect - don't include MONTHS in dependencies
  useEffect(() => {
    const loadAttendance = async () => {
      if (!student) return;
      
      setLoadingAttendance(true);
      try {
        const data = await getStudentAttendance(student.id, schoolYear);
        setAttendanceData(data);
        
        // Initialize monthly attendance from the fetched data
        const initialMonthlyData = {};
        if (data && data.monthly) {
          data.monthly.forEach(month => {
            initialMonthlyData[month.month] = {
              school_days: month.school_days || 0,
              days_present: month.days_present || 0,
              days_absent: month.days_absent || 0
            };
          });
        }
        
        // Initialize any missing months with zeros
        MONTHS.forEach(month => {
          if (!initialMonthlyData[month]) {
            initialMonthlyData[month] = {
              school_days: 0,
              days_present: 0,
              days_absent: 0
            };
          }
        });
        
        setMonthlyAttendance(initialMonthlyData);
      } catch (error) {
        console.error("Failed to fetch attendance:", error);
        
        // Create empty attendance data for all months when API fails
        const emptyAttendanceData = {};
        MONTHS.forEach(month => {
          emptyAttendanceData[month] = {
            school_days: 0,
            days_present: 0,
            days_absent: 0
          };
        });
        setMonthlyAttendance(emptyAttendanceData);
        
        // Show more detailed error message based on response
        if (error.response && error.response.status === 500) {
          toast.error("Server error: The attendance system might need configuration. You can still create new attendance records.");
        } else {
          toast.error("Could not load attendance data. Starting with empty records.");
        }
      } finally {
        setLoadingAttendance(false);
      }
    };
    
    if (student) {
      loadAttendance();
    }
  }, [student, schoolYear, getStudentAttendance]); // Remove months from dependencies

  // Handle form input changes
  const handleAttendanceChange = (month, field, value) => {
    const numericValue = parseInt(value, 10) || 0;
    
    setMonthlyAttendance(prev => {
      const updatedMonth = { ...prev[month] };
      
      // Update the specified field
      updatedMonth[field] = numericValue;
      
      // Automatically adjust absent days when school days or present days change
      if (field === 'school_days') {
        updatedMonth.days_absent = Math.max(0, numericValue - updatedMonth.days_present);
      } else if (field === 'days_present') {
        updatedMonth.days_absent = Math.max(0, updatedMonth.school_days - numericValue);
      } else if (field === 'days_absent') {
        updatedMonth.days_present = Math.max(0, updatedMonth.school_days - numericValue);
      }
      
      return { ...prev, [month]: updatedMonth };
    });
  };

  // Save all attendance records
  const handleSaveAllAttendance = async () => {
    if (!student || isSaving) return;
    
    setIsSaving(true);
    try {
      // Format data for bulk update
      const attendanceEntries = Object.entries(monthlyAttendance).map(([month, data]) => ({
        month,
        school_days: data.school_days,
        days_present: data.days_present,
        days_absent: data.days_absent
      }));
      
      const payload = {
        entries: attendanceEntries,
        school_year: schoolYear
      };
      
      // Add class_id fallback in case student.class_id is undefined
      const classId = student.class_id || (student.class && student.class.id);
      
      if (!classId) {
        toast.error("Missing class information. Please make sure this student is assigned to a class.");
        return;
      }
      
      await bulkUpdateAttendance(student.id, classId, payload);
      
      toast.success("Attendance records updated successfully!");
    } catch (error) {
      console.error("Failed to update attendance:", error);
      
      // Provide more specific error messages based on the response
      if (error.response) {
        switch (error.response.status) {
          case 400:
            toast.error("Invalid attendance data. Please check your inputs.");
            break;
          case 404:
            toast.error("Student or class not found. Please refresh the page.");
            break;
          case 500:
            toast.error("Server error. The database might need to be initialized for attendance records.");
            break;
          default:
            toast.error(`Failed to save attendance data (${error.response.status})`);
        }
      } else if (error.request) {
        toast.error("Network error. Please check your connection.");
      } else {
        toast.error("Failed to save attendance data");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSingleMonthUpdate = async (month) => {
    if (!student || isSaving) return;
    
    const monthData = monthlyAttendance[month];
    if (!monthData) return;
    
    // Don't save months with zero school days
    if (monthData.school_days <= 0) {
      toast.info(`No school days entered for ${month}. Nothing to save.`);
      return;
    }
    
    setIsSaving(true);
    try {
      const classId = student.class_id || (student.class && student.class.id);
      
      if (!classId) {
        toast.error("Missing class information. Please make sure this student is assigned to a class.");
        return;
      }
      
      // Use the single month update endpoint
      await useAttendanceStore.getState().updateAttendance(student.id, classId, {
        month: month,
        school_days: monthData.school_days,
        days_present: monthData.days_present,
        days_absent: monthData.days_absent,
        school_year: schoolYear
      });
      
      toast.success(`${month} attendance updated successfully!`);
    } catch (error) {
      console.error(`Failed to update ${month} attendance:`, error);
      toast.error(`Failed to update ${month} attendance`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    navigate(`/student/${id}/report-card`);
  };

  // Calculate totals for display
  const calculateTotals = () => {
    let totalSchoolDays = 0;
    let totalPresent = 0;
    let totalAbsent = 0;
    
    Object.values(monthlyAttendance).forEach(month => {
      totalSchoolDays += month.school_days;
      totalPresent += month.days_present;
      totalAbsent += month.days_absent;
    });
    
    const attendanceRate = totalSchoolDays > 0 
      ? ((totalPresent / totalSchoolDays) * 100).toFixed(2)
      : 0;
    
    return {
      totalSchoolDays,
      totalPresent,
      totalAbsent,
      attendanceRate
    };
  };

  const totals = calculateTotals();

  // Show loading state
  if (isLoading || loadingAttendance || !student) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 pt-20 pb-8">
      {/* Header with back button */}
      <div className="flex justify-between items-center mb-6">
        <button onClick={handleBack} className="flex items-center text-blue-600 hover:text-blue-800">
          <ChevronLeft size={20} />
          <span>Back to Report Card</span>
        </button>
        
        <div className="flex items-center gap-2">
          <select
            value={schoolYear}
            onChange={(e) => setSchoolYear(e.target.value)}
            className="border rounded px-2 py-1"
            disabled={isSaving}
          >
            {[...Array(5)].map((_, i) => {
              const year = new Date().getFullYear() - 2 + i;
              return (
                <option key={i} value={`${year}-${year + 1}`}>
                  SY {year}-{year + 1}
                </option>
              );
            })}
          </select>
          <button
            onClick={handleSaveAllAttendance}
            disabled={isSaving}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            {isSaving ? (
              <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent align-[-0.125em]"></div>
            ) : (
              <Save size={18} />
            )}
            <span>Save All Attendance Records</span>
          </button>
        </div>
      </div>

      {/* Student Info */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-2xl font-bold mb-4">Attendance Record</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-gray-600">Student:</p>
            <p className="font-medium">{student.first_name} {student.last_name}</p>
          </div>
          <div>
            <p className="text-gray-600">LRN:</p>
            <p className="font-medium">{student.lrn || "N/A"}</p>
          </div>
          <div>
            <p className="text-gray-600">Grade & Section:</p>
            <p className="font-medium">{student.class ? `${student.class.grade_level} - ${student.class.section}` : "Not Assigned"}</p>
          </div>
          <div>
            <p className="text-gray-600">School Year:</p>
            <p className="font-medium">{schoolYear}</p>
          </div>
        </div>
      </div>

      {/* Error notification */}
      {error && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-6 rounded-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-amber-500" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-amber-800">Attention needed</h3>
              <div className="mt-2 text-sm text-amber-700">
                <p>
                  There was an error connecting to the attendance server. You can still enter attendance data and try to save it.
                  If problems persist, please contact the system administrator.
                </p>
                <div className="mt-3">
                  <button 
                    onClick={() => window.location.reload()}
                    className="bg-amber-100 hover:bg-amber-200 text-amber-800 py-1 px-3 rounded text-sm font-medium"
                  >
                    Retry Connection
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Attendance Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-md">
          <div className="flex items-center mb-2">
            <Calendar className="text-blue-600 mr-2" size={20} />
            <h3 className="text-lg font-medium">Total School Days</h3>
          </div>
          <p className="text-3xl font-bold text-gray-800">{totals.totalSchoolDays}</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-md">
          <div className="flex items-center mb-2">
            <CheckCircle className="text-green-600 mr-2" size={20} />
            <h3 className="text-lg font-medium">Days Present</h3>
          </div>
          <p className="text-3xl font-bold text-gray-800">{totals.totalPresent}</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-md">
          <div className="flex items-center mb-2">
            <XCircle className="text-red-600 mr-2" size={20} />
            <h3 className="text-lg font-medium">Days Absent</h3>
          </div>
          <p className="text-3xl font-bold text-gray-800">{totals.totalAbsent}</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-md">
          <div className="flex items-center mb-2">
            <h3 className="text-lg font-medium">Attendance Rate</h3>
          </div>
          <p className="text-3xl font-bold text-gray-800">{totals.attendanceRate}%</p>
        </div>
      </div>

      {/* Monthly Attendance Editor */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-xl font-bold mb-4">Monthly Attendance</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Month
                </th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  School Days
                </th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Days Present
                </th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Days Absent
                </th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Attendance Rate
                </th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {MONTHS.map(month => {
                const monthData = monthlyAttendance[month] || { school_days: 0, days_present: 0, days_absent: 0 };
                const rate = monthData.school_days > 0 
                  ? ((monthData.days_present / monthData.school_days) * 100).toFixed(2) 
                  : 0;
                  
                return (
                  <tr key={month}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {month}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="text"
                        value={monthData.school_days}
                        onChange={(e) => {
                          // Only allow numeric values
                          const value = e.target.value.replace(/[^0-9]/g, '');
                          handleAttendanceChange(month, 'school_days', value);
                        }}
                        className="border rounded px-2 py-1 w-20 text-center"
                        disabled={isSaving}
                        inputMode="numeric"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="text"
                        value={monthData.days_present}
                        onChange={(e) => {
                          // Only allow numeric values
                          const value = e.target.value.replace(/[^0-9]/g, '');
                          handleAttendanceChange(month, 'days_present', value);
                        }}
                        className="border rounded px-2 py-1 w-20 text-center"
                        disabled={isSaving}
                        inputMode="numeric"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="text"
                        value={monthData.days_absent}
                        onChange={(e) => {
                          // Only allow numeric values
                          const value = e.target.value.replace(/[^0-9]/g, '');
                          handleAttendanceChange(month, 'days_absent', value);
                        }}
                        className="border rounded px-2 py-1 w-20 text-center"
                        disabled={isSaving}
                        inputMode="numeric"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {rate}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleSingleMonthUpdate(month)}
                        disabled={isSaving}
                        title={`Save ${month} attendance`}
                        className="p-1 rounded-full text-green-600 hover:bg-green-100 transition-colors"
                      >
                        <CheckCircle2 size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {/* Total Row */}
              <tr className="bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                  Total
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                  {totals.totalSchoolDays}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                  {totals.totalPresent}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                  {totals.totalAbsent}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                  {totals.attendanceRate}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        {/* Save Button (Bottom) */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSaveAllAttendance}
            disabled={isSaving}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            {isSaving ? (
              <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent align-[-0.125em]"></div>
            ) : (
              <Save size={18} />
            )}
            <span>Save Attendance Records</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentAttendancePage;