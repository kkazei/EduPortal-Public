import React, { useState, useEffect } from "react";
import './reportCardStyles.css';
import { useParams, useNavigate } from "react-router-dom";
import { useGradeStore } from "../../../store/gradeStore";
import { useStudentStore } from "../../../store/studentStore";
import { useSchoolYearStore } from "../../../store/schoolYearStore";
import toast from "react-hot-toast";
import { ChevronLeft, ChevronRight, Printer } from "lucide-react";

// Path to the images - these should be in your public folder
const leftBackgroundImg = "/IMG8F32.gif";  
const rightBackgroundImg = "/IMG901D.gif";

// Add image loading error handling
const handleImageError = (e) => {
  console.error("Image failed to load:", e.target.src);
  e.target.style.backgroundColor = "#f0f0f0";
};


const TeacherBackCard = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getStudentCard, isLoading, error } = useGradeStore();
  const { fetchStudentById, getClassStudents } = useStudentStore(); // Change this line
  
  const [student, setStudent] = useState(null);
  const [reportCard, setReportCard] = useState(null);
  const [schoolYear, setSchoolYear] = useState(`${new Date().getFullYear()}-${new Date().getFullYear() + 1}`);
  const selectedYear = useSchoolYearStore((s) => s.selected);
  const fetchYears = useSchoolYearStore((s) => s.fetchYears);
  const [printGradesOnly, setPrintGradesOnly] = useState(false);
  const [activeQuarter, setActiveQuarter] = useState(0); // 0 = all quarters, 1-4 = specific quarter
  
  // Navigation states
  const [classStudents, setClassStudents] = useState([]);
  const [currentStudentIndex, setCurrentStudentIndex] = useState(-1);
  const [studentInfo, setStudentInfo] = useState(null);

  // Load student data from ID in URL params
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

  // Load class students for navigation - update this useEffect
  useEffect(() => {
    const loadClassStudents = async () => {
      if (!student?.class_id) return;
      
      try {
        const studentsData = await getClassStudents(student.class_id); // Use getClassStudents
        
        // Sort students: males first (alphabetically), then females (alphabetically)
        const sortedStudents = [...studentsData].sort((a, b) => {
          const genderA = a.sex?.toLowerCase() || '';
          const genderB = b.sex?.toLowerCase() || '';
          
          // If genders are different, males come first
          if (genderA !== genderB) {
            if (genderA === 'male') return -1;
            if (genderB === 'male') return 1;
          }
          
          // If same gender or both unknown, sort alphabetically by last name, then first name
          const lastNameComparison = (a.last_name || '').localeCompare(b.last_name || '');
          if (lastNameComparison !== 0) return lastNameComparison;
          
          return (a.first_name || '').localeCompare(b.first_name || '');
        });
        
        setClassStudents(sortedStudents);
        
        // Find current student's position in sorted list
        const currentIndex = sortedStudents.findIndex(s => s.id === parseInt(id));
        setCurrentStudentIndex(currentIndex);
        
        // Set up student info for navigation
        if (currentIndex !== -1) {
          setStudentInfo({
            position: currentIndex + 1,
            total: sortedStudents.length,
            previous: currentIndex > 0 ? sortedStudents[currentIndex - 1] : null,
            next: currentIndex < sortedStudents.length - 1 ? sortedStudents[currentIndex + 1] : null
          });
        }
      } catch (error) {
        console.error("Failed to load class students:", error);
      }
    };
    
    if (student?.class_id) {
      loadClassStudents();
    }
  }, [student, getClassStudents, id]); // Update dependency

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

  // Ensure school years are loaded and sync with global selection
  useEffect(() => {
    fetchYears?.();
  }, [fetchYears]);

  useEffect(() => {
    if (selectedYear && selectedYear !== schoolYear) {
      setSchoolYear(selectedYear);
    }
  }, [selectedYear]);

  // Navigation functions
  const handlePreviousStudent = () => {
    if (currentStudentIndex > 0) {
      const previousStudent = classStudents[currentStudentIndex - 1];
      navigate(`/teacher/student-card/${previousStudent.id}`); 
    }
  };

  const handleNextStudent = () => {
    if (currentStudentIndex < classStudents.length - 1) {
      const nextStudent = classStudents[currentStudentIndex + 1];
      navigate(`/teacher/student-card/${nextStudent.id}`); 
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleBack = () => {
    navigate(`/student/${id}/report-card`);
  };

  const handleViewFrontSide = () => {
    navigate(`/teacher/student-front-card/${id}`);
  };

  // Add this helper function near the top of your component, after the imports
const formatGrade = (grade) => {
  if (!grade) return '';
  // Parse as float first, then convert to integer to remove decimals
  const numericGrade = parseFloat(grade);
  return isNaN(numericGrade) ? '' : Math.round(numericGrade).toString();
};

  // Get remarks based on grade
  const getRemarks = (grade) => {
    const numericGrade = parseFloat(grade);
    return isNaN(numericGrade) ? '' : (numericGrade >= 75 ? "Passed" : "Failed");
  };

  // Show loading state while fetching data
  if (isLoading || !student) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Add this before rendering the subjects
  const processedSubjects = reportCard?.subjects.map(subject => {
    // Check if this is a sub-subject (you can use different conditions based on your data)
    const isSubSubject = 
      subject.subject_name === "Music and Arts" || 
      subject.subject_name === "Physical Education and Health" || 
      subject.subject_name === "ICT" ||
      subject.subject_name === "Robotics";
    
    return {
      ...subject,
      is_sub_subject: isSubSubject
    };
  }) || [];

  // Use report card subjects data only, no default data
  const subjectData = reportCard?.subjects || [];

  // Get average from report card or show dash if not available
  const generalAverage = reportCard?.quarterlyAverages?.final_average;

  // Check if we have any final grades to determine if we should show general average
  const hasFinalGrades = processedSubjects.some(subject => subject.final_grade);

  // Core values data as in StudentCard.jsx
  const coreValues = {
    MakaDiyos: {
      behaviors: [
        "Expresses one's spiritual beliefs while respecting the spiritual beliefs of others.",
        "Shows adherence to ethical principles by upholding truth"
      ],
      ratings: ["AO", "AO", "SO", "AO"]
    },
    Makatao: {
      behaviors: [
        "Is sensitive to individual, social, and cultural differences",
        "Demonstrates contributions toward solidarity"
      ],
      ratings: ["AO", "SO", "SO", "AO"]
    },
    Makakalikasan: {
      behaviors: [
        "Cares for the environment and utilizes resources wisely, judiciously, and economically"
      ],
      ratings: ["SO", "AO", "AO", "AO"]
    },
    Makabansa: {
      behaviors: [
        "Demonstrates pride in being a Filipino; exercises the rights and responsibilities of a Filipino citizen",
        "Demonstrates appropriate behavior in carrying out activities in the school, community, and country"
      ],
      ratings: ["AO", "AO", "AO", "AO"]
    }
  };

  return (
    <div className="container mx-auto px-2 pt-20 pb-4">
      {/* Controls - only visible on screen, modern toolbar */}
      <div className="card-toolbar print:hidden">
        <div className="card-toolbar__group">
          <button onClick={handleBack} className="btn-outline" title="Return to student report list">
            <ChevronLeft size={16} />
            <span>Report List</span>
          </button>
          {studentInfo && (
            <div className="hidden sm:flex flex-col">
              <span className="position-main">Student {studentInfo.position}/{studentInfo.total}</span>
              <span className="position-meta">
                {(() => {
                  const currentGender = student?.sex?.toLowerCase();
                  const genderGroup = classStudents.filter(s => s.sex?.toLowerCase() === currentGender);
                  const currentPositionInGender = genderGroup.findIndex(s => s.id === parseInt(id)) + 1;
                  const genderLabel = currentGender === 'male' ? 'Boys' : currentGender === 'female' ? 'Girls' : 'Students';
                  return `${genderLabel} ${currentPositionInGender}/${genderGroup.length}`;
                })()}
              </span>
            </div>
          )}
        </div>
        <div className="card-toolbar__group">
          <div className="flex items-center gap-2">
            <select
              value={activeQuarter}
              onChange={(e) => setActiveQuarter(parseInt(e.target.value))}
              aria-label="Select quarter to display grades"
            >
              <option value="0">All Quarters</option>
              <option value="1">Q1 Only</option>
              <option value="2">Q2 Only</option>
              <option value="3">Q3 Only</option>
              <option value="4">Q4 Only</option>
            </select>
          </div>
          <button
            onClick={() => setPrintGradesOnly(!printGradesOnly)}
            className={printGradesOnly ? 'btn-accent' : 'btn-secondary'}
            title="Toggle print mode for grades only"
          >
            <span>{printGradesOnly ? 'Grades Only ON' : 'Grades Only OFF'}</span>
          </button>
          <button onClick={handlePrint} className="btn-secondary" title="Print back page">
            <Printer size={14} />
            <span>Print Back</span>
          </button>
          <button onClick={handleViewFrontSide} className="btn-primary" title="Go to front page">
            <span>Front Side</span>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Student Navigation - only visible on screen */}
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
      <div className="relative report-card-page print:w-[1140px] print:h-[780px] mx-auto">
        {/* ... rest of your existing JSX remains the same ... */}
        {/* Left side - Learning Progress */}
        <div style={{ position: 'absolute', left: '29px', top: '105px', width: '535px', height: '378px', zIndex: 0 }}></div>
        <div style={{ position: 'absolute', left: '29px', top: '105px', width: '535px', height: '378px', zIndex: 1 }}>
          <img src={leftBackgroundImg} width="535" height="378" style={{ border: 0 }} alt="" onError={handleImageError}  />
        </div>
        
        {/* Header */}
        <div style={{ position: 'absolute', left: '33px', top: '48px', zIndex: 3 }}>
          <div style={{ width: '518px', height: '16px', fontFamily: 'Arial', fontSize: '10pt', fontWeight: 'bold', color: '#000000', lineHeight: '16px', textAlign: 'center' }}>
            REPORT ON LEARNING PROGRESS AND ACHIEVEMENT
          </div>
        </div>
        
        {/* Learning Areas */}
        <div style={{ position: 'absolute', left: '52px', top: '119px', zIndex: 3 }}>
          <div style={{ width: '238px', height: '16px', fontFamily: 'Arial', fontSize: '10pt', fontWeight: 'bold', color: '#000000', lineHeight: '16px', textAlign: 'center' }}>
            Learning Areas
          </div>
        </div>
        
        {/* Quarter Header */}
        <div style={{ position: 'absolute', left: '319px', top: '109px', zIndex: 3 }}>
          <div style={{ width: '118px', height: '17px', fontFamily: 'Arial', fontSize: '10pt', fontWeight: 'bold', color: '#000000', lineHeight: '17px', textAlign: 'center' }}>
            Quarter
          </div>
        </div>
        
        {/* Quarter Numbers */}
        <div style={{ position: 'absolute', left: '311px', top: '132px', zIndex: 3 }}>
          <div style={{ width: '24px', height: '16px', fontFamily: 'Arial', fontSize: '10pt', fontWeight: 'bold', color: '#000000', lineHeight: '16px', textAlign: 'center' }}>
            1
          </div>
        </div>
        
        <div style={{ position: 'absolute', left: '348px', top: '131px', zIndex: 3 }}>
          <div style={{ width: '23px', height: '17px', fontFamily: 'Arial', fontSize: '10pt', fontWeight: 'bold', color: '#000000', lineHeight: '17px', textAlign: 'center' }}>
            2
          </div>
        </div>
        
        <div style={{ position: 'absolute', left: '379px', top: '132px', zIndex: 3 }}>
          <div style={{ width: '23px', height: '16px', fontFamily: 'Arial', fontSize: '10pt', fontWeight: 'bold', color: '#000000', lineHeight: '16px', textAlign: 'center' }}>
            3
          </div>
        </div>
        
        <div style={{ position: 'absolute', left: '417px', top: '132px', zIndex: 3 }}>
          <div style={{ width: '25px', height: '16px', fontFamily: 'Arial', fontSize: '10pt', fontWeight: 'bold', color: '#000000', lineHeight: '16px', textAlign: 'center' }}>
            4
          </div>
        </div>
        
        {/* Final Grade */}
        <div style={{ position: 'absolute', left: '450px', top: '115px', zIndex: 3 }}>
          <div style={{ width: '46px', height: '36px', fontFamily: 'Arial', fontSize: '10pt', fontWeight: 'bold', color: '#000000', lineHeight: '16px', textAlign: 'center' }}>
            Final Grade
          </div>
        </div>
        
        {/* Remarks */}
        <div style={{ position: 'absolute', left: '500px', top: '119px', zIndex: 3 }}>
          <div style={{ width: '58px', height: '17px', fontFamily: 'Arial', fontSize: '10pt', fontWeight: 'bold', color: '#000000', lineHeight: '16px', textAlign: 'left' }}>
            Remarks
          </div>
        </div>
        
        {/* Dynamic Subjects and Grades */}
        {processedSubjects.map((subject, index) => (
          <React.Fragment key={index}>
            {/* Subject Name - always shown */}
            <div style={{ position: 'absolute', left: '36px', top: `${152 + index * 21}px`, zIndex: 3 }}>
              <div style={{ 
                width: '246px', 
                height: '17px', 
                fontFamily: 'Arial', 
                fontSize: '8pt', 
                fontWeight: subject.is_sub_subject ? 'normal' : 'bold', 
                fontStyle: subject.is_sub_subject ? 'italic' : 'normal',
                paddingLeft: subject.is_sub_subject ? '20px' : '0px', 
                color: '#000000', 
                lineHeight: '13px', 
                textAlign: 'left' 
              }}>
                {subject.subject_name}
              </div>
            </div>
            
            {/* Q1 Grade - only if all quarters or Q1 is selected */}
            {(activeQuarter === 0 || activeQuarter === 1) && (
              <div style={{ position: 'absolute', left: '305px', top: `${152 + index * 21}px`, zIndex: 3 }}>
                <div className="grade-value" style={{ width: '24px', height: '16px', fontFamily: 'Arial', fontSize: '8pt', color: '#000000', lineHeight: '16px', textAlign: 'center' }}>
                  {formatGrade(subject.q1_grade)}
                </div>
              </div>
            )}
            
            {/* Q2 Grade - only if all quarters or Q2 is selected */}
            {(activeQuarter === 0 || activeQuarter === 2) && (
              <div style={{ position: 'absolute', left: '340px', top: `${152 + index * 21}px`, zIndex: 3 }}>
                <div className="grade-value" style={{ width: '23px', height: '16px', fontFamily: 'Arial', fontSize: '8pt', color: '#000000', lineHeight: '16px', textAlign: 'center' }}>
                  {formatGrade(subject.q2_grade)}
                </div>
              </div>
            )}
            
            {/* Q3 Grade - only if all quarters or Q3 is selected */}
            {(activeQuarter === 0 || activeQuarter === 3) && (
              <div style={{ position: 'absolute', left: '379px', top: `${152 + index * 21}px`, zIndex: 3 }}>
                <div className="grade-value" style={{ width: '23px', height: '16px', fontFamily: 'Arial', fontSize: '8pt', color: '#000000', lineHeight: '16px', textAlign: 'center' }}>
                  {formatGrade(subject.q3_grade)}
                </div>
              </div>
            )}
            
            {/* Q4 Grade - only if all quarters or Q4 is selected */}
            {(activeQuarter === 0 || activeQuarter === 4) && (
              <div style={{ position: 'absolute', left: '417px', top: `${152 + index * 21}px`, zIndex: 3 }}>
                <div className="grade-value" style={{ width: '25px', height: '16px', fontFamily: 'Arial', fontSize: '8pt', color: '#000000', lineHeight: '16px', textAlign: 'center' }}>
                  {formatGrade(subject.q4_grade)}
                </div>
              </div>
            )}
            
            {/* Final Grade - only if all quarters selected */}
            {activeQuarter === 0 && (
              <div style={{ position: 'absolute', left: '450px', top: `${152 + index * 21}px`, zIndex: 3 }}>
                <div className="grade-value" style={{ width: '46px', height: '16px', fontFamily: 'Arial', fontSize: '8pt', color: '#000000', lineHeight: '16px', textAlign: 'center' }}>
                  {formatGrade(subject.final_grade)}
                </div>
              </div>
            )}
            
            {/* Remarks - only if all quarters selected */}
            {activeQuarter === 0 && (
              <div style={{ position: 'absolute', left: '500px', top: `${152 + index * 21}px`, zIndex: 3 }}>
                <div style={{ width: '58px', height: '16px', fontFamily: 'Arial', fontSize: '10pt', color: '#000000', lineHeight: '16px', textAlign: 'center' }}>
                  {subject.final_grade ? getRemarks(subject.final_grade) : ''}
                </div>
              </div>
            )}
          </React.Fragment>
        ))}

        {/* General Average row - always show the text, but only show values if we have final grades and showing all quarters */}
        {activeQuarter === 0 && (
          <>
            <div style={{ position: 'absolute', left: '36px', top: '460px', zIndex: 3 }}>
              <div style={{ width: '400px', height: '16px', fontFamily: 'Arial', fontSize: '10pt', fontWeight: 'bold', color: '#000000', lineHeight: '16px', textAlign: 'center' }}>
                General Average
              </div>
            </div>
            
            {/* Only show the average value if we have final grades */}
            {hasFinalGrades && (
              <>
                <div style={{ position: 'absolute', left: '450px', top: '460px', zIndex: 3 }}>
                  <div className="grade-value" style={{ width: '46px', height: '16px', fontFamily: 'Arial', fontSize: '10pt', fontWeight: 'bold', color: '#000000', lineHeight: '16px', textAlign: 'center' }}>
                    {formatGrade(generalAverage)}
                  </div>
                </div>
                
                <div style={{ position: 'absolute', left: '500px', top: '460px', zIndex: 3 }}>
                  <div style={{ width: '58px', height: '16px', fontFamily: 'Arial', fontSize: '10pt', fontWeight: 'bold', color: '#000000', lineHeight: '16px', textAlign: 'center' }}>
                    {generalAverage ? getRemarks(formatGrade(generalAverage)) : ''}
                  </div>
                </div>
              </>
            )}
          </>
        )}
        
        {/* ... rest of your existing JSX code for grading scale, core values, etc. ... */}
        {/* I'll skip the repetitive code to keep this response concise */}
        {/* All the grading scale and core values sections remain exactly the same */}
        
        {/* Grading Scale Section */}
        <div style={{ position: 'absolute', left: '52px', top: '536px', zIndex: 3 }}>
          <div style={{ width: '119px', height: '16px', fontFamily: 'Arial', fontSize: '10pt', fontWeight: 'bold', color: '#000000', lineHeight: '16px', textAlign: 'left' }}>
            Descriptors
          </div>
        </div>
        
        <div style={{ position: 'absolute', left: '239px', top: '536px', zIndex: 3 }}>
          <div style={{ width: '118px', height: '16px', fontFamily: 'Arial', fontSize: '10pt', fontWeight: 'bold', color: '#000000', lineHeight: '16px', textAlign: 'center' }}>
            Grading Scale
          </div>
        </div>
        
        <div style={{ position: 'absolute', left: '445px', top: '536px', zIndex: 3 }}>
          <div style={{ width: '85px', height: '16px', fontFamily: 'Arial', fontSize: '10pt', fontWeight: 'bold', color: '#000000', lineHeight: '16px', textAlign: 'left' }}>
            Remarks
          </div>
        </div>
        
        {/* Grading Scale Rows */}
        <div style={{ position: 'absolute', left: '52px', top: '569px', zIndex: 3 }}>
          <div style={{ width: '119px', height: '16px', fontFamily: 'Arial', fontSize: '10pt', color: '#000000', lineHeight: '16px', textAlign: 'left' }}>
            Outstanding
          </div>
        </div>
        <div style={{ position: 'absolute', left: '239px', top: '569px', zIndex: 3 }}>
          <div style={{ width: '118px', height: '16px', fontFamily: 'Arial', fontSize: '10pt', color: '#000000', lineHeight: '16px', textAlign: 'center' }}>
            90 - 100
          </div>
        </div>
        <div style={{ position: 'absolute', left: '442px', top: '569px', zIndex: 3 }}>
          <div style={{ width: '118px', height: '16px', fontFamily: 'Arial', fontSize: '10pt', color: '#000000', lineHeight: '16px', textAlign: 'left' }}>
            Passed
          </div>
        </div>
        
        <div style={{ position: 'absolute', left: '52px', top: '593px', zIndex: 3 }}>
          <div style={{ width: '119px', height: '17px', fontFamily: 'Arial', fontSize: '10pt', color: '#000000', lineHeight: '16px', textAlign: 'left' }}>
            Very Satisfactory
          </div>
        </div>
        <div style={{ position: 'absolute', left: '239px', top: '593px', zIndex: 3 }}>
          <div style={{ width: '118px', height: '17px', fontFamily: 'Arial', fontSize: '10pt', color: '#000000', lineHeight: '16px', textAlign: 'center' }}>
            85 - 89
          </div>
        </div>
        <div style={{ position: 'absolute', left: '442px', top: '593px', zIndex: 3 }}>
          <div style={{ width: '118px', height: '16px', fontFamily: 'Arial', fontSize: '10pt', color: '#000000', lineHeight: '16px', textAlign: 'left' }}>
            Passed
          </div>
        </div>
        
        <div style={{ position: 'absolute', left: '52px', top: '618px', zIndex: 3 }}>
          <div style={{ width: '119px', height: '16px', fontFamily: 'Arial', fontSize: '10pt', color: '#000000', lineHeight: '16px', textAlign: 'left' }}>
            Satisfactory
          </div>
        </div>
        <div style={{ position: 'absolute', left: '239px', top: '618px', zIndex: 3 }}>
          <div style={{ width: '118px', height: '16px', fontFamily: 'Arial', fontSize: '10pt', color: '#000000', lineHeight: '16px', textAlign: 'center' }}>
            80 - 84
          </div>
        </div>
        <div style={{ position: 'absolute', left: '442px', top: '616px', zIndex: 3 }}>
          <div style={{ width: '118px', height: '16px', fontFamily: 'Arial', fontSize: '10pt', color: '#000000', lineHeight: '16px', textAlign: 'left' }}>
            Passed
          </div>
        </div>
        
        <div style={{ position: 'absolute', left: '52px', top: '642px', zIndex: 3 }}>
          <div style={{ width: '119px', height: '17px', fontFamily: 'Arial', fontSize: '10pt', color: '#000000', lineHeight: '16px', textAlign: 'left' }}>
            Fairly Satisfactory
          </div>
        </div>
        <div style={{ position: 'absolute', left: '239px', top: '642px', zIndex: 3 }}>
          <div style={{ width: '118px', height: '17px', fontFamily: 'Arial', fontSize: '10pt', color: '#000000', lineHeight: '16px', textAlign: 'center' }}>
            75 - 79
          </div>
        </div>
        <div style={{ position: 'absolute', left: '442px', top: '640px', zIndex: 3 }}>
          <div style={{ width: '118px', height: '16px', fontFamily: 'Arial', fontSize: '10pt', color: '#000000', lineHeight: '16px', textAlign: 'left' }}>
            Passed
          </div>
        </div>
        
        <div style={{ position: 'absolute', left: '52px', top: '667px', zIndex: 3 }}>
          <div style={{ width: '179px', height: '16px', fontFamily: 'Arial', fontSize: '10pt', color: '#000000', lineHeight: '16px', textAlign: 'left' }}>
            Did Not Meet Expectations
          </div>
        </div>
        <div style={{ position: 'absolute', left: '239px', top: '666px', zIndex: 3 }}>
          <div style={{ width: '118px', height: '17px', fontFamily: 'Arial', fontSize: '10pt', color: '#000000', lineHeight: '16px', textAlign: 'center' }}>
            Below 75
          </div>
        </div>
        <div style={{ position: 'absolute', left: '442px', top: '666px', zIndex: 3 }}>
          <div style={{ width: '118px', height: '16px', fontFamily: 'Arial', fontSize: '10pt', color: '#000000', lineHeight: '16px', textAlign: 'left' }}>
            Failed
          </div>
        </div>
        
        {/* Right side - Core Values */}
        <div style={{ position: 'absolute', left: '583px', top: '108px', width: '534px', height: '404px', zIndex: 0 }}></div>
        <div style={{ position: 'absolute', left: '583px', top: '108px', width: '534px', height: '404px', zIndex: 1 }}>
          <img src={rightBackgroundImg} width="534" height="404" style={{ border: 0 }} alt="" onError={handleImageError}  />
        </div>
        
        {/* Header */}
        <div style={{ position: 'absolute', left: '606px', top: '63px', zIndex: 3 }}>
          <div style={{ width: '488px', height: '16px', fontFamily: 'Arial', fontSize: '10pt', fontWeight: 'bold', color: '#000000', lineHeight: '16px', textAlign: 'center' }}>
            REPORT ON LEARNER'S OBSERVED VALUES
          </div>
        </div>
        
        {/* Table Headers */}
        <div style={{ position: 'absolute', left: '606px', top: '130px', zIndex: 3 }}>
          <div style={{ width: '118px', height: '16px', fontFamily: 'Arial', fontSize: '10pt', fontWeight: 'bold', color: '#000000', lineHeight: '16px', textAlign: 'center' }}>
            Core values
          </div>
        </div>
        
        <div style={{ position: 'absolute', left: '768px', top: '130px', zIndex: 3 }}>
          <div style={{ width: '180px', height: '17px', fontFamily: 'Arial', fontSize: '10pt', fontWeight: 'bold', color: '#000000', lineHeight: '17px', textAlign: 'center' }}>
            Behavior Statements
          </div>
        </div>
        
        <div style={{ position: 'absolute', left: '986px', top: '115px', zIndex: 3 }}>
          <div style={{ width: '118px', height: '17px', fontFamily: 'Arial', fontSize: '10pt', fontWeight: 'bold', color: '#000000', lineHeight: '17px', textAlign: 'center' }}>
            Quarter
          </div>
        </div>
        
        <div style={{ position: 'absolute', left: '986px', top: '143px', zIndex: 3 }}>
          <div style={{ width: '18px', height: '16px', fontFamily: 'Arial', fontSize: '10pt', fontWeight: 'bold', color: '#000000', lineHeight: '16px', textAlign: 'center' }}>
            1
          </div>
        </div>
        
        <div style={{ position: 'absolute', left: '1016px', top: '143px', zIndex: 3 }}>
          <div style={{ width: '25px', height: '16px', fontFamily: 'Arial', fontSize: '10pt', fontWeight: 'bold', color: '#000000', lineHeight: '16px', textAlign: 'center' }}>
            2
          </div>
        </div>
        
        <div style={{ position: 'absolute', left: '1049px', top: '144px', zIndex: 3 }}>
          <div style={{ width: '26px', height: '16px', fontFamily: 'Arial', fontSize: '10pt', fontWeight: 'bold', color: '#000000', lineHeight: '16px', textAlign: 'center' }}>
            3
          </div>
        </div>
        
        <div style={{ position: 'absolute', left: '1087px', top: '144px', zIndex: 3 }}>
          <div style={{ width: '21px', height: '17px', fontFamily: 'Arial', fontSize: '10pt', fontWeight: 'bold', color: '#000000', lineHeight: '17px', textAlign: 'center' }}>
            4
          </div>
        </div>
        
        {/* Maka-Diyos */}
        <div style={{ position: 'absolute', left: '606px', top: '206px', zIndex: 3 }}>
          <div style={{ width: '118px', height: '16px', fontFamily: 'Arial', fontSize: '10pt', fontWeight: 'bold', color: '#000000', lineHeight: '16px', textAlign: 'left' }}>
            Maka-Diyos
          </div>
        </div>
        
        <div style={{ position: 'absolute', left: '749px', top: '177px', zIndex: 3 }}>
          <div style={{ width: '229px', height: '54px', fontFamily: 'Arial', fontSize: '9pt', color: '#000000', lineHeight: '14px', textAlign: 'left' }}>
            {coreValues.MakaDiyos.behaviors[0]}
          </div>
        </div>
        
        <div style={{ position: 'absolute', left: '753px', top: '219px', zIndex: 3 }}>
          <div style={{ width: '215px', height: '35px', fontFamily: 'Arial', fontSize: '9pt', color: '#000000', lineHeight: '14px', textAlign: 'left' }}>
            {coreValues.MakaDiyos.behaviors[1]}
          </div>
        </div>
        
        {/* Makatao */}
        <div style={{ position: 'absolute', left: '606px', top: '299px', zIndex: 3 }}>
          <div style={{ width: '118px', height: '16px', fontFamily: 'Arial', fontSize: '10pt', fontWeight: 'bold', color: '#000000', lineHeight: '16px', textAlign: 'left' }}>
            Makatao
          </div>
        </div>
        
        <div style={{ position: 'absolute', left: '749px', top: '259px', zIndex: 3 }}>
          <div style={{ width: '229px', height: '40px', fontFamily: 'Arial', fontSize: '9pt', color: '#000000', lineHeight: '14px', textAlign: 'left' }}>
            {coreValues.Makatao.behaviors[0]}
          </div>
        </div>
        
        <div style={{ position: 'absolute', left: '749px', top: '311px', zIndex: 3 }}>
          <div style={{ width: '229px', height: '38px', fontFamily: 'Arial', fontSize: '9pt', color: '#000000', lineHeight: '14px', textAlign: 'left' }}>
            {coreValues.Makatao.behaviors[1]}
          </div>
        </div>
        
        {/* Makakalikasan */}
        <div style={{ position: 'absolute', left: '606px', top: '376px', zIndex: 3 }}>
          <div style={{ width: '118px', height: '16px', fontFamily: 'Arial', fontSize: '10pt', fontWeight: 'bold', color: '#000000', lineHeight: '16px', textAlign: 'left' }}>
            Makakalikasan
          </div>
        </div>
        
        <div style={{ position: 'absolute', left: '749px', top: '356px', zIndex: 3 }}>
          <div style={{ width: '229px', height: '49px', fontFamily: 'Arial', fontSize: '9pt', color: '#000000', lineHeight: '14px', textAlign: 'left' }}>
            {coreValues.Makakalikasan.behaviors[0]}
          </div>
        </div>
        
        {/* Makabansa */}
        <div style={{ position: 'absolute', left: '606px', top: '449px', zIndex: 3 }}>
          <div style={{ width: '118px', height: '17px', fontFamily: 'Arial', fontSize: '10pt', fontWeight: 'bold', color: '#000000', lineHeight: '17px', textAlign: 'left' }}>
            Makabansa
          </div>
        </div>
        
        <div style={{ position: 'absolute', left: '749px', top: '410px', zIndex: 3 }}>
          <div style={{ width: '229px', height: '43px', fontFamily: 'Arial', fontSize: '9pt', color: '#000000', lineHeight: '14px', textAlign: 'left' }}>
            {coreValues.Makabansa.behaviors[0]}
          </div>
        </div>
        
        <div style={{ position: 'absolute', left: '749px', top: '460px', zIndex: 3 }}>
          <div style={{ width: '229px', height: '41px', fontFamily: 'Arial', fontSize: '9pt', color: '#000000', lineHeight: '14px', textAlign: 'left' }}>
            {coreValues.Makabansa.behaviors[1]}
          </div>
        </div>
        
        {/* Marking */}
        <div style={{ position: 'absolute', left: '686px', top: '548px', zIndex: 3 }}>
          <div style={{ width: '118px', height: '17px', fontFamily: 'Arial', fontSize: '10pt', fontWeight: 'bold', color: '#000000', lineHeight: '17px', textAlign: 'left' }}>
            Marking
          </div>
        </div>
        
        <div style={{ position: 'absolute', left: '873px', top: '548px', zIndex: 3 }}>
          <div style={{ width: '202px', height: '16px', fontFamily: 'Arial', fontSize: '10pt', fontWeight: 'bold', color: '#000000', lineHeight: '16px', textAlign: 'left' }}>
            Non-numerical Rating
          </div>
        </div>
        
        {/* Marking Scale */}
        <div style={{ position: 'absolute', left: '686px', top: '581px', zIndex: 3 }}>
          <div style={{ width: '118px', height: '17px', fontFamily: 'Arial', fontSize: '10pt', color: '#000000', lineHeight: '17px', textAlign: 'left' }}>
            AO
          </div>
        </div>
        <div style={{ position: 'absolute', left: '873px', top: '582px', zIndex: 3 }}>
          <div style={{ width: '202px', height: '16px', fontFamily: 'Arial', fontSize: '10pt', color: '#000000', lineHeight: '16px', textAlign: 'left' }}>
            Always Observed
          </div>
        </div>
        
        <div style={{ position: 'absolute', left: '686px', top: '606px', zIndex: 3 }}>
          <div style={{ width: '118px', height: '16px', fontFamily: 'Arial', fontSize: '10pt', color: '#000000', lineHeight: '16px', textAlign: 'left' }}>
            SO
          </div>
        </div>
        <div style={{ position: 'absolute', left: '873px', top: '606px', zIndex: 3 }}>
          <div style={{ width: '202px', height: '17px', fontFamily: 'Arial', fontSize: '10pt', color: '#000000', lineHeight: '17px', textAlign: 'left' }}>
            Sometimes Observed
          </div>
        </div>
        
        <div style={{ position: 'absolute', left: '686px', top: '630px', zIndex: 3 }}>
          <div style={{ width: '118px', height: '17px', fontFamily: 'Arial', fontSize: '10pt', color: '#000000', lineHeight: '17px', textAlign: 'left' }}>
            RO
          </div>
        </div>
        <div style={{ position: 'absolute', left: '873px', top: '630px', zIndex: 3 }}>
          <div style={{ width: '202px', height: '17px', fontFamily: 'Arial', fontSize: '10pt', color: '#000000', lineHeight: '17px', textAlign: 'left' }}>
            Rarely Observed
          </div>
        </div>
        
        <div style={{ position: 'absolute', left: '686px', top: '655px', zIndex: 3 }}>
          <div style={{ width: '118px', height: '16px', fontFamily: 'Arial', fontSize: '10pt', color: '#000000', lineHeight: '16px', textAlign: 'left' }}>
            NO
          </div>
        </div>
        <div style={{ position: 'absolute', left: '873px', top: '655px', zIndex: 3 }}>
          <div style={{ width: '202px', height: '16px', fontFamily: 'Arial', fontSize: '10pt', color: '#000000', lineHeight: '16px', textAlign: 'left' }}>
            Not Observed
          </div>
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

      ${printGradesOnly ? `
        /* Hide everything except grade values */
        .container * {
          visibility: hidden !important;
          background-color: transparent !important;
          border: none !important;
          color: black !important;
        }
        
        /* Only show the actual grade values */
        .grade-value {
          visibility: visible !important;
        }
        
        /* Make background images disappear */
        img {
          display: none !important;
        }
      ` : ''}
    }
  `
}} />
    </div>
  );
};
export default TeacherBackCard;