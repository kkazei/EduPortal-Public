import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { Download, FileSpreadsheet, Users, BookOpen, X } from 'lucide-react';
import ExcelJS from 'exceljs';
import { useStudentStore } from '../store/studentStore';
import { useSubjectStore } from '../store/subjectStore';
import { useGradeStore } from '../store/gradeStore';
import { useSchoolYearStore } from '../store/schoolYearStore';

const GradeTemplateGenerator = ({ classId, classData, onClose }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedQuarter, setSelectedQuarter] = useState('1');
  const [subjects, setSubjects] = useState([]);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);
  const [templateType, setTemplateType] = useState('alphabetical'); // 'alphabetical' or 'gender'
  const [gradesLoading, setGradesLoading] = useState(false);
  const [gradesMap, setGradesMap] = useState({}); // { [studentId]: { [subjectId]: gradeRow } }
  const selectedSchoolYear = useSchoolYearStore((s) => s.selected);
  
  const { students } = useStudentStore();
  const { fetchSubjectsByClass } = useSubjectStore();
  const { getClassGrades } = useGradeStore();

  useEffect(() => {
    const loadSubjects = async () => {
      setIsLoadingSubjects(true);
      try {
        const classSubjects = await fetchSubjectsByClass(classId);
        setSubjects(classSubjects || []);
      } catch (error) {
        console.error('Error loading subjects:', error);
        toast.error('Failed to load class subjects');
      } finally {
        setIsLoadingSubjects(false);
      }
    };

    if (classId) {
      loadSubjects();
    }
  }, [classId, fetchSubjectsByClass]);

  // Load grades map once for this class (we'll filter by selected school year)
  useEffect(() => {
    const loadGrades = async () => {
      if (!classId) return;
      setGradesLoading(true);
      try {
        const rows = await getClassGrades(classId);
        const map = {};
        rows.forEach((g) => {
          // If a school year is selected, keep only matching rows
          if (selectedSchoolYear && g.school_year && g.school_year !== selectedSchoolYear) return;
          if (!map[g.student_id]) map[g.student_id] = {};
          map[g.student_id][g.subject_id] = g;
        });
        setGradesMap(map);
      } catch (e) {
        console.error('Failed to load class grades:', e);
      } finally {
        setGradesLoading(false);
      }
    };
    loadGrades();
  }, [classId, getClassGrades, selectedSchoolYear]);

  // Sort students alphabetically by last name
  const sortStudentsAlphabetically = (students) => {
    return [...students].sort((a, b) => {
      // Sort by last name
      const lastNameA = (a.last_name || '').toLowerCase();
      const lastNameB = (b.last_name || '').toLowerCase();
      if (lastNameA < lastNameB) return -1;
      if (lastNameA > lastNameB) return 1;
      
      // If last names are the same, sort by first name
      const firstNameA = (a.first_name || '').toLowerCase();
      const firstNameB = (b.first_name || '').toLowerCase();
      return firstNameA.localeCompare(firstNameB);
    });
  };

  // Sort students by gender (Male first, Female second) then by last name alphabetically
  const sortStudentsByGender = (students) => {
    return [...students].sort((a, b) => {
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
  };

  const generateTemplate = async () => {
    setIsGenerating(true);
    try {
      if (!students || students.length === 0) {
        toast.error('No students found in this class');
        return;
      }

      if (!subjects || subjects.length === 0) {
        toast.error('No subjects found for this class');
        return;
      }

      // Sort students based on selected template type
      const sortedStudents = templateType === 'gender' 
        ? sortStudentsByGender(students)
        : sortStudentsAlphabetically(students);

      // Create workbook
      const workbook = new ExcelJS.Workbook();
      
      // Load logos
      const depedLogoResponse = await fetch('/deped logo.gif');
      const depedLogoBlob = await depedLogoResponse.blob();
      const depedLogoBase64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(depedLogoBlob);
      });
      
      const schoolLogoResponse = await fetch('/kagawaranlogo.png');
      const schoolLogoBlob = await schoolLogoResponse.blob();
      const schoolLogoBase64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(schoolLogoBlob);
      });

      const depedLogoId = workbook.addImage({
        base64: depedLogoBase64,
        extension: 'png',
      });

      const schoolLogoId = workbook.addImage({
        base64: schoolLogoBase64,
        extension: 'png',
      });

      await createDepEdTemplate(workbook, sortedStudents, subjects, classData, selectedQuarter, depedLogoId, schoolLogoId, false);
      
      // Generate and download the file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const templateSuffix = templateType === 'gender' ? 'Gender' : 'Alpha';
      link.download = `${classData.grade_level}_${classData.section}_Q${selectedQuarter}_${templateSuffix}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
      
      toast.success(`Template downloaded successfully`);
      onClose();
      
    } catch (error) {
      console.error('Error generating template:', error);
      toast.error('Failed to generate template');
    } finally {
      setIsGenerating(false);
    }
  };

  const generateFilledTemplate = async () => {
    setIsGenerating(true);
    try {
      if (!students || students.length === 0) {
        toast.error('No students found in this class');
        return;
      }

      if (!subjects || subjects.length === 0) {
        toast.error('No subjects found for this class');
        return;
      }

      if (gradesLoading) {
        toast('Please wait, loading current grades…', { icon: '⏳' });
        return;
      }

      // Sort students based on selected template type
      const sortedStudents = templateType === 'gender'
        ? sortStudentsByGender(students)
        : sortStudentsAlphabetically(students);

      // Create workbook
      const workbook = new ExcelJS.Workbook();
      
      // Load logos
      const depedLogoResponse = await fetch('/deped logo.gif');
      const depedLogoBlob = await depedLogoResponse.blob();
      const depedLogoBase64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(depedLogoBlob);
      });
      
      const schoolLogoResponse = await fetch('/kagawaranlogo.png');
      const schoolLogoBlob = await schoolLogoResponse.blob();
      const schoolLogoBase64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(schoolLogoBlob);
      });

      const depedLogoId = workbook.addImage({
        base64: depedLogoBase64,
        extension: 'png',
      });

      const schoolLogoId = workbook.addImage({
        base64: schoolLogoBase64,
        extension: 'png',
      });

      await createDepEdTemplate(workbook, sortedStudents, subjects, classData, selectedQuarter, depedLogoId, schoolLogoId, true);

      // Generate and download the file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const templateSuffix = templateType === 'gender' ? 'Gender' : 'Alpha';
      link.download = `${classData.grade_level}_${classData.section}_Q${selectedQuarter}_${templateSuffix}_WithGrades.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
      
      toast.success(`Grades downloaded successfully`);
      onClose();
    } catch (err) {
      console.error('Error generating filled template:', err);
      toast.error('Failed to generate filled template');
    } finally {
      setIsGenerating(false);
    }
  };

  const createDepEdTemplate = async (workbook, students, subjects, classData, quarter, depedLogoId, schoolLogoId, withGrades) => {
    const quarterName = quarter === '1' ? 'First' : quarter === '2' ? 'Second' : quarter === '3' ? 'Third' : 'Fourth';
    const sheet = workbook.addWorksheet(`Q${quarter} Grades`);
    
    // Add logos at top - Kagawaran (left), DepEd (right)
    sheet.addImage(schoolLogoId, { tl: { col: 0, row: 0 }, ext: { width: 70, height: 70 } });
    const rightLogoCol = Math.max(12, subjects.length + 4);
    sheet.addImage(depedLogoId, { tl: { col: rightLogoCol, row: 0 }, ext: { width: 70, height: 70 } });

    // Title row at row 2 (spanning from B2 across several columns)
    let row = 2;
    sheet.mergeCells(row, 2, row, rightLogoCol - 1);
    const titleCell = sheet.getCell(row, 2);
    titleCell.value = `Summary of Quarterly Grades (${quarterName} Quarter)`;
    titleCell.font = { bold: true, size: 14 };
    titleCell.alignment = { horizontal: 'left', vertical: 'middle' };
    
    // Set column widths for the info box area to be wider
    sheet.getColumn(4).width = 13; // Column D
    sheet.getColumn(5).width = 13; // Column E
    sheet.getColumn(6).width = 13; // Column F
    
    // Cell D3: III
    sheet.mergeCells(3, 4, 3, 6); // D3:F3
    const cell1 = sheet.getCell(3, 4);
    cell1.value = 'III';
    cell1.font = { bold: true, size: 10 };
    cell1.alignment = { horizontal: 'center', vertical: 'middle' };
    cell1.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
    
    // Cell D4: TAPINAC ELEMENTARY SCHOOL
    sheet.mergeCells(4, 4, 4, 6); // D4:F4
    const cell2 = sheet.getCell(4, 4);
    cell2.value = 'TAPINAC ELEMENTARY SCHOOL';
    cell2.font = { size: 8 };
    cell2.alignment = { horizontal: 'center', vertical: 'middle', wrapText: false };
    cell2.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
    
    // Cell D5: 107141
    sheet.mergeCells(5, 4, 5, 6); // D5:F5
    const cell3 = sheet.getCell(5, 4);
    cell3.value = '107141';
    cell3.font = { size: 10 };
    cell3.alignment = { horizontal: 'center', vertical: 'middle' };
    cell3.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
    
    // DIVISION: OLONGAPO CITY (row 4, column H onwards)
    sheet.mergeCells(4, 8, 4, 11);
    const divCell = sheet.getCell(4, 8);
    divCell.value = 'DIVISION: OLONGAPO CITY';
    divCell.font = { bold: true, size: 12 };
    divCell.alignment = { horizontal: 'left', vertical: 'middle' };
    
    // DISTRICT: IVB (row 5, column H onwards)
    sheet.mergeCells(5, 8, 5, 11);
    const distCell = sheet.getCell(5, 8);
    distCell.value = 'DISTRICT: IVB';
    distCell.font = { bold: true, size: 12 };
    distCell.alignment = { horizontal: 'left', vertical: 'middle' };

    // Main table starts at row 8
    row = 8;
    let col = 1;
    
    // First header row with numbers (1, 2, 3...)
    const numberRow = sheet.getRow(row);
    numberRow.height = 15;
    
    // Empty cell above LEARNERS' NAMES
    const emptyCell = numberRow.getCell(col);
    emptyCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
    emptyCell.border = {
      top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' }
    };
    sheet.getColumn(col).width = 30;
    col++;

    // Subject number columns (1, 2, 3, 4, 5...)
    subjects.forEach((subject, idx) => {
      const numCell = numberRow.getCell(col);
      numCell.value = idx + 1;
      numCell.font = { bold: true, size: 10 };
      numCell.alignment = { horizontal: 'center', vertical: 'middle' };
      numCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
      numCell.border = {
        top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' }
      };
      sheet.getColumn(col).width = 7;
      col++;
    });

    // Empty cell above INITIAL GRADES (white background)
    const initialNumCell = numberRow.getCell(col);
    initialNumCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
    initialNumCell.border = {
      top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' }
    };
    sheet.getColumn(col).width = 8;
    const initialGradesColIndex = col;
    col++;

    // Empty cell above AVERAGES (yellow background)
    const avgNumCell = numberRow.getCell(col);
    avgNumCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
    avgNumCell.border = {
      top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' }
    };
    sheet.getColumn(col).width = 7;
    const avgColIndex = col;

    // Second header row with subject names (diagonal text)
    row = 7;
    const headerRow = sheet.getRow(row);
    headerRow.height = 80;
    
    col = 1;
    
    // LEARNERS' NAMES column
    const namesCell = headerRow.getCell(col);
    namesCell.value = "LEARNERS' NAMES";
    namesCell.font = { bold: true, size: 10 };
    namesCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    namesCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
    namesCell.border = {
      top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' }
    };
    col++;

    // Subject columns with diagonal text
    subjects.forEach((subject, idx) => {
      const subjectCell = headerRow.getCell(col);
      subjectCell.value = subject.subject_name.toUpperCase();
      subjectCell.font = { bold: true, size: 8 };
      subjectCell.alignment = { horizontal: 'left', vertical: 'bottom', textRotation: 45 };
      subjectCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
      subjectCell.border = {
        top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' }
      };
      col++;
    });

    // INITIAL GRADES column
    const initialGradesCell = headerRow.getCell(col);
    initialGradesCell.value = 'INITIAL GRADES';
    initialGradesCell.font = { bold: true, size: 8 };
    initialGradesCell.alignment = { horizontal: 'left', vertical: 'bottom', textRotation: 45 };
    initialGradesCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
    initialGradesCell.border = {
      top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' }
    };
    col++;

    // AVERAGES column
    const avgCell = headerRow.getCell(col);
    avgCell.value = 'AVERAGES';
    avgCell.font = { bold: true, size: 8, color: { argb: 'FFFF0000' } };
    avgCell.alignment = { horizontal: 'left', vertical: 'bottom', textRotation: 45 };
    avgCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
    avgCell.border = {
      top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' }
    };

    // Student rows start from next row
    row = 8;
    const gradeField = `q${quarter}_grade`;
    
    // Separate by gender if template type is gender
    if (templateType === 'gender') {
      const maleStudents = students.filter(s => s.sex === 'Male');
      const femaleStudents = students.filter(s => s.sex === 'Female');
      
      // MALE section
      if (maleStudents.length > 0) {
        const maleHeaderRow = sheet.getRow(row);
        maleHeaderRow.getCell(1).value = 'MALE';
        maleHeaderRow.getCell(1).font = { bold: true, size: 10 };
        maleHeaderRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE3F2FD' } };
        row++;
        
        maleStudents.forEach((student, idx) => {
          addStudentRow(sheet, row, student, idx + 1, subjects, gradeField, withGrades, initialGradesColIndex, avgColIndex);
          row++;
        });
      }
      
      // FEMALE section
      if (femaleStudents.length > 0) {
        const femaleHeaderRow = sheet.getRow(row);
        femaleHeaderRow.getCell(1).value = 'FEMALE';
        femaleHeaderRow.getCell(1).font = { bold: true, size: 10 };
        femaleHeaderRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE4EC' } };
        row++;
        
        femaleStudents.forEach((student, idx) => {
          addStudentRow(sheet, row, student, maleStudents.length + idx + 1, subjects, gradeField, withGrades, initialGradesColIndex, avgColIndex);
          row++;
        });
      }
    } else {
      // Alphabetical - no gender sections
      students.forEach((student, idx) => {
        addStudentRow(sheet, row, student, idx + 1, subjects, gradeField, withGrades, initialGradesColIndex, avgColIndex);
        row++;
      });
    }

    // Total row
    row++;
    const totalRow = sheet.getRow(row);
    totalRow.getCell(1).value = `TOTAL ${students.length}`;
    totalRow.getCell(1).font = { bold: true, size: 10 };
    totalRow.getCell(1).alignment = { horizontal: 'center' };
    totalRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
    totalRow.getCell(1).border = {
      top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' }
    };
  };

  const addStudentRow = (sheet, rowNum, student, number, subjects, gradeField, withGrades, initialGradesColIndex, avgColIndex) => {
    const row = sheet.getRow(rowNum);
    
    // Student number and name
    const studentName = `${number}. ${student.last_name}, ${student.first_name} ${student.middle_name || ''}`.trim();
    row.getCell(1).value = studentName;
    row.getCell(1).font = { size: 9 };
    row.getCell(1).alignment = { vertical: 'middle' };
    row.getCell(1).border = {
      top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' }
    };

    // Subject grades
    let col = 2;
    const gradeValues = [];
    subjects.forEach((subject) => {
      let gradeValue = '';
      if (withGrades) {
        const g = gradesMap?.[student.id]?.[subject.id]?.[gradeField];
        gradeValue = g !== null && g !== undefined && g !== '' ? Number(g) : '';
      }
      row.getCell(col).value = gradeValue;
      row.getCell(col).font = { size: 9 };
      row.getCell(col).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(col).border = {
        top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' }
      };
      if (gradeValue !== '') gradeValues.push(gradeValue);
      col++;
    });

    // Initial Grades column (with xx.xx format)
    const initialGradesCell = row.getCell(initialGradesColIndex);
    if (withGrades && gradeValues.length > 0) {
      const avg = gradeValues.reduce((a, b) => a + b, 0) / gradeValues.length;
      initialGradesCell.value = avg.toFixed(2); // Always show xx.xx format
    } else {
      initialGradesCell.value = '';
    }
    initialGradesCell.font = { size: 9 };
    initialGradesCell.alignment = { horizontal: 'center', vertical: 'middle' };
    initialGradesCell.border = {
      top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' }
    };
    initialGradesCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };

    // Average column (rounded: >=0.5 rounds up, <0.5 rounds down)
    const avgCell = row.getCell(avgColIndex);
    if (withGrades && gradeValues.length > 0) {
      const avg = gradeValues.reduce((a, b) => a + b, 0) / gradeValues.length;
      avgCell.value = Math.round(avg); // Proper rounding
    } else {
      avgCell.value = '';
    }
    avgCell.font = { size: 9, bold: true, color: { argb: 'FFFF0000' } };
    avgCell.alignment = { horizontal: 'center', vertical: 'middle' };
    avgCell.border = {
      top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' }
    };
    avgCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
  };

  // Calculate sorted statistics for display
  const sortedStudents = students ? (templateType === 'gender' ? sortStudentsByGender(students) : sortStudentsAlphabetically(students)) : [];
  const maleCount = sortedStudents.filter(s => s.sex === 'Male').length;
  const femaleCount = sortedStudents.filter(s => s.sex === 'Female').length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Generate Grade Template</h2>
            <p className="text-gray-600">Create an Excel template for bulk grade entry</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto pr-2 -mr-2">
          {/* Template Type Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Choose Template Type:
            </label>
            <div className="grid grid-cols-1 gap-3">
              {/* Alphabetical Template Option */}
              <div
                className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                  templateType === 'alphabetical'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setTemplateType('alphabetical')}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-800">Alphabetical Order</h3>
                    <p className="text-sm text-gray-600">Students sorted by last name A-Z</p>
                  </div>
                  <div className={`w-4 h-4 rounded-full border-2 ${
                    templateType === 'alphabetical'
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-gray-300'
                  }`}>
                    {templateType === 'alphabetical' && (
                      <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>
                    )}
                  </div>
                </div>
              </div>

              {/* Gender Template Option */}
              <div
                className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                  templateType === 'gender'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setTemplateType('gender')}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-800">By Gender</h3>
                    <p className="text-sm text-gray-600">Males first, then Females (A-Z within groups)</p>
                  </div>
                  <div className={`w-4 h-4 rounded-full border-2 ${
                    templateType === 'gender'
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-gray-300'
                  }`}>
                    {templateType === 'gender' && (
                      <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Class Information */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Class:</span>
              <span className="font-semibold">{classData.grade_level} - {classData.section}</span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Students:</span>
              <span className="font-semibold">
                {students?.length || 0} 
                {students?.length > 0 && (
                  <span className="text-xs text-gray-500 ml-1">
                    ({maleCount}M, {femaleCount}F)
                  </span>
                )}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Subjects:</span>
              <span className="font-semibold">
                {isLoadingSubjects ? 'Loading...' : subjects.length}
              </span>
            </div>
          </div>

          {/* Quarter Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Quarter:
            </label>
            <select
              value={selectedQuarter}
              onChange={(e) => setSelectedQuarter(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="1">1st Quarter</option>
              <option value="2">2nd Quarter</option>
              <option value="3">3rd Quarter</option>
              <option value="4">4th Quarter</option>
            </select>
          </div>

          {/* Template Preview */}
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-800 mb-2">Template will include:</h3>
            <ul className="text-blue-700 text-sm space-y-1">
              <li className="flex items-center">
                <Users size={14} className="mr-2" />
                {templateType === 'gender' 
                  ? 'Students with gender sections (Male/Female)' 
                  : 'Students in alphabetical order'
                }
              </li>
              <li className="flex items-center">
                <BookOpen size={14} className="mr-2" />
                All subjects for this class
              </li>
              <li className="flex items-center">
                <FileSpreadsheet size={14} className="mr-2" />
                Grade input columns with numbering
              </li>
              <li className="flex items-center">
                <Download size={14} className="mr-2" />
                Auto-calculated averages
              </li>
              <li className="flex items-center">
                <Download size={14} className="mr-2" />
                Option to pre-fill with existing grades for selected quarter
              </li>
            </ul>
          </div>
        </div>

        {/* Action Buttons (always visible) */}
        <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={generateTemplate}
            disabled={isGenerating || isLoadingSubjects || !students?.length || !subjects.length}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                Generating...
              </>
            ) : (
              <>
                <Download size={16} className="mr-2" />
                Download Template
              </>
            )}
          </button>
          <button
            onClick={generateFilledTemplate}
            disabled={isGenerating || isLoadingSubjects || gradesLoading || !students?.length || !subjects.length}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                Generating...
              </>
            ) : (
              <>
                <Download size={16} className="mr-2" />
                Download With Grades
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default GradeTemplateGenerator;