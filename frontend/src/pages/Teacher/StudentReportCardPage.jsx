import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useGradeStore } from "../../store/gradeStore";
import { useStudentStore } from "../../store/studentStore";
import { useSchoolYearStore } from "../../store/schoolYearStore";
import { toast } from "react-hot-toast";
import { 
  ChevronLeft, 
  ChevronRight, 
  Save, 
  Printer, 
  User, 
  Book, 
  Calendar,
  Award,
  FileEdit,
  Loader,
  UserCheck
} from "lucide-react";

const StudentReportCardPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getStudentReportCard, updateMultipleGrades, isLoading: gradeLoading, error: gradeError, message: gradeMessage } = useGradeStore();
  const { fetchStudentById, isLoading: studentLoading, error: studentError, fetchStudentsByClass } = useStudentStore();
  
  const [student, setStudent] = useState(null);
  const [reportCard, setReportCard] = useState(null);
  const [grades, setGrades] = useState({});
  const [schoolYear, setSchoolYear] = useState(`${new Date().getFullYear()}-${new Date().getFullYear() + 1}`);
  const selectedYear = useSchoolYearStore((s) => s.selected);
  const years = useSchoolYearStore((s) => s.years);
  const fetchYears = useSchoolYearStore((s) => s.fetchYears);
  const selectYear = useSchoolYearStore((s) => s.selectYear);
  const [isSaving, setIsSaving] = useState(false);
  const [classStudents, setClassStudents] = useState([]);
  const [currentStudentIndex, setCurrentStudentIndex] = useState(-1);
  
  // Keyboard navigation state
  const [focusedCell, setFocusedCell] = useState({ subjectIndex: 0, quarter: 'q1_grade' });
  const [isNavigationMode, setIsNavigationMode] = useState(false);
  const inputRefs = useRef({});

  // Ensure school years are loaded and sync local state with global selection
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

  // Create a ref for each input
  const createInputRef = (subjectId, quarter) => {
    const key = `${subjectId}-${quarter}`;
    if (!inputRefs.current[key]) {
      inputRefs.current[key] = React.createRef();
    }
    return inputRefs.current[key];
  };

  // Get ordered subjects and quarters for navigation
  const getNavigationOrder = () => {
    if (!reportCard?.subjects) return { subjects: [], quarters: [] };
    
    const subjects = reportCard.subjects;
    const quarters = ['q1_grade', 'q2_grade', 'q3_grade', 'q4_grade'];
    
    return { subjects, quarters };
  };

  // Focus specific cell
  const focusCell = (subjectIndex, quarter) => {
    const { subjects } = getNavigationOrder();
    
    if (subjects[subjectIndex]) {
      const subjectId = subjects[subjectIndex].id;
      const key = `${subjectId}-${quarter}`;
      const inputRef = inputRefs.current[key];
      
      if (inputRef?.current) {
        inputRef.current.focus();
        inputRef.current.select(); // Select all text for easy overwriting
        setFocusedCell({ subjectIndex, quarter });
      }
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e, subjectId, quarter) => {
    const { subjects, quarters } = getNavigationOrder();
    const currentSubjectIndex = subjects.findIndex(s => s.id === subjectId);
    const currentQuarterIndex = quarters.indexOf(quarter);

    // Arrow key navigation
    if (e.key === 'ArrowRight' || (e.key === 'Tab' && !e.shiftKey)) {
      e.preventDefault();
      
      // Move to next quarter in same subject
      if (currentQuarterIndex < quarters.length - 1) {
        focusCell(currentSubjectIndex, quarters[currentQuarterIndex + 1]);
      } 
      // Move to first quarter of next subject
      else if (currentSubjectIndex < subjects.length - 1) {
        focusCell(currentSubjectIndex + 1, quarters[0]);
      }
      // Wrap to first cell if at the end
      else {
        focusCell(0, quarters[0]);
      }
    }
    
    else if (e.key === 'ArrowLeft' || (e.key === 'Tab' && e.shiftKey)) {
      e.preventDefault();
      
      // Move to previous quarter in same subject
      if (currentQuarterIndex > 0) {
        focusCell(currentSubjectIndex, quarters[currentQuarterIndex - 1]);
      }
      // Move to last quarter of previous subject
      else if (currentSubjectIndex > 0) {
        focusCell(currentSubjectIndex - 1, quarters[quarters.length - 1]);
      }
      // Wrap to last cell if at the beginning
      else {
        focusCell(subjects.length - 1, quarters[quarters.length - 1]);
      }
    }
    
    else if (e.key === 'ArrowDown') {
      e.preventDefault();
      
      // Move to same quarter in next subject
      if (currentSubjectIndex < subjects.length - 1) {
        focusCell(currentSubjectIndex + 1, quarter);
      }
      // Wrap to first subject
      else {
        focusCell(0, quarter);
      }
    }
    
    else if (e.key === 'ArrowUp') {
      e.preventDefault();
      
      // Move to same quarter in previous subject
      if (currentSubjectIndex > 0) {
        focusCell(currentSubjectIndex - 1, quarter);
      }
      // Wrap to last subject
      else {
        focusCell(subjects.length - 1, quarter);
      }
    }
    
    // Enter key - move down
    else if (e.key === 'Enter') {
      e.preventDefault();
      
      if (currentSubjectIndex < subjects.length - 1) {
        focusCell(currentSubjectIndex + 1, quarter);
      } else {
        focusCell(0, quarter);
      }
    }
    
    // Escape key - exit navigation mode
    else if (e.key === 'Escape') {
      e.preventDefault();
      setIsNavigationMode(false);
      e.target.blur();
    }
    
    // Ctrl+S - Save grades
    else if (e.ctrlKey && e.key === 's') {
      e.preventDefault();
      handleSaveGrades();
    }
  };

  // Handle input focus
  const handleInputFocus = (subjectId, quarter) => {
    const { subjects } = getNavigationOrder();
    const subjectIndex = subjects.findIndex(s => s.id === subjectId);
    setFocusedCell({ subjectIndex, quarter });
    setIsNavigationMode(true);
  };

  // Handle input blur
  const handleInputBlur = () => {
    // Small delay to check if focus moved to another input
    setTimeout(() => {
      const activeElement = document.activeElement;
      const isGradeInput = activeElement?.className?.includes('grade-input');
      
      if (!isGradeInput) {
        setIsNavigationMode(false);
      }
    }, 100);
  };

  // Enhanced grade change handler
  const handleGradeChange = (subjectId, field, value) => {
    // Allow up to 3 digits before decimal and up to 2 after decimal
    if (value !== '' && !/^\d{1,3}(\.\d{0,2})?$/.test(value)) {
      return;
    }

    // Convert to float and ensure it's within 0-100
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && (numValue < 0 || numValue > 100)) {
      return;
    }
    
    setGrades(prev => ({
      ...prev,
      [subjectId]: {
        ...(prev[subjectId] || {}),
        [field]: value
      }
    }));
  };

  // Add keyboard shortcut hints
  const KeyboardHints = () => (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 print:hidden">
      <h4 className="text-sm font-semibold text-blue-800 mb-2">Keyboard Shortcuts:</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs text-blue-700">
        <div><kbd className="bg-white px-1 rounded border">↑↓←→</kbd> Navigate cells</div>
        <div><kbd className="bg-white px-1 rounded border">Tab</kbd> Next cell</div>
        <div><kbd className="bg-white px-1 rounded border">Enter</kbd> Move down</div>
        <div><kbd className="bg-white px-1 rounded border">Ctrl+S</kbd> Save grades</div>
      </div>
    </div>
  );

  useEffect(() => {
    const loadData = async () => {
      try {
        const studentData = await fetchStudentById(id);
        setStudent(studentData);
        
        // Load all students from the same class
        if (studentData?.class_id) {
          const studentsInClass = await fetchStudentsByClass(studentData.class_id);
          
          // Sort students by gender first, then alphabetically
          const sortedStudents = studentsInClass.data.sort((a, b) => {
            // First sort by gender (Male first, then Female)
            if (a.sex !== b.sex) {
              if (a.sex === 'Male' && b.sex === 'Female') return -1;
              if (a.sex === 'Female' && b.sex === 'Male') return 1;
            }
            
            // Then sort by last name within each gender group
            const lastNameA = (a.last_name || '').toLowerCase();
            const lastNameB = (b.last_name || '').toLowerCase();
            if (lastNameA < lastNameB) return -1;
            if (lastNameA > lastNameB) return 1;
            
            // If last names are the same, sort by first name
            const firstNameA = (a.first_name || '').toLowerCase();
            const firstNameB = (b.first_name || '').toLowerCase();
            return firstNameA.localeCompare(firstNameB);
          });
          
          setClassStudents(sortedStudents);
          const index = sortedStudents.findIndex(s => s.id === parseInt(id));
          setCurrentStudentIndex(index);
        }
        
        const reportCardData = await getStudentReportCard(id, schoolYear);
        setReportCard(reportCardData);
        
        const initialGrades = {};
        if (reportCardData.subjects) {
          reportCardData.subjects.forEach(subject => {
            initialGrades[subject.id] = {
              q1_grade: subject.q1_grade ?? '',
              q2_grade: subject.q2_grade ?? '',
              q3_grade: subject.q3_grade ?? '',
              q4_grade: subject.q4_grade ?? ''
            };
          });
        }
        setGrades(initialGrades);
      } catch (error) {
        console.error("Failed to load student data:", error);
        toast.error("Failed to load student report card");
      }
    };
    
    loadData();
  }, [id, schoolYear, fetchStudentById, getStudentReportCard, fetchStudentsByClass]);

  // Add global keyboard listener for when not focused on inputs
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      // Only handle if not focused on an input
      if (document.activeElement?.tagName !== 'INPUT') {
        if (e.key === 'Tab' || e.key === 'Enter') {
          e.preventDefault();
          // Focus first cell
          const { subjects, quarters } = getNavigationOrder();
          if (subjects.length > 0) {
            focusCell(0, quarters[0]);
          }
        }
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [reportCard]);

  useEffect(() => {
    if (gradeMessage) {
      toast.success(gradeMessage);
    }
    if (gradeError) {
      toast.error(gradeError);
    }
    if (studentError) {
      toast.error(studentError);
    }
  }, [gradeMessage, gradeError, studentError]);

  const handleSaveGrades = async () => {
    if (isSaving) return;
    
    setIsSaving(true);
    try {
      // Process grades to ensure empty strings remain null in the backend
      const processedGrades = {};
      
      Object.entries(grades).forEach(([subjectId, gradeObj]) => {
        processedGrades[subjectId] = {
          q1_grade: gradeObj.q1_grade === '' ? null : gradeObj.q1_grade,
          q2_grade: gradeObj.q2_grade === '' ? null : gradeObj.q2_grade,
          q3_grade: gradeObj.q3_grade === '' ? null : gradeObj.q3_grade,
          q4_grade: gradeObj.q4_grade === '' ? null : gradeObj.q4_grade
        };
      });
      
      const gradesData = { 
        ...processedGrades,
        school_year: schoolYear 
      };
      
      await updateMultipleGrades(id, student.class_id, gradesData);
      
      // Refresh report card data after saving
      const updatedReportCard = await getStudentReportCard(id, schoolYear);
      setReportCard(updatedReportCard);
      
      toast.success("Grades saved successfully!");
    } catch (error) {
      console.error("Failed to save grades:", error);
      toast.error("Failed to save grades");
    } finally {
      setIsSaving(false);
    }
  };

  const calculateFinalGrade = (subjectId) => {
    const subjectGrades = grades[subjectId] || {};
    const q1 = parseFloat(subjectGrades.q1_grade);
    const q2 = parseFloat(subjectGrades.q2_grade);
    const q3 = parseFloat(subjectGrades.q3_grade);
    const q4 = parseFloat(subjectGrades.q4_grade);
    
    if (!isNaN(q1) && !isNaN(q2) && !isNaN(q3) && !isNaN(q4)) {
      const finalGrade = (q1 + q2 + q3 + q4) / 4;
      return finalGrade.toFixed(2);
    }
    return '';
  };

  const getRemarks = (numericGrade) => {
    if (!numericGrade) return '';
    
    const grade = parseFloat(numericGrade);
    if (grade >= 90) return 'Outstanding';
    if (grade >= 85) return 'Very Satisfactory';
    if (grade >= 80) return 'Satisfactory';
    if (grade >= 75) return 'Fairly Satisfactory';
    return 'Did Not Meet Expectations';
  };

  const calculateQuarterlyAverages = () => {
    const quarterSums = { q1: 0, q2: 0, q3: 0, q4: 0, final: 0 };
    const quarterCounts = { q1: 0, q2: 0, q3: 0, q4: 0, final: 0 };
    
    Object.values(grades).forEach(subjectGrades => {
      const q1 = parseFloat(subjectGrades.q1_grade);
      if (!isNaN(q1)) {
        quarterSums.q1 += q1;
        quarterCounts.q1++;
      }
      
      const q2 = parseFloat(subjectGrades.q2_grade);
      if (!isNaN(q2)) {
        quarterSums.q2 += q2;
        quarterCounts.q2++;
      }
      
      const q3 = parseFloat(subjectGrades.q3_grade);
      if (!isNaN(q3)) {
        quarterSums.q3 += q3;
        quarterCounts.q3++;
      }
      
      const q4 = parseFloat(subjectGrades.q4_grade);
      if (!isNaN(q4)) {
        quarterSums.q4 += q4;
        quarterCounts.q4++;
      }
      
      if (!isNaN(q1) && !isNaN(q2) && !isNaN(q3) && !isNaN(q4)) {
        const subjectFinal = (q1 + q2 + q3 + q4) / 4;
        quarterSums.final += subjectFinal;
        quarterCounts.final++;
      }
    });
    
    const q1Average = quarterCounts.q1 > 0 ? (quarterSums.q1 / quarterCounts.q1).toFixed(2) : null;
    const q2Average = quarterCounts.q2 > 0 ? (quarterSums.q2 / quarterCounts.q2).toFixed(2) : null;
    const q3Average = quarterCounts.q3 > 0 ? (quarterSums.q3 / quarterCounts.q3).toFixed(2) : null;
    const q4Average = quarterCounts.q4 > 0 ? (quarterSums.q4 / quarterCounts.q4).toFixed(2) : null;
    
    let finalAverage = null;
    const validQuarterlyAverages = [q1Average, q2Average, q3Average, q4Average].filter(avg => avg !== null);
    if (validQuarterlyAverages.length > 0) {
      const sum = validQuarterlyAverages.reduce((total, avg) => total + parseFloat(avg), 0);
      finalAverage = (sum / validQuarterlyAverages.length).toFixed(2);
    }
    
    return {
      q1_average: q1Average,
      q2_average: q2Average,
      q3_average: q3Average,
      q4_average: q4Average,
      final_average: finalAverage
    };
  };

  const handlePrint = () => {
    window.print();
  };

  const handleBack = () => {
    navigate(`/students/${id}`);
  };

  const handleViewFrontCard = () => {
    navigate(`/teacher/student-front-card/${id}`);
  };
  
  const handleViewBackCard = () => {
    navigate(`/teacher/student-card/${id}`);
  };
  
  const handleViewAttendance = () => {
    navigate(`/student/${id}/attendance`);
  };

  const handlePreviousStudent = () => {
    if (currentStudentIndex > 0) {
      const prevIndex = currentStudentIndex - 1;
      const prevStudentId = classStudents[prevIndex].id;
      navigate(`/student/${prevStudentId}/report-card`);
    }
  };

  const handleNextStudent = () => {
    if (currentStudentIndex < classStudents.length - 1) {
      const nextIndex = currentStudentIndex + 1;
      const nextStudentId = classStudents[nextIndex].id;
      navigate(`/student/${nextStudentId}/report-card`);
    }
  };

  const calculatedQuarterlyAverages = calculateQuarterlyAverages();

  if (gradeLoading || studentLoading || !student || !reportCard) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4 pt-20 sm:pt-24">
        <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full"></div>
        <span className="ml-3 text-gray-600">Loading report card...</span>
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
      <div className="bg-blue-700 text-white p-4 sm:p-6 rounded-2xl shadow-lg relative overflow-hidden mb-8 print:hidden">
        <div className="absolute top-0 right-0 opacity-10 pointer-events-none">
          <svg width="200" height="200" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M160 0H40C17.9086 0 0 17.9086 0 40V160C0 182.091 17.9086 200 40 200H160C182.091 200 200 182.091 200 160V40C200 17.9086 182.091 0 160 0Z" fill="white"/>
          </svg>
        </div>
        
        {/* Header content with back button and student info */}
        <div className="relative z-10 mb-6">
          <button 
            onClick={handleBack}
            className="flex items-center text-blue-100 hover:text-white mb-3 transition-colors"
          >
            <ChevronLeft size={20} className="mr-1" />
            <span>Back</span>
          </button>
          
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-3">Student Report Card</h1>
          
          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-4 text-blue-100 text-sm sm:text-base">
            <div className="flex items-center">
              <User size={16} className="mr-1.5 flex-shrink-0" />
              <span className="truncate">{student.first_name} {student.last_name}</span>
            </div>
            <div className="flex items-center">
              <Book size={16} className="mr-1.5 flex-shrink-0" />
              <span>Grade {reportCard.class?.grade_level} - {reportCard.class?.section}</span>
            </div>
            <div className="flex items-center">
              <Calendar size={16} className="mr-1.5 flex-shrink-0" />
              <span>SY: {schoolYear}</span>
            </div>
          </div>
          
          {/* Student position indicator */}
          {classStudents.length > 0 && (
            <div className="mt-3 text-blue-100 text-xs sm:text-sm">
              <span className="bg-blue-500 bg-opacity-30 px-2 py-1 rounded">
                {student.sex === 'Male' ? 'Male Students' : 'Female Students'} - 
                Position {currentStudentIndex + 1} of {classStudents.length}
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons - Responsive Layout */}
        <div className="relative z-10 space-y-3">
          {/* Primary Action - Save Button (Full width on mobile) */}
          <div className="w-full">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSaveGrades}
              disabled={isSaving}
              className="w-full sm:w-auto bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 sm:px-6 py-3 rounded-lg text-sm font-medium transition-colors duration-300 flex items-center justify-center shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <Loader className="h-5 w-5 mr-2 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="h-5 w-5 mr-2" />
                  <span>Save Grades (Ctrl+S)</span>
                </>
              )}
            </motion.button>
          </div>

          {/* Secondary Actions Row */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Quick Actions - Full width on mobile, flex on desktop */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 flex-1">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleViewFrontCard}
                className="flex-1 sm:flex-none bg-blue-600 bg-opacity-80 hover:bg-opacity-100 text-white px-3 sm:px-4 py-2.5 rounded-lg text-sm font-medium transition-colors duration-300 flex items-center justify-center shadow-md"
              >
                <Printer className="h-4 w-4 mr-2 flex-shrink-0" />
                <span>Print Report Card</span>
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleViewAttendance}
                className="flex-1 sm:flex-none bg-purple-600 bg-opacity-80 hover:bg-opacity-100 text-white px-3 sm:px-4 py-2.5 rounded-lg text-sm font-medium transition-colors duration-300 flex items-center justify-center shadow-md"
              >
                <UserCheck className="h-4 w-4 mr-2 flex-shrink-0" />
                <span>Attendance</span>
              </motion.button>
            </div>

            {/* Navigation Buttons */}
            <div className="flex gap-2 justify-center sm:justify-end">
              <motion.button
                whileHover={{ scale: currentStudentIndex > 0 ? 1.02 : 1 }}
                whileTap={{ scale: currentStudentIndex > 0 ? 0.98 : 1 }}
                onClick={handlePreviousStudent}
                title={currentStudentIndex > 0 ? `Previous: ${classStudents[currentStudentIndex - 1]?.first_name} ${classStudents[currentStudentIndex - 1]?.last_name} (${classStudents[currentStudentIndex - 1]?.sex})` : 'No previous student'}
                className={`px-3 sm:px-4 py-2.5 rounded-lg text-sm font-medium transition-colors duration-300 flex items-center shadow-md min-w-[80px] justify-center ${
                  currentStudentIndex <= 0 
                    ? 'bg-gray-400 cursor-not-allowed opacity-60 text-gray-600' 
                    : 'bg-gray-600 bg-opacity-80 hover:bg-opacity-100 text-white cursor-pointer'
                }`}
              >
                <ChevronLeft className="h-4 w-4 mr-1 flex-shrink-0" />
                <span className="hidden xs:inline">Previous</span>
                <span className="xs:hidden">Prev</span>
              </motion.button>
              
              <motion.button
                whileHover={{ scale: currentStudentIndex < classStudents.length - 1 ? 1.02 : 1 }}
                whileTap={{ scale: currentStudentIndex < classStudents.length - 1 ? 0.98 : 1 }}
                onClick={handleNextStudent}
                title={currentStudentIndex < classStudents.length - 1 ? `Next: ${classStudents[currentStudentIndex + 1]?.first_name} ${classStudents[currentStudentIndex + 1]?.last_name} (${classStudents[currentStudentIndex + 1]?.sex})` : 'No next student'}
                className={`px-3 sm:px-4 py-2.5 rounded-lg text-sm font-medium transition-colors duration-300 flex items-center shadow-md min-w-[80px] justify-center ${
                  currentStudentIndex >= classStudents.length - 1 
                    ? 'bg-gray-400 cursor-not-allowed opacity-60 text-gray-600' 
                    : 'bg-gray-600 bg-opacity-80 hover:bg-opacity-100 text-white cursor-pointer'
                }`}
              >
                <span className="hidden xs:inline">Next</span>
                <span className="xs:hidden">Next</span>
                <ChevronRight className="h-4 w-4 ml-1 flex-shrink-0" />
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      {/* School Year Selector - Only visible on screen */}
      <div className="bg-white rounded-2xl shadow-md p-4 sm:p-6 mb-6 print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center">
            <Calendar className="h-5 w-5 text-blue-600 mr-2 flex-shrink-0" />
            <h2 className="font-semibold text-gray-800">Select School Year</h2>
          </div>
          <select
            value={schoolYear}
            onChange={(e) => {
              const val = e.target.value;
              setSchoolYear(val);
              // Propagate to global selection for consistency across app
              selectYear?.(val);
            }}
            className="w-full sm:w-auto border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {(years && years.length > 0
              ? years.map((y) => y.name)
              : (() => {
                  const base = new Date().getFullYear();
                  return Array.from({ length: 5 }, (_, i) => `${base - 2 + i}-${base - 1 + i}`);
                })()
            ).map((name) => (
              <option key={name} value={name}>
                School Year {name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Report Card Content */}
      <div className="bg-white rounded-2xl shadow-md p-4 sm:p-6 lg:p-8 print:shadow-none">
        {/* Report Card Header - Visible in print */}
        <div className="text-center mb-8 hidden print:block">
          <h1 className="text-2xl font-bold">Educational Portal School System</h1>
          <h2 className="text-xl font-semibold mt-2">Student Report Card</h2>
          <p className="mt-1">School Year: {schoolYear}</p>
        </div>

        {/* Student Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8 print:mb-6">
          <div className="bg-gray-50 p-4 sm:p-6 rounded-xl print:bg-transparent print:p-2 print:border print:border-gray-300">
            <h3 className="text-gray-700 font-semibold mb-3 flex items-center">
              <User className="mr-2 h-5 w-5 text-blue-600 flex-shrink-0" />
              Student Information
            </h3>
            <div className="space-y-2 text-sm sm:text-base">
              <p><span className="font-semibold text-gray-700">Name:</span> {student.first_name} {student.middle_name ? `${student.middle_name} ` : ''}{student.last_name}</p>
              <p><span className="font-semibold text-gray-700">LRN:</span> {student.lrn}</p>
              <p><span className="font-semibold text-gray-700">Gender:</span> {student.sex || 'Not specified'}</p>
              <p><span className="font-semibold text-gray-700">Date of Birth:</span> {new Date(student.birthdate).toLocaleDateString()}</p>
            </div>
          </div>
          <div className="bg-gray-50 p-4 sm:p-6 rounded-xl print:bg-transparent print:p-2 print:border print:border-gray-300">
            <h3 className="text-gray-700 font-semibold mb-3 flex items-center">
              <Book className="mr-2 h-5 w-5 text-blue-600 flex-shrink-0" />
              Class Information
            </h3>
            <div className="space-y-2 text-sm sm:text-base">
              <p><span className="font-semibold text-gray-700">Grade Level:</span> {reportCard.class?.grade_level || 'N/A'}</p>
              <p><span className="font-semibold text-gray-700">Section:</span> {reportCard.class?.section || 'N/A'}</p>
              <p>
                <span className="font-semibold text-gray-700">Adviser:</span>{' '}
                {reportCard.class_teacher_name || reportCard.class?.adviser_name || 'Not assigned'}
              </p>
              <p><span className="font-semibold text-gray-700">School Year:</span> {schoolYear}</p>
            </div>
          </div>
        </div>
        
        {/* Keyboard Hints */}
        <KeyboardHints />
        
        {/* Grades Table */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center mb-4">
            <Award className="h-5 w-5 text-blue-600 mr-2 flex-shrink-0" />
            <h2 className="text-lg sm:text-xl font-bold text-gray-800">Academic Performance</h2>
          </div>
          <div className="h-1 w-full bg-blue-500 rounded-full mb-4 sm:mb-6 print:hidden"></div>
          
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full border-collapse">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 border text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 border text-center text-xs font-medium text-gray-500 uppercase tracking-wider">1st Quarter</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 border text-center text-xs font-medium text-gray-500 uppercase tracking-wider">2nd Quarter</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 border text-center text-xs font-medium text-gray-500 uppercase tracking-wider">3rd Quarter</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 border text-center text-xs font-medium text-gray-500 uppercase tracking-wider">4th Quarter</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 border text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Final Grade</th>
                </tr>
              </thead>
              <tbody>
                {reportCard.subjects && reportCard.subjects.map((subject, index) => (
                  <tr 
                    key={subject.id} 
                    className={`hover:bg-blue-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                  >
                    <td className="py-2 sm:py-3 px-2 sm:px-4 border">
                      <div className="font-medium text-gray-800 text-sm sm:text-base">{subject.subject_name}</div>
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 border text-center">
                      <input
                        ref={createInputRef(subject.id, 'q1_grade')}
                        type="text"
                        value={grades[subject.id]?.q1_grade || ''}
                        onChange={(e) => handleGradeChange(subject.id, 'q1_grade', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, subject.id, 'q1_grade')}
                        onFocus={() => handleInputFocus(subject.id, 'q1_grade')}
                        onBlur={handleInputBlur}
                        className={`grade-input w-12 sm:w-16 text-center border border-gray-300 rounded-lg p-1 sm:p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 print:border-none print:bg-transparent print:p-0 transition-all ${
                          focusedCell.subjectIndex === index && focusedCell.quarter === 'q1_grade' && isNavigationMode
                            ? 'ring-2 ring-blue-400 bg-blue-50'
                            : ''
                        }`}
                        placeholder="--"
                      />
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 border text-center">
                      <input
                        ref={createInputRef(subject.id, 'q2_grade')}
                        type="text"
                        value={grades[subject.id]?.q2_grade || ''}
                        onChange={(e) => handleGradeChange(subject.id, 'q2_grade', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, subject.id, 'q2_grade')}
                        onFocus={() => handleInputFocus(subject.id, 'q2_grade')}
                        onBlur={handleInputBlur}
                        className={`grade-input w-12 sm:w-16 text-center border border-gray-300 rounded-lg p-1 sm:p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 print:border-none print:bg-transparent print:p-0 transition-all ${
                          focusedCell.subjectIndex === index && focusedCell.quarter === 'q2_grade' && isNavigationMode
                            ? 'ring-2 ring-blue-400 bg-blue-50'
                            : ''
                        }`}
                        placeholder="--"
                      />
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 border text-center">
                      <input
                        ref={createInputRef(subject.id, 'q3_grade')}
                        type="text"
                        value={grades[subject.id]?.q3_grade || ''}
                        onChange={(e) => handleGradeChange(subject.id, 'q3_grade', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, subject.id, 'q3_grade')}
                        onFocus={() => handleInputFocus(subject.id, 'q3_grade')}
                        onBlur={handleInputBlur}
                        className={`grade-input w-12 sm:w-16 text-center border border-gray-300 rounded-lg p-1 sm:p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 print:border-none print:bg-transparent print:p-0 transition-all ${
                          focusedCell.subjectIndex === index && focusedCell.quarter === 'q3_grade' && isNavigationMode
                            ? 'ring-2 ring-blue-400 bg-blue-50'
                            : ''
                        }`}
                        placeholder="--"
                      />
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 border text-center">
                      <input
                        ref={createInputRef(subject.id, 'q4_grade')}
                        type="text"
                        value={grades[subject.id]?.q4_grade || ''}
                        onChange={(e) => handleGradeChange(subject.id, 'q4_grade', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, subject.id, 'q4_grade')}
                        onFocus={() => handleInputFocus(subject.id, 'q4_grade')}
                        onBlur={handleInputBlur}
                        className={`grade-input w-12 sm:w-16 text-center border border-gray-300 rounded-lg p-1 sm:p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 print:border-none print:bg-transparent print:p-0 transition-all ${
                          focusedCell.subjectIndex === index && focusedCell.quarter === 'q4_grade' && isNavigationMode
                            ? 'ring-2 ring-blue-400 bg-blue-50'
                            : ''
                        }`}
                        placeholder="--"
                      />
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 border text-center font-semibold text-sm sm:text-base">
                      {calculateFinalGrade(subject.id) || '--'}
                    </td>
                  </tr>
                ))}
                
                {/* Quarterly Averages */}
                <tr className="bg-blue-50 font-semibold">
                  <td className="py-2 sm:py-3 px-2 sm:px-4 border text-sm sm:text-base">
                    Quarterly Averages
                  </td>
                  <td className="py-2 sm:py-3 px-2 sm:px-4 border text-center text-sm sm:text-base">
                    {calculatedQuarterlyAverages.q1_average || reportCard.quarterlyAverages?.q1_average || '--'}
                  </td>
                  <td className="py-2 sm:py-3 px-2 sm:px-4 border text-center text-sm sm:text-base">
                    {calculatedQuarterlyAverages.q2_average || reportCard.quarterlyAverages?.q2_average || '--'}
                  </td>
                  <td className="py-2 sm:py-3 px-2 sm:px-4 border text-center text-sm sm:text-base">
                    {calculatedQuarterlyAverages.q3_average || reportCard.quarterlyAverages?.q3_average || '--'}
                  </td>
                  <td className="py-2 sm:py-3 px-2 sm:px-4 border text-center text-sm sm:text-base">
                    {calculatedQuarterlyAverages.q4_average || reportCard.quarterlyAverages?.q4_average || '--'}
                  </td>
                  <td className="py-2 sm:py-3 px-2 sm:px-4 border text-center text-sm sm:text-base">
                    {calculatedQuarterlyAverages.final_average || reportCard.quarterlyAverages?.final_average || '--'}
                  </td>
                </tr>
                
                {/* General Average */}
                <tr className="bg-gray-100 font-bold">
                  <td className="py-2 sm:py-3 px-2 sm:px-4 border text-sm sm:text-base" colSpan={5}>
                    General Average (GPA)
                  </td>
                  <td className="py-2 sm:py-3 px-2 sm:px-4 border text-center text-sm sm:text-base">
                    {reportCard.gpa || '--'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Attendance Section */}
        {reportCard.attendance && (
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center mb-4">
              <Calendar className="h-5 w-5 text-blue-600 mr-2 flex-shrink-0" />
              <h2 className="text-lg sm:text-xl font-bold text-gray-800">Attendance Summary</h2>
            </div>
            <div className="h-1 w-full bg-blue-500 rounded-full mb-4 sm:mb-6 print:hidden"></div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-blue-50 p-3 sm:p-4 rounded-xl text-center border border-blue-100">
                <div className="text-xl sm:text-2xl font-bold text-blue-600">{reportCard.attendance.present || 0}</div>
                <div className="text-xs sm:text-sm text-gray-600 font-medium mt-1">Present</div>
              </div>
              <div className="bg-red-50 p-3 sm:p-4 rounded-xl text-center border border-red-100">
                <div className="text-xl sm:text-2xl font-bold text-red-600">{reportCard.attendance.absent || 0}</div>
                <div className="text-xs sm:text-sm text-gray-600 font-medium mt-1">Absent</div>
              </div>
              <div className="bg-amber-50 p-3 sm:p-4 rounded-xl text-center border border-amber-100">
                <div className="text-xl sm:text-2xl font-bold text-amber-600">{reportCard.attendance.late || 0}</div>
                <div className="text-xs sm:text-sm text-gray-600 font-medium mt-1">Late</div>
              </div>
              <div className="bg-green-50 p-3 sm:p-4 rounded-xl text-center border border-green-100">
                <div className="text-xl sm:text-2xl font-bold text-green-600">{reportCard.attendance.excused || 0}</div>
                <div className="text-xs sm:text-sm text-gray-600 font-medium mt-1">Excused</div>
              </div>
            </div>
          </div>
        )}
        
        {/* Grade Legend Section */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center mb-4">
            <FileEdit className="h-5 w-5 text-blue-600 mr-2 flex-shrink-0" />
            <h2 className="text-lg sm:text-xl font-bold text-gray-800">Grading System</h2>
          </div>
          <div className="h-1 w-full bg-blue-500 rounded-full mb-4 sm:mb-6 print:hidden"></div>
          
          <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2 sm:gap-3">
              <div className="bg-white p-2 sm:p-3 rounded border border-gray-200">
                <div className="font-semibold text-green-700 text-sm sm:text-base">90-100 — Outstanding</div>
              </div>
              <div className="bg-white p-2 sm:p-3 rounded border border-gray-200">
                <div className="font-semibold text-blue-700 text-sm sm:text-base">85-89 — Very Satisfactory</div>
              </div>
              <div className="bg-white p-2 sm:p-3 rounded border border-gray-200">
                <div className="font-semibold text-blue-600 text-sm sm:text-base">80-84 — Satisfactory</div>
              </div>
              <div className="bg-white p-2 sm:p-3 rounded border border-gray-200">
                <div className="font-semibold text-amber-700 text-sm sm:text-base">75-79 — Fairly Satisfactory</div>
              </div>
              <div className="bg-white p-2 sm:p-3 rounded border border-gray-200">
                <div className="font-semibold text-red-700 text-sm sm:text-base">Below 75 — Did Not Meet Expectations</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Signature Section - Only visible when printing */}
        <div className="mt-12 grid grid-cols-2 gap-16 print:block hidden">
          <div className="text-center">
            <div className="border-t border-black pt-2 mt-12 inline-block min-w-[200px]"></div>
            <p className="font-semibold">Class Adviser</p>
          </div>
          <div className="text-center">
            <div className="border-t border-black pt-2 mt-12 inline-block min-w-[200px]"></div>
            <p className="font-semibold">School Principal</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default StudentReportCardPage;
