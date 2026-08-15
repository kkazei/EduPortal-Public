import React, { useState, useEffect } from "react";
import './reportCardStyles.css';
import { useParams, useNavigate } from "react-router-dom";
import { useGradeStore } from "../../../store/gradeStore";
import { useStudentStore } from "../../../store/studentStore";
import { useAttendanceStore } from "../../../store/attendanceStore";
import { useSchoolYearStore } from "../../../store/schoolYearStore";
import toast from "react-hot-toast";
import { ChevronLeft, Printer, ChevronRight } from "lucide-react";

// Path to the images - these should be in your public folder
const frontBackgroundImg = "/IMGA62D.gif";
const leftLogoImg = "/image004.png";
const rightLogoImg = "/image002.png";

// Add image loading error handling
const handleImageError = (e) => {
  console.error("Image failed to load:", e.target.src);
  e.target.style.backgroundColor = "#f0f0f0";
};



// Define months array for consistent order
const MONTHS = [
  "June", "July", "August", "September", "October", "November",
  "December", "January", "February", "March", "Total"
];

const TeacherFrontCard = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getStudentCard, isLoading, error } = useGradeStore();
  const { fetchStudentById, getClassStudents } = useStudentStore();
  // Add attendance store hooks
  const { getStudentAttendance, isLoading: attendanceLoading } = useAttendanceStore();
  
  const [student, setStudent] = useState(null);
  const [reportCard, setReportCard] = useState(null);
  const [schoolYear, setSchoolYear] = useState(`${new Date().getFullYear()}-${new Date().getFullYear() + 1}`);
  const selectedYear = useSchoolYearStore((s) => s.selected);
  const fetchYears = useSchoolYearStore((s) => s.fetchYears);
  const [classStudents, setClassStudents] = useState([]);
  const [currentStudentIndex, setCurrentStudentIndex] = useState(-1);
  
  // Initialize attendance with zeros
  const [attendanceData, setAttendanceData] = useState({
    schoolDays: Array(12).fill(0),
    presentDays: Array(12).fill(0),
    absentDays: Array(12).fill(0)
  });
  
  // Function to sort students by gender (male first) then alphabetically
  const sortStudentsByGenderAndName = (students) => {
    return [...students].sort((a, b) => {
      // First sort by gender (male first)
      const genderA = a.sex?.toLowerCase();
      const genderB = b.sex?.toLowerCase();
      
      if (genderA === 'male' && genderB === 'female') return -1;
      if (genderA === 'female' && genderB === 'male') return 1;
      
      // If same gender, sort alphabetically by last name, then first name
      const lastNameA = a.last_name?.toLowerCase() || '';
      const lastNameB = b.last_name?.toLowerCase() || '';
      
      if (lastNameA !== lastNameB) {
        return lastNameA.localeCompare(lastNameB);
      }
      
      // If last names are the same, sort by first name
      const firstNameA = a.first_name?.toLowerCase() || '';
      const firstNameB = b.first_name?.toLowerCase() || '';
      return firstNameA.localeCompare(firstNameB);
    });
  };
  
  // Load the student data using the ID from URL params
  useEffect(() => {
    const loadStudentData = async () => {
      try {
        if (id) {
          const studentData = await fetchStudentById(id);
          setStudent(studentData);
          
          // Also load class students for navigation
          if (studentData && studentData.class_id) {
            const classStudentsData = await getClassStudents(studentData.class_id);
            const sortedStudents = sortStudentsByGenderAndName(classStudentsData);
            setClassStudents(sortedStudents);
            
            // Find current student index in the sorted list
            const currentIndex = sortedStudents.findIndex(s => s.id === parseInt(id));
            setCurrentStudentIndex(currentIndex);
          }
        }
      } catch (error) {
        console.error("Failed to load student data:", error);
        toast.error("Failed to load student information");
      }
    };
    
    if (id) {
      loadStudentData();
    }
  }, [id, fetchStudentById, getClassStudents]);

  // Ensure school years are loaded and keep local state in sync with global selection
  useEffect(() => {
    fetchYears?.();
  }, [fetchYears]);

  useEffect(() => {
    if (selectedYear && selectedYear !== schoolYear) {
      setSchoolYear(selectedYear);
    }
  }, [selectedYear]);

  // Load attendance data
  useEffect(() => {
    const loadAttendanceData = async () => {
      if (!student) return;
      
      try {
        const data = await getStudentAttendance(student.id, schoolYear);
        
        if (data && data.monthly && data.monthly.length > 0) {
          // Create temporary arrays to hold the attendance values
          const tempSchoolDays = Array(12).fill(0);
          const tempPresentDays = Array(12).fill(0);
          const tempAbsentDays = Array(12).fill(0);
          
          // Map month names to their index in our array
          const monthIndexMap = {
            'June': 0, 'July': 1, 'August': 2, 'September': 3, 
            'October': 4, 'November': 5, 'December': 6, 'January': 7,
            'February': 8, 'March': 9
          };
          
          // Fill in the actual attendance data
          data.monthly.forEach(monthData => {
            const index = monthIndexMap[monthData.month];
            if (index !== undefined) {
              tempSchoolDays[index] = monthData.school_days || 0;
              tempPresentDays[index] = monthData.days_present || 0;
              tempAbsentDays[index] = monthData.days_absent || 0;
            }
          });
          
          // Calculate totals for the last element
          tempSchoolDays[10] = tempSchoolDays.slice(0, 10).reduce((sum, days) => sum + days, 0);
          tempPresentDays[10] = tempPresentDays.slice(0, 10).reduce((sum, days) => sum + days, 0);
          tempAbsentDays[10] = tempAbsentDays.slice(0, 10).reduce((sum, days) => sum + days, 0);
          
          // Set the attendance data state
          setAttendanceData({
            schoolDays: tempSchoolDays,
            presentDays: tempPresentDays,
            absentDays: tempAbsentDays
          });
        } else if (data?.summary) {
          // If we only have summary data but no monthly breakdown
          setAttendanceData({
            schoolDays: [...Array(10).fill(0), data.summary.total_school_days || 0],
            presentDays: [...Array(10).fill(0), data.summary.total_days_present || 0],
            absentDays: [...Array(10).fill(0), data.summary.total_days_absent || 0]
          });
        }
      } catch (error) {
        console.error("Failed to load attendance data:", error);
        // Keep the default values in case of error
      }
    };
    
    if (student) {
      loadAttendanceData();
    }
  }, [student, schoolYear, getStudentAttendance]);

  // Then load the report card using the student ID
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

  const handlePrint = () => {
    window.print();
  };

  // Update the navigation functions to match the correct route
  const handlePreviousStudent = () => {
    if (currentStudentIndex > 0) {
      const previousStudent = classStudents[currentStudentIndex - 1];
      // Use the correct route pattern: /teacher/student-front-card/:id
      navigate(`/teacher/student-front-card/${previousStudent.id}`);
    }
  };

  const handleNextStudent = () => {
    if (currentStudentIndex < classStudents.length - 1) {
      const nextStudent = classStudents[currentStudentIndex + 1];
      // Use the correct route pattern: /teacher/student-front-card/:id
      navigate(`/teacher/student-front-card/${nextStudent.id}`);
    }
  };

  const handleBack = () => {
    // Navigate back to the student's report card page
    navigate(`/student/${id}/report-card`);
  };

  const handleViewBackSide = () => {
    // Update this to match your back side route pattern
    navigate(`/teacher/student-card/${id}`); // or the correct back side route
  };

  // Get current student info for display
  const getCurrentStudentInfo = () => {
    if (currentStudentIndex === -1 || classStudents.length === 0) return null;
    
    const currentStudent = classStudents[currentStudentIndex];
    const prevStudent = currentStudentIndex > 0 ? classStudents[currentStudentIndex - 1] : null;
    const nextStudent = currentStudentIndex < classStudents.length - 1 ? classStudents[currentStudentIndex + 1] : null;
    
    return {
      current: currentStudent,
      previous: prevStudent,
      next: nextStudent,
      position: currentStudentIndex + 1,
      total: classStudents.length
    };
  };

  const studentInfo = getCurrentStudentInfo();

  // Show loading state while fetching data
  if (isLoading || attendanceLoading || !student) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-2 pt-20 pb-4">
      {/* Controls - only visible on screen, not when printing */}
      <div className="card-toolbar print:hidden">
        <div className="card-toolbar__group">
          <button onClick={handleBack} className="btn-outline" title="Return to student report list">
            <ChevronLeft size={16} />
            <span>Report List</span>
          </button>
          <div className="hidden sm:flex flex-col">
            {studentInfo && (
              <span className="position-main">Student {studentInfo.position} / {studentInfo.total}</span>
            )}
            {studentInfo && (
              <span className="position-meta">
                {(() => {
                  const currentGender = student?.sex?.toLowerCase();
                  const genderGroup = classStudents.filter(s => s.sex?.toLowerCase() === currentGender);
                  const currentPositionInGender = genderGroup.findIndex(s => s.id === parseInt(id)) + 1;
                  const genderLabel = currentGender === 'male' ? 'Boys' : currentGender === 'female' ? 'Girls' : 'Students';
                  return `${genderLabel} ${currentPositionInGender}/${genderGroup.length}`;
                })()}
              </span>
            )}
          </div>
        </div>
        <div className="card-toolbar__group">
          <select
            value={schoolYear}
            onChange={(e) => {
              const val = e.target.value;
              setSchoolYear(val);
              const setSelected = useSchoolYearStore.getState().selectYear;
              setSelected?.(val);
            }}
            aria-label="Select school year"
          >
            {(() => {
              const ys = useSchoolYearStore.getState().years;
              if (ys && ys.length > 0) {
                return ys.map((y) => (
                  <option key={y.id ?? y.name} value={y.name}>SY {y.name}</option>
                ));
              }
              const base = new Date().getFullYear();
              return Array.from({ length: 5 }, (_, i) => `${base - 2 + i}-${base - 1 + i}`).map((name) => (
                <option key={name} value={name}>SY {name}</option>
              ));
            })()}
          </select>
          <button onClick={handlePrint} className="btn-secondary" title="Print front page">
            <Printer size={14} />
            <span>Print Front</span>
          </button>
          <button onClick={handleViewBackSide} className="btn-primary" title="Go to back page">
            <span>Back Side</span>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Navigation Controls */}
      {studentInfo && (
        <div className="card-nav print:hidden">
          <button onClick={handlePreviousStudent} disabled={currentStudentIndex <= 0}>
            <ChevronLeft size={14} />
            <span>{studentInfo.previous ? `${studentInfo.previous.first_name} ${studentInfo.previous.last_name}` : 'Previous'}</span>
          </button>
          <div>
            <div className="main">Student {studentInfo.position} / {studentInfo.total}</div>
            <div className="meta">
              {(() => {
                const currentGender = student?.sex?.toLowerCase();
                const genderGroup = classStudents.filter(s => s.sex?.toLowerCase() === currentGender);
                const currentPositionInGender = genderGroup.findIndex(s => s.id === parseInt(id)) + 1;
                const genderLabel = currentGender === 'male' ? 'Boys' : currentGender === 'female' ? 'Girls' : 'Students';
                return `${genderLabel} ${currentPositionInGender}/${genderGroup.length}`;
              })()}
            </div>
          </div>
          <button onClick={handleNextStudent} disabled={currentStudentIndex >= classStudents.length - 1}>
            <span>{studentInfo.next ? `${studentInfo.next.first_name} ${studentInfo.next.last_name}` : 'Next'}</span>
            <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* Basic info header (only visible on screen) */}
      {reportCard && (
        <div className="mb-4 print:hidden">
          <div className="text-sm font-semibold">
            Student: {reportCard.student?.first_name} {reportCard.student?.last_name}
            {reportCard.class && <span> - {reportCard.class.grade_level} {reportCard.class.section}</span>}
          </div>
          <div className="text-sm">School Year: {schoolYear}</div>
          {studentInfo && (
            <div className="text-xs text-gray-600 mt-1">
              Gender: {student?.sex} | Position in sorted list: {studentInfo.position}/{studentInfo.total}
            </div>
          )}
        </div>
      )}

      {/* Static Report Card Container (layout preserved) */}
      <div className="relative report-card-page print:w-[1140px] print:h-[800px] mx-auto">
        {/* ...existing code... */}
        {/* Attendance Report */}
        <div style={{ position: 'absolute', left: '33px', top: '99px', width: '518px', height: '216px', zIndex: 0 }}></div>
        <div style={{ position: 'absolute', left: '33px', top: '99px', width: '518px', height: '216px', zIndex: 1 }}>
          <img src={frontBackgroundImg} width="518" height="216" style={{ border: 0 }} alt="" onError={handleImageError}  />
        </div>
        
        <div style={{ position: 'absolute', left: '36px', top: '68px', zIndex: 3 }}>
          <div style={{ width: '511px', height: '16px', fontFamily: 'Arial', fontSize: '10pt', fontWeight: 'bold', color: '#000000', lineHeight: '16px', textAlign: 'center' }}>
            REPORT ON ATTENDANCE
          </div>
        </div>
        
        {/* Month Headers */}
        <div style={{ position: 'absolute', left: '107px', top: '111px', zIndex: 3 }}>
          <div style={{ width: '29px', height: '16px', fontFamily: 'Arial', fontSize: '10pt', color: '#000000', lineHeight: '16px', textAlign: 'left' }}>
            Jun.
          </div>
        </div>
        <div style={{ position: 'absolute', left: '140px', top: '111px', zIndex: 3 }}>
          <div style={{ width: '28px', height: '17px', fontFamily: 'Arial', fontSize: '10pt', color: '#000000', lineHeight: '17px', textAlign: 'left' }}>
            Jul.
          </div>
        </div>
        <div style={{ position: 'absolute', left: '178px', top: '111px', zIndex: 3 }}>
          <div style={{ width: '33px', height: '17px', fontFamily: 'Arial', fontSize: '10pt', color: '#000000', lineHeight: '16px', textAlign: 'left' }}>
            Aug.
          </div>
        </div>
        <div style={{ position: 'absolute', left: '217px', top: '111px', zIndex: 3 }}>
          <div style={{ width: '33px', height: '17px', fontFamily: 'Arial', fontSize: '10pt', color: '#000000', lineHeight: '16px', textAlign: 'left' }}>
            Sept.
          </div>
        </div>
        <div style={{ position: 'absolute', left: '253px', top: '111px', zIndex: 3 }}>
          <div style={{ width: '25px', height: '17px', fontFamily: 'Arial', fontSize: '10pt', color: '#000000', lineHeight: '16px', textAlign: 'left' }}>
            Oct.
          </div>
        </div>
        <div style={{ position: 'absolute', left: '290px', top: '111px', zIndex: 3 }}>
          <div style={{ width: '26px', height: '17px', fontFamily: 'Arial', fontSize: '10pt', color: '#000000', lineHeight: '16px', textAlign: 'left' }}>
            Nov.
          </div>
        </div>
        <div style={{ position: 'absolute', left: '328px', top: '111px', zIndex: 3 }}>
          <div style={{ width: '32px', height: '17px', fontFamily: 'Arial', fontSize: '10pt', color: '#000000', lineHeight: '16px', textAlign: 'left' }}>
            Dec.
          </div>
        </div>
        <div style={{ position: 'absolute', left: '364px', top: '111px', zIndex: 3 }}>
          <div style={{ width: '30px', height: '17px', fontFamily: 'Arial', fontSize: '10pt', color: '#000000', lineHeight: '17px', textAlign: 'left' }}>
            Jan.
          </div>
        </div>
        <div style={{ position: 'absolute', left: '405px', top: '111px', zIndex: 3 }}>
          <div style={{ width: '28px', height: '17px', fontFamily: 'Arial', fontSize: '10pt', color: '#000000', lineHeight: '16px', textAlign: 'left' }}>
            Feb.
          </div>
        </div>
        <div style={{ position: 'absolute', left: '440px', top: '111px', zIndex: 3 }}>
          <div style={{ width: '32px', height: '16px', fontFamily: 'Arial', fontSize: '10pt', color: '#000000', lineHeight: '16px', textAlign: 'left' }}>
            Mar.
          </div>
        </div>
        <div style={{ position: 'absolute', left: '512px', top: '111px', zIndex: 3 }}>
          <div style={{ width: '38px', height: '17px', fontFamily: 'Arial', fontSize: '10pt', color: '#000000', lineHeight: '16px', textAlign: 'left' }}>
            Total
          </div>
        </div>
        
        {/* Row Labels */}
        <div style={{ position: 'absolute', left: '42px', top: '143px', zIndex: 3 }}>
          <div style={{ width: '50px', height: '43px', fontFamily: 'Arial', fontSize: '10pt', color: '#000000', lineHeight: '16px', textAlign: 'left' }}>
            No. of school days
          </div>
        </div>
        <div style={{ position: 'absolute', left: '42px', top: '200px', zIndex: 3 }}>
          <div style={{ width: '56px', height: '43px', fontFamily: 'Arial', fontSize: '10pt', color: '#000000', lineHeight: '16px', textAlign: 'left' }}>
            No.of days present
          </div>
        </div>
        <div style={{ position: 'absolute', left: '42px', top: '260px', zIndex: 3 }}>
          <div style={{ width: '54px', height: '45px', fontFamily: 'Arial', fontSize: '10pt', color: '#000000', lineHeight: '16px', textAlign: 'left' }}>
            No.of days absent
          </div>
        </div>
        
        {/* School Days Data */}
        {attendanceData.schoolDays.map((days, index) => {
          const isTotal = index === 10; // last slot is Total
          const left = isTotal ? 512 : 107 + index * 36; // nudge total column to its header
          const width = isTotal ? 38 : 29;                // make total wider
          const paddingLeft = isTotal ? 3 : 0;            // add inner padding for total
          return (
            <div key={`school-${index}`} style={{
              position: 'absolute',
              left: `${left}px`,
              top: '150px',
              zIndex: 3
            }}>
              <div style={{
                width: `${width}px`,
                height: '16px',
                fontFamily: 'Arial',
                fontSize: '10pt',
                color: '#000000',
                lineHeight: '16px',
                textAlign: 'center',
                paddingLeft: `${paddingLeft}px`
              }}>
                {days > 0 ? days : ''}
              </div>
            </div>
          );
        })}

        {/* Present Days Data */}
        {attendanceData.presentDays.map((days, index) => {
          const isTotal = index === 10;
          const left = isTotal ? 512 : 107 + index * 36;
          const width = isTotal ? 38 : 29;
          const paddingLeft = isTotal ? 3 : 0;
          return (
            <div key={`present-${index}`} style={{
              position: 'absolute',
              left: `${left}px`,
              top: '204px',
              zIndex: 3
            }}>
              <div style={{
                width: `${width}px`,
                height: '16px',
                fontFamily: 'Arial',
                fontSize: '10pt',
                color: '#000000',
                lineHeight: '16px',
                textAlign: 'center',
                paddingLeft: `${paddingLeft}px`
              }}>
                {days > 0 ? days : ''}
              </div>
            </div>
          );
        })}

        {/* Absent Days Data */}
        {attendanceData.absentDays.map((days, index) => {
          const isTotal = index === 10;
          const left = isTotal ? 512 : 107 + index * 36;
          const width = isTotal ? 38 : 29;
          const paddingLeft = isTotal ? 3 : 0;
          return (
            <div key={`absent-${index}`} style={{
              position: 'absolute',
              left: `${left}px`,
              top: '259px',
              zIndex: 3
            }}>
              <div style={{
                width: `${width}px`,
                height: '16px',
                fontFamily: 'Arial',
                fontSize: '10pt',
                color: '#000000',
                lineHeight: '16px',
                textAlign: 'center',
                paddingLeft: `${paddingLeft}px`
              }}>
                {days > 0 ? days : ''}
              </div>
            </div>
          );
        })}
        
        {/* Guardian signature */}
        <div style={{ position: 'absolute', left: '74px', top: '386px', zIndex: 3 }}>
          <div style={{ width: '473px', height: '16px', fontFamily: 'Arial', fontSize: '10pt', fontWeight: 'bold', color: '#000000', lineHeight: '16px', textAlign: 'center' }}>
            PARENT'S / GUARDIAN SIGNATURE
          </div>
        </div>
        
        {/* Quarters and Comments */}
        <div style={{ position: 'absolute', left: '36px', top: '451px', zIndex: 3 }}>
          <div style={{ width: '99px', height: '17px', fontFamily: 'Arial', fontSize: '10pt', fontWeight: 'bold', color: '#000000', lineHeight: '16px', textAlign: 'left' }}>
            1st QUARTER
          </div>
        </div>
        <div style={{ position: 'absolute', left: '139px', top: '464px', zIndex: 3, borderTop: '1px solid #000000' }}>
          <div style={{ width: '411px', height: '25px', fontFamily: 'Arial', fontSize: '11pt', color: '#000000', lineHeight: '17px', textAlign: 'left', paddingTop: '5px' }}>
          
          </div>
        </div>
        
        <div style={{ position: 'absolute', left: '36px', top: '510px', zIndex: 3 }}>
          <div style={{ width: '99px', height: '17px', fontFamily: 'Arial', fontSize: '10pt', fontWeight: 'bold', color: '#000000', lineHeight: '16px', textAlign: 'left' }}>
            2nd QUARTER
          </div>
        </div>
        <div style={{ position: 'absolute', left: '139px', top: '524px', zIndex: 3, borderTop: '1px solid #000000' }}>
          <div style={{ width: '411px', height: '25px', fontFamily: 'Arial', fontSize: '11pt', color: '#000000', lineHeight: '17px', textAlign: 'left', paddingTop: '5px' }}>
          </div>
        </div>
        
        <div style={{ position: 'absolute', left: '36px', top: '576px', zIndex: 3 }}>
          <div style={{ width: '99px', height: '17px', fontFamily: 'Arial', fontSize: '10pt', fontWeight: 'bold', color: '#000000', lineHeight: '16px', textAlign: 'left' }}>
            3rd QUARTER
          </div>
        </div>
        <div style={{ position: 'absolute', left: '139px', top: '588px', zIndex: 3, borderTop: '1px solid #000000' }}>
          <div style={{ width: '411px', height: '25px', fontFamily: 'Arial', fontSize: '11pt', color: '#000000', lineHeight: '17px', textAlign: 'left', paddingTop: '5px' }}>
          </div>
        </div>
        
        <div style={{ position: 'absolute', left: '36px', top: '642px', zIndex: 3 }}>
          <div style={{ width: '99px', height: '18px', fontFamily: 'Arial', fontSize: '10pt', fontWeight: 'bold', color: '#000000', lineHeight: '16px', textAlign: 'left' }}>
            4th QUARTER
          </div>
        </div>
        <div style={{ position: 'absolute', left: '139px', top: '654px', zIndex: 3, borderTop: '1px solid #000000' }}>
          <div style={{ width: '411px', height: '25px', fontFamily: 'Arial', fontSize: '11pt', color: '#000000', lineHeight: '17px', textAlign: 'left', paddingTop: '5px' }}>
          </div>
        </div>
        
        {/* Right Side - Student Information */}
        <div style={{ position: 'absolute', left: '583px', top: '22px', zIndex: 3 }}>
          <div style={{ width: '118px', height: '17px', fontFamily: 'Arial Narrow', fontSize: '9pt', fontWeight: 'bold', color: '#000000', lineHeight: '15px', textAlign: 'left' }}>
            School Form 9 ES
          </div>
        </div>
        
        <div style={{ position: 'absolute', left: '583px', top: '46px', zIndex: 3 }}>
          <div style={{ width: '540px', height: '16px', fontFamily: 'Arial', fontSize: '10pt', color: '#000000', lineHeight: '16px', textAlign: 'center' }}>
            Republic of the Philippines
          </div>
        </div>
        
        <div style={{ position: 'absolute', left: '584px', top: '63px', zIndex: 3 }}>
          <div style={{ width: '539px', height: '16px', fontFamily: 'Arial', fontSize: '10pt', color: '#000000', lineHeight: '16px', textAlign: 'center' }}>
            Department of Education
          </div>
        </div>
        
        <div style={{ position: 'absolute', left: '583px', top: '79px', zIndex: 3 }}>
          <div style={{ width: '540px', height: '16px', fontFamily: 'Arial', fontSize: '10pt', color: '#000000', lineHeight: '16px', textAlign: 'center' }}>
            Region III
          </div>
        </div>
        
        <div style={{ position: 'absolute', left: '583px', top: '97px', zIndex: 3 }}>
          <div style={{ width: '540px', height: '16px', fontFamily: 'Arial', fontSize: '10pt', fontWeight: 'bold', color: '#000000', lineHeight: '16px', textAlign: 'center' }}>
            SCHOOLS DIVISION OFFICE OF OLONGAPO CITY
          </div>
        </div>
        
        <div style={{ position: 'absolute', left: '584px', top: '110px', zIndex: 3 }}>
          <div style={{ width: '539px', height: '17px', fontFamily: 'Arial', fontSize: '10pt', color: '#000000', lineHeight: '16px', textAlign: 'center' }}>
            District IV-B
          </div>
        </div>
        
        <div style={{ position: 'absolute', left: '583px', top: '125px', zIndex: 3 }}>
          <div style={{ width: '540px', height: '16px', fontFamily: 'Arial', fontSize: '10pt', color: '#000000', lineHeight: '16px', textAlign: 'center' }}>
            Olongapo City
          </div>
        </div>
        
        <div style={{ position: 'absolute', left: '583px', top: '144px', zIndex: 3 }}>
          <div style={{ width: '540px', height: '16px', fontFamily: 'Arial', fontSize: '11pt', fontWeight: 'bold', color: '#000000', lineHeight: '16px', textAlign: 'center' }}>
            TAPINAC ELEMENTARY SCHOOL
          </div>
        </div>
        
        <div style={{ position: 'absolute', left: '579px', top: '164px', zIndex: 3, borderTop: '1px solid #000000' }}>
          <div style={{ width: '548px', height: '25px', fontFamily: 'Arial', fontSize: '11pt', color: '#000000', lineHeight: '17px', textAlign: 'left' }}></div>
        </div>
        
        <div style={{ position: 'absolute', left: '583px', top: '169px', zIndex: 3 }}>
          <div style={{ width: '540px', height: '16px', fontFamily: 'Arial', fontSize: '12pt', fontWeight: 'bold', color: '#000000', lineHeight: '18px', textAlign: 'center' }}>
            LEARNER'S PROGRESS REPORT CARD
          </div>
        </div>
        
        <div style={{ position: 'absolute', left: '583px', top: '187px', zIndex: 3 }}>
          <div style={{ width: '540px', height: '16px', fontFamily: 'Arial', fontSize: '10pt', color: '#000000', lineHeight: '16px', textAlign: 'center' }}>
            SY {schoolYear}
          </div>
        </div>
        
        {/* LRN centered below SY */}
        <div style={{ position: 'absolute', left: '583px', top: '205px', zIndex: 3 }}>
          <div style={{ width: '540px', height: '16px', fontFamily: 'Arial', fontSize: '10pt', color: '#000000', lineHeight: '16px', textAlign: 'center' }}>
            LRN: <span style={{ textDecoration: 'underline', fontWeight: 'bold' }}>{student?.lrn || reportCard?.student?.lrn || ""}</span>
          </div>
        </div>
        
        {/* Student Information Fields - Remove the old LRN section */}
        <div style={{ position: 'absolute', left: '598px', top: '252px', zIndex: 3 }}>
          <div style={{ width: '119px', height: '16px', fontFamily: 'Arial', fontSize: '10pt', color: '#000000', lineHeight: '16px', textAlign: 'left' }}>
            Name:
          </div>
        </div>
        
        <div style={{ position: 'absolute', left: '800px', top: '252px', zIndex: 3 }}>
          <div style={{ width: '363px', height: '16px', fontFamily: 'Arial', fontSize: '10pt', fontWeight: 'bold', color: '#000000', lineHeight: '16px', textAlign: 'left' }}>
            {reportCard?.student?.last_name}, {reportCard?.student?.first_name} {reportCard?.student?.middle_name}
          </div>
        </div>
        
        <div style={{ position: 'absolute', left: '705px', top: '268px', zIndex: 3, borderTop: '1px solid #000000' }}>
          <div style={{ width: '422px', height: '25px', fontFamily: 'Arial', fontSize: '11pt', color: '#000000', lineHeight: '17px', textAlign: 'left' }}></div>
        </div>
        
        <div style={{ position: 'absolute', left: '709px', top: '273px', zIndex: 3 }}>
          <div style={{ width: '415px', height: '16px', fontFamily: 'Arial', fontSize: '9pt', fontStyle: 'italic', color: '#000000', lineHeight: '14px', textAlign: 'center' }}>
            (LAST NAME, FIRST NAME AND MIDDLE NAME)
          </div>
        </div>
        
        <div style={{ position: 'absolute', left: '595px', top: '303px', zIndex: 3 }}>
          <div style={{ width: '87px', height: '16px', fontFamily: 'Arial', fontSize: '10pt', color: '#000000', lineHeight: '16px', textAlign: 'left' }}>
            Date of Birth:
          </div>
        </div>
        
        <div style={{ position: 'absolute', left: '690px', top: '297px', zIndex: 3 }}>
          <div style={{ width: '172px', height: '17px', fontFamily: 'Arial', fontSize: '10pt', color: '#000000', lineHeight: '16px', textAlign: 'left' }}>
            {reportCard?.student?.birthdate ? 
              (() => {
                const date = new Date(reportCard.student.birthdate);
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                const year = date.getFullYear();
                return `${month}-${day}-${year}`;
              })() : ""
            }
          </div>
        </div>
        
        <div style={{ position: 'absolute', left: '686px', top: '315px', zIndex: 3, borderTop: '1px solid #000000' }}>
          <div style={{ width: '180px', height: '7px', fontFamily: 'Arial', fontSize: '11pt', color: '#000000', lineHeight: '17px', textAlign: 'left' }}></div>
        </div>
        
        <div style={{ position: 'absolute', left: '880px', top: '303px', zIndex: 3 }}>
          <div style={{ width: '62px', height: '16px', fontFamily: 'Arial', fontSize: '10pt', color: '#000000', lineHeight: '16px', textAlign: 'left' }}>
            Age:
          </div>
        </div>
        
        <div style={{ position: 'absolute', left: '949px', top: '297px', zIndex: 3 }}>
          <div style={{ width: '122px', height: '17px', fontFamily: 'Arial', fontSize: '10pt', color: '#000000', lineHeight: '16px', textAlign: 'left' }}>
            {reportCard?.student?.age || ""}
          </div>
        </div>
        
        <div style={{ position: 'absolute', left: '947px', top: '315px', zIndex: 3, borderTop: '1px solid #000000' }}>
          <div style={{ width: '181px', height: '8px', fontFamily: 'Arial', fontSize: '11pt', color: '#000000', lineHeight: '17px', textAlign: 'left' }}></div>
        </div>
        
        <div style={{ position: 'absolute', left: '595px', top: '327px', zIndex: 3 }}>
          <div style={{ width: '87px', height: '16px', fontFamily: 'Arial', fontSize: '10pt', color: '#000000', lineHeight: '16px', textAlign: 'left' }}>
            Grade:
          </div>
        </div>
        
        <div style={{ position: 'absolute', left: '690px', top: '323px', zIndex: 3 }}>
          <div style={{ width: '118px', height: '16px', fontFamily: 'Arial', fontSize: '10pt', color: '#000000', lineHeight: '16px', textAlign: 'left' }}>
            {reportCard?.class?.grade_level || ""}
          </div>
        </div>
        
        <div style={{ position: 'absolute', left: '686px', top: '339px', zIndex: 3, borderTop: '1px solid #000000' }}>
          <div style={{ width: '180px', height: '7px', fontFamily: 'Arial', fontSize: '11pt', color: '#000000', lineHeight: '17px', textAlign: 'left' }}></div>
        </div>
        
        <div style={{ position: 'absolute', left: '880px', top: '327px', zIndex: 3 }}>
          <div style={{ width: '62px', height: '16px', fontFamily: 'Arial', fontSize: '10pt', color: '#000000', lineHeight: '16px', textAlign: 'left' }}>
            Section:
          </div>
        </div>
        
        <div style={{ position: 'absolute', left: '951px', top: '323px', zIndex: 3 }}>
          <div style={{ width: '118px', height: '16px', fontFamily: 'Arial', fontSize: '10pt', color: '#000000', lineHeight: '16px', textAlign: 'left' }}>
            {reportCard?.class?.section || ""}
          </div>
        </div>
        
        <div style={{ position: 'absolute', left: '947px', top: '339px', zIndex: 3, borderTop: '1px solid #000000' }}>
          <div style={{ width: '181px', height: '7px', fontFamily: 'Arial', fontSize: '11pt', color: '#000000', lineHeight: '17px', textAlign: 'left' }}></div>
        </div>
        
        <div style={{ position: 'absolute', left: '595px', top: '350px', zIndex: 3 }}>
          <div style={{ width: '87px', height: '16px', fontFamily: 'Arial', fontSize: '10pt', color: '#000000', lineHeight: '16px', textAlign: 'left' }}>
            School Year:
          </div>
        </div>
        
        <div style={{ position: 'absolute', left: '690px', top: '346px', zIndex: 3 }}>
          <div style={{ width: '118px', height: '16px', fontFamily: 'Arial', fontSize: '10pt', color: '#000000', lineHeight: '16px', textAlign: 'left' }}>
            {schoolYear}
          </div>
        </div>
        
        <div style={{ position: 'absolute', left: '686px', top: '362px', zIndex: 3, borderTop: '1px solid #000000' }}>
          <div style={{ width: '180px', height: '7px', fontFamily: 'Arial', fontSize: '11pt', color: '#000000', lineHeight: '17px', textAlign: 'left' }}></div>
        </div>
        
        <div style={{ position: 'absolute', left: '880px', top: '350px', zIndex: 3 }}>
          <div style={{ width: '62px', height: '16px', fontFamily: 'Arial', fontSize: '10pt', color: '#000000', lineHeight: '16px', textAlign: 'left' }}>
            Sex:
          </div>
        </div>
        
        <div style={{ position: 'absolute', left: '951px', top: '347px', zIndex: 3 }}>
          <div style={{ width: '118px', height: '16px', fontFamily: 'Arial', fontSize: '10pt', color: '#000000', lineHeight: '16px', textAlign: 'left' }}>
            {reportCard?.student?.sex || ""}
          </div>
        </div>
        
        <div style={{ position: 'absolute', left: '947px', top: '362px', zIndex: 3, borderTop: '1px solid #000000' }}>
          <div style={{ width: '181px', height: '8px', fontFamily: 'Arial', fontSize: '11pt', color: '#000000', lineHeight: '17px', textAlign: 'left' }}></div>
        </div>
        
        {/* Parent Message */}
        <div style={{ position: 'absolute', left: '596px', top: '376px', zIndex: 3 }}>
          <div style={{ width: '119px', height: '16px', fontFamily: 'Arial', fontSize: '10pt', color: '#000000', lineHeight: '16px', textAlign: 'left' }}>
            Dear Parent,
          </div>
        </div>
        
        <div style={{ position: 'absolute', left: '596px', top: '394px', zIndex: 3 }}>
          <div style={{ width: '527px', height: '62px', fontFamily: 'Arial', fontSize: '10pt', color: '#000000', lineHeight: '16px', textAlign: 'left' }}>
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;This report card shows the ability and progress your child has made in the different learning areas as well as his/her core values.<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;The school welcomes you, should you desire to know more about your child's progress.
          </div>
        </div>
        
     {/* Teacher and Principal Signatures */}
<div style={{ position: 'absolute', left: '897px', top: '466px', zIndex: 3 }}>
  <div style={{ width: '227px', height: '17px', fontFamily: 'Arial', fontSize: '10pt', fontWeight: 'bold', color: '#000000', lineHeight: '16px', textAlign: 'center', textTransform: 'uppercase' }}>
    {reportCard?.class?.adviser_name?.toUpperCase() || "TEACHER"}
  </div>
</div>

<div style={{ position: 'absolute', left: '894px', top: '483px', zIndex: 3, borderTop: '1px solid #000000' }}>
  <div style={{ width: '217px', height: '7px', fontFamily: 'Arial', fontSize: '11pt', color: '#000000', lineHeight: '17px', textAlign: 'left' }}></div>
</div>

{/* Teacher title - keep original case, remove textTransform and toUpperCase */}
<div style={{ position: 'absolute', left: '897px', top: '487px', zIndex: 3 }}>
  <div style={{ width: '226px', height: '16px', fontFamily: 'Arial', fontSize: '10pt', color: '#000000', lineHeight: '16px', textAlign: 'center' }}>
    {reportCard?.class?.adviser_title || 'Teacher'}
  </div>
</div>
        
        <div style={{ position: 'absolute', left: '596px', top: '495px', zIndex: 3 }}>
          <div style={{ width: '248px', height: '16px', fontFamily: 'Arial', fontSize: '10pt', fontWeight: 'bold', color: '#000000', lineHeight: '16px', textAlign: 'center' }}>
            JOSEPH P. GREGORIO
          </div>
        </div>
        
        <div style={{ position: 'absolute', left: '592px', top: '510px', zIndex: 3, borderTop: '1px solid #000000' }}>
          <div style={{ width: '256px', height: '8px', fontFamily: 'Arial', fontSize: '11pt', color: '#000000', lineHeight: '17px', textAlign: 'left' }}></div>
        </div>
        
        <div style={{ position: 'absolute', left: '596px', top: '512px', zIndex: 3 }}>
          <div style={{ width: '248px', height: '16px', fontFamily: 'Arial', fontSize: '10pt', color: '#000000', lineHeight: '16px', textAlign: 'center' }}>
            Principal II
          </div>
        </div>
        
        {/* Certificate of Transfer */}
        <div style={{ position: 'absolute', left: '596px', top: '530px', zIndex: 3 }}>
          <div style={{ width: '527px', height: '16px', fontFamily: 'Arial', fontSize: '10pt', fontWeight: 'bold', color: '#000000', lineHeight: '16px', textAlign: 'center' }}>
            Certificate of Transfer
          </div>
        </div>
        
        <div style={{ position: 'absolute', left: '596px', top: '557px', zIndex: 3 }}>
          <div style={{ width: '119px', height: '16px', fontFamily: 'Arial', fontSize: '10pt', color: '#000000', lineHeight: '16px', textAlign: 'left' }}>
            Admitted to Grade:
          </div>
        </div>
        
        <div style={{ position: 'absolute', left: '720px', top: '567px', zIndex: 3, borderTop: '1px solid #000000' }}>
          <div style={{ width: '174px', height: '7px', fontFamily: 'Arial', fontSize: '11pt', color: '#000000', lineHeight: '17px', textAlign: 'left' }}></div>
        </div>
        
        <div style={{ position: 'absolute', left: '897px', top: '553px', zIndex: 3 }}>
          <div style={{ width: '119px', height: '16px', fontFamily: 'Arial', fontSize: '10pt', color: '#000000', lineHeight: '16px', textAlign: 'left' }}>
            Section:
          </div>
        </div>
        
        <div style={{ position: 'absolute', left: '956px', top: '567px', zIndex: 3, borderTop: '1px solid #000000' }}>
          <div style={{ width: '155px', height: '7px', fontFamily: 'Arial', fontSize: '11pt', color: '#000000', lineHeight: '17px', textAlign: 'left' }}></div>
        </div>
        
        <div style={{ position: 'absolute', left: '596px', top: '584px', zIndex: 3 }}>
          <div style={{ width: '238px', height: '16px', fontFamily: 'Arial', fontSize: '10pt', color: '#000000', lineHeight: '16px', textAlign: 'left' }}>
            Eligibility for admission to Grade:
          </div>
        </div>
        
        <div style={{ position: 'absolute', left: '799px', top: '598px', zIndex: 3, borderTop: '1px solid #000000' }}>
          <div style={{ width: '312px', height: '7px', fontFamily: 'Arial', fontSize: '11pt', color: '#000000', lineHeight: '17px', textAlign: 'left' }}></div>
        </div>
        
        <div style={{ position: 'absolute', left: '592px', top: '658px', zIndex: 3, borderTop: '1px solid #000000' }}>
          <div style={{ width: '218px', height: '8px', fontFamily: 'Arial', fontSize: '11pt', color: '#000000', lineHeight: '17px', textAlign: 'left' }}></div>
        </div>
        
        <div style={{ position: 'absolute', left: '600px', top: '659px', zIndex: 3 }}>
          <div style={{ width: '206px', height: '17px', fontFamily: 'Arial', fontSize: '10pt', color: '#000000', lineHeight: '16px', textAlign: 'center' }}>
            Principal
          </div>
        </div>
        
      {/* Teacher name in Certificate of Transfer section - keep ALL CAPS */}
<div style={{ position: 'absolute', left: '949px', top: '614px', zIndex: 3 }}>
  <div style={{ width: '158px', height: '16px', fontFamily: 'Arial', fontSize: '10pt', fontWeight: 'bold', color: '#000000', lineHeight: '16px', textAlign: 'center', textTransform: 'uppercase' }}>
    {reportCard?.class?.adviser_name?.toUpperCase() || "TEACHER NAME"}
  </div>
</div>

<div style={{ position: 'absolute', left: '945px', top: '631px', zIndex: 3, borderTop: '1px solid #000000' }}>
  <div style={{ width: '166px', height: '7px', fontFamily: 'Arial', fontSize: '11pt', color: '#000000', lineHeight: '17px', textAlign: 'left' }}></div>
</div>

{/* Teacher title in Certificate of Transfer section - keep original case */}
<div style={{ position: 'absolute', left: '949px', top: '634px', zIndex: 3 }}>
  <div style={{ width: '158px', height: '16px', fontFamily: 'Arial', fontSize: '10pt', color: '#000000', lineHeight: '16px', textAlign: 'center' }}>
    {reportCard?.class?.adviser_title || 'Teacher'}
  </div>
</div>
        
        <div style={{ position: 'absolute', left: '945px', top: '631px', zIndex: 3, borderTop: '1px solid #000000' }}>
          <div style={{ width: '166px', height: '7px', fontFamily: 'Arial', fontSize: '11pt', color: '#000000', lineHeight: '17px', textAlign: 'left' }}></div>
        </div>
        
        {/* Cancellation of Eligibility */}
        <div style={{ position: 'absolute', left: '598px', top: '681px', zIndex: 3 }}>
          <div style={{ width: '525px', height: '16px', fontFamily: 'Arial', fontSize: '10pt', fontWeight: 'bold', color: '#000000', lineHeight: '16px', textAlign: 'center' }}>
            Cancellation of Eligibility to Transfer
          </div>
        </div>
        
        <div style={{ position: 'absolute', left: '596px', top: '709px', zIndex: 3 }}>
          <div style={{ width: '119px', height: '16px', fontFamily: 'Arial', fontSize: '10pt', color: '#000000', lineHeight: '16px', textAlign: 'left' }}>
            Admitted in:
          </div>
        </div>

        <div style={{ position: 'absolute', left: '684px', top: '722px', zIndex: 3, borderTop: '1px solid #000000' }}>
          <div style={{ width: '192px', height: '7px', fontFamily: 'Arial', fontSize: '11pt', color: '#000000', lineHeight: '17px', textAlign: 'left' }}></div>
        </div>

        <div style={{ position: 'absolute', left: '596px', top: '728px', zIndex: 3 }}>
          <div style={{ width: '119px', height: '16px', fontFamily: 'Arial', fontSize: '10pt', color: '#000000', lineHeight: '16px', textAlign: 'left' }}>
            Date:
          </div>
        </div>

        <div style={{ position: 'absolute', left: '686px', top: '741px', zIndex: 3, borderTop: '1px solid #000000' }}>
          <div style={{ width: '192px', height: '7px', fontFamily: 'Arial', fontSize: '11pt', color: '#000000', lineHeight: '17px', textAlign: 'left' }}></div>
        </div>
        
        <div style={{ position: 'absolute', left: '936px', top: '761px', zIndex: 3, borderTop: '1px solid #000000' }}>
          <div style={{ width: '192px', height: '7px', fontFamily: 'Arial', fontSize: '11pt', color: '#000000', lineHeight: '17px', textAlign: 'left' }}></div>
        </div>
        
        <div style={{ position: 'absolute', left: '940px', top: '764px', zIndex: 3 }}>
          <div style={{ width: '184px', height: '17px', fontFamily: 'Arial', fontSize: '10pt', color: '#000000', lineHeight: '16px', textAlign: 'center' }}>
            Principal
          </div>
        </div>
        
        {/* School Logos */}
        <div style={{ position: 'absolute', left: '594px', top: '53px', zIndex: 0 }}></div>
        <div style={{ position: 'absolute', left: '594px', top: '53px', zIndex: 1 }}>
          <img src={leftLogoImg} style={{ border: 0 }} alt="" onError={handleImageError} />
        </div>

        <div style={{ position: 'absolute', left: '1034px', top: '52px', zIndex: 0 }}></div>
        <div style={{ position: 'absolute', left: '1034px', top: '52px', zIndex: 1 }}>
          <img src={rightLogoImg} style={{ border: 0 }} alt="" onError={handleImageError}  />
        </div>

      </div>
      
      {/* Print CSS */}
<style dangerouslySetInnerHTML={{ 
  __html: `
    @media print {
      @page { 
        size: landscape;
        margin: 0.5cm;
      }
      body {
        font-family: Arial, sans-serif;
        margin: 0;
        padding: 0 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .container {
        width: 100% !important;
        max-width: 100% !important;
        padding: 0 !important;
        margin: 0 !important;
      }
      img {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      /* Hide navigation and controls when printing */
      nav, .print\\:hidden {
        display: none !important;
      }
      /* Reset padding that we added to avoid navbar overlap */
      .container {
        padding-top: 0 !important;
      }
    }
  `
}} />
    </div>
  );
};

export default TeacherFrontCard;