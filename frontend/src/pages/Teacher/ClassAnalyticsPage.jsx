import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useClassStore } from '../../store/classStore';
import { useAnalyticsStore } from '../../store/analyticsStore';
import { useSchoolYearStore } from '../../store/schoolYearStore';
import { useAuthStore } from '../../store/authStore';
import { ChevronLeft, TrendingUp, Users, Award, BookOpen, Download, Filter, Calendar, BarChart3, PieChart, FileText, Printer, FileSpreadsheet, Package } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Cell, LineChart, Line, Pie } from 'recharts';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import { jsPDF } from 'jspdf';

const CERTIFICATE_TEMPLATE_PATHS = {
  template1: ['/slide.PNG', '/slide.png'],
  template2: ['/cert2.png', '/cert2.PNG']
};

const ClassAnalyticsPage = () => {
  const navigate = useNavigate();
  const { classId } = useParams();
  const canvasRef = useRef(null);
  
  const { fetchClassById, isLoading: classLoading } = useClassStore();
  const { user } = useAuthStore();
  const { 
    classAnalytics,
    getClassAnalytics,
    getGradeDistributionChartData,
    getHonorRollStats,
    getSubjectPerformanceSummary,
    prepareAnalyticsExport,
    isLoading: analyticsLoading,
    error 
  } = useAnalyticsStore();
  
  const [classData, setClassData] = useState(null);
  const [selectedQuarter, setSelectedQuarter] = useState('1');
  const [autoQuarterResolved, setAutoQuarterResolved] = useState(false);
  // Initialize from global school year selection if available; fallback filled after mount
  const { selected: globalSchoolYear, years, fetchYears } = useSchoolYearStore();
  const [selectedSchoolYear, setSelectedSchoolYear] = useState(globalSchoolYear || '');
  const [selectedView, setSelectedView] = useState('overview');
  const [showHonorModal, setShowHonorModal] = useState(false);
  const [honorFilter, setHonorFilter] = useState(null); // null = all honor categories
  const [rangeModal, setRangeModal] = useState({ open: false, range: null });
  const studentsSectionRef = useRef(null);
  const [selectedDistinction, setSelectedDistinction] = useState('ALL');

  // Helper to mask LRN (keep first 6 digits)
  const maskLRN = (lrn) => {
    if (!lrn) return '';
    const str = String(lrn);
    if (str.length <= 6) return str;
    return str.slice(0, 6) + '*'.repeat(str.length - 6);
  };

  const resolveSubjectGrade = (student, subject) => {
    if (!student?.grades || !subject) return null;

    const normalizedName = String(subject.name || '').trim().replace(/\s+/g, '').toLowerCase();
    const normalizedCode = String(subject.code || '').trim().replace(/\s+/g, '').toLowerCase();

    return (
      student.grades[subject.name] ??
      student.grades[subject.code] ??
      student.grades[normalizedName] ??
      student.grades[normalizedCode] ??
      null
    );
  };

  // Professional Excel Export Function with Styling
  const handleExportExcel = async () => {
    if (!classAnalytics) {
      toast.error('No data to export');
      return;
    }

    try {
      const workbook = new ExcelJS.Workbook();
      
      // Load logos
      const schoolLogoResponse = await fetch('/image003.png');
      const schoolLogoBlob = await schoolLogoResponse.blob();
      const schoolLogoBase64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(schoolLogoBlob);
      });
      
      const myLogoResponse = await fetch('/image001.png');
      const myLogoBlob = await myLogoResponse.blob();
      const myLogoBase64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(myLogoBlob);
      });

      const schoolLogoId = workbook.addImage({
        base64: schoolLogoBase64,
        extension: 'png',
      });

      const myLogoId = workbook.addImage({
        base64: myLogoBase64,
        extension: 'png',
      });

      // Common styles
      const headerStyle = {
        font: { bold: true, size: 12, color: { argb: 'FFFFFFFF' } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } },
        alignment: { horizontal: 'center', vertical: 'middle' },
        border: {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        }
      };

      const titleStyle = {
        font: { bold: true, size: 14, color: { argb: 'FF4472C4' } },
        alignment: { horizontal: 'center', vertical: 'middle' },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE7E6E6' } }
      };

      const cellBorder = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };

      // Sheet 1: Summary
      const summarySheet = workbook.addWorksheet('Summary');
      summarySheet.addImage(schoolLogoId, { tl: { col: 0, row: 0 }, ext: { width: 80, height: 80 } });
      summarySheet.addImage(myLogoId, { tl: { col: 9, row: 0 }, ext: { width: 80, height: 80 } });
      
      // School header
      summarySheet.mergeCells('B2:I2');
      summarySheet.getCell('B2').value = 'Republic of the Philippines';
      summarySheet.getCell('B2').font = { bold: true, size: 10 };
      summarySheet.getCell('B2').alignment = { horizontal: 'center', vertical: 'middle' };
      
      summarySheet.mergeCells('B3:I3');
      summarySheet.getCell('B3').value = 'DEPARTMENT OF EDUCATION';
      summarySheet.getCell('B3').font = { bold: true, size: 11 };
      summarySheet.getCell('B3').alignment = { horizontal: 'center', vertical: 'middle' };
      
      summarySheet.mergeCells('B4:I4');
      summarySheet.getCell('B4').value = 'Region III';
      summarySheet.getCell('B4').font = { bold: true, size: 10 };
      summarySheet.getCell('B4').alignment = { horizontal: 'center', vertical: 'middle' };
      
      summarySheet.mergeCells('B5:I5');
      summarySheet.getCell('B5').value = 'TAPINAC ELEMENTARY SCHOOL';
      summarySheet.getCell('B5').font = { bold: true, size: 12 };
      summarySheet.getCell('B5').alignment = { horizontal: 'center', vertical: 'middle' };
      
      summarySheet.mergeCells('B6:I6');
      summarySheet.getCell('B6').value = `S.Y. ${selectedSchoolYear}`;
      summarySheet.getCell('B6').font = { bold: true, size: 10 };
      summarySheet.getCell('B6').alignment = { horizontal: 'center', vertical: 'middle' };
      
      summarySheet.mergeCells('A8:C8');
      summarySheet.getCell('A8').value = 'CLASS ANALYTICS SUMMARY';
      summarySheet.getCell('A8').style = titleStyle;
      summarySheet.getRow(8).height = 25;

      let row = 10;
      summarySheet.mergeCells(`A${row}:B${row}`);
      summarySheet.getCell(`A${row}`).value = 'Class Information';
      summarySheet.getCell(`A${row}`).font = { bold: true, size: 11 };
      summarySheet.getCell(`A${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
      
      const classInfo = [
        ['Class:', `${classData?.grade_level || ''} - ${classData?.section || ''}`],
        ['Quarter:', `Q${selectedQuarter}`],
        ['School Year:', selectedSchoolYear],
        ['Generated:', new Date().toLocaleDateString()]
      ];
      
      classInfo.forEach((info, i) => {
        row++;
        summarySheet.getCell(`A${row}`).value = info[0];
        summarySheet.getCell(`B${row}`).value = info[1];
        summarySheet.getCell(`A${row}`).font = { bold: true };
        summarySheet.getCell(`A${row}`).border = cellBorder;
        summarySheet.getCell(`B${row}`).border = cellBorder;
      });

      row += 2;
      summarySheet.mergeCells(`A${row}:B${row}`);
      summarySheet.getCell(`A${row}`).value = 'Performance Overview';
      summarySheet.getCell(`A${row}`).font = { bold: true, size: 11 };
      summarySheet.getCell(`A${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };

      const performanceData = [
        ['Total Students:', classAnalytics.summary.total_students],
        ['Students with Grades:', classAnalytics.summary.students_with_grades],
        ['Class Average:', classAnalytics.summary.class_average || 'N/A'],
        ['Honor Students:', honorRollStats?.total || 0],
        ['Honor Rate:', classAnalytics.summary.total_students > 0 ? `${((honorRollStats?.total || 0) / classAnalytics.summary.total_students * 100).toFixed(1)}%` : 'N/A']
      ];

      performanceData.forEach((info, i) => {
        row++;
        summarySheet.getCell(`A${row}`).value = info[0];
        summarySheet.getCell(`B${row}`).value = info[1];
        summarySheet.getCell(`A${row}`).font = { bold: true };
        summarySheet.getCell(`A${row}`).border = cellBorder;
        summarySheet.getCell(`B${row}`).border = cellBorder;
        summarySheet.getCell(`B${row}`).alignment = { horizontal: 'right' };
      });

      row += 2;
      summarySheet.mergeCells(`A${row}:C${row}`);
      summarySheet.getCell(`A${row}`).value = 'HONOR ROLL BREAKDOWN';
      summarySheet.getCell(`A${row}`).style = headerStyle;
      
      row++;
      ['', 'Count', 'Percentage'].forEach((header, i) => {
        const cell = summarySheet.getCell(row, i + 1);
        cell.value = header;
        cell.style = headerStyle;
      });

      const honorBreakdown = [
        ['With Highest Honors (97.5-100)', honorRollStats?.withHighestHonors || 0, classAnalytics.summary.total_students > 0 ? `${((honorRollStats?.withHighestHonors || 0) / classAnalytics.summary.total_students * 100).toFixed(1)}%` : 'N/A'],
        ['With High Honors (94.5-97.4)', honorRollStats?.withHighHonors || 0, classAnalytics.summary.total_students > 0 ? `${((honorRollStats?.withHighHonors || 0) / classAnalytics.summary.total_students * 100).toFixed(1)}%` : 'N/A'],
        ['With Honors (89.5-94.4)', honorRollStats?.withHonors || 0, classAnalytics.summary.total_students > 0 ? `${((honorRollStats?.withHonors || 0) / classAnalytics.summary.total_students * 100).toFixed(1)}%` : 'N/A'],
        ['Satisfactory (74.5-89.4)', classAnalytics.students.filter(s => parseFloat(s.average || 0) >= 74.5 && parseFloat(s.average || 0) < 89.5).length, classAnalytics.summary.total_students > 0 ? `${(classAnalytics.students.filter(s => parseFloat(s.average || 0) >= 74.5 && parseFloat(s.average || 0) < 89.5).length / classAnalytics.summary.total_students * 100).toFixed(1)}%` : 'N/A'],
        ['Needs Improvement (<74.5)', classAnalytics.students.filter(s => parseFloat(s.average || 0) > 0 && parseFloat(s.average || 0) < 74.5).length, classAnalytics.summary.total_students > 0 ? `${(classAnalytics.students.filter(s => parseFloat(s.average || 0) > 0 && parseFloat(s.average || 0) < 74.5).length / classAnalytics.summary.total_students * 100).toFixed(1)}%` : 'N/A']
      ];

      honorBreakdown.forEach(data => {
        row++;
        data.forEach((val, i) => {
          const cell = summarySheet.getCell(row, i + 1);
          cell.value = val;
          cell.border = cellBorder;
          if (i === 0) cell.font = { bold: true };
          if (i > 0) cell.alignment = { horizontal: 'center' };
        });
      });

      summarySheet.columns = [
        { width: 35 },
        { width: 20 },
        { width: 15 }
      ];

      // Sheet 2: Classification of Grades
      const classificationSheet = workbook.addWorksheet('Classification of Grades');
      classificationSheet.addImage(schoolLogoId, { tl: { col: 0, row: 0 }, ext: { width: 80, height: 80 } });
      classificationSheet.addImage(myLogoId, { tl: { col: classAnalytics.subjects.length, row: 0 }, ext: { width: 80, height: 80 } });

      classificationSheet.mergeCells(2, 1, 2, classAnalytics.subjects.length + 1);
      classificationSheet.getCell(2, 1).value = 'Republic of the Philippines';
      classificationSheet.getCell(2, 1).alignment = { horizontal: 'center' };
      classificationSheet.getCell(2, 1).font = { size: 11 };

      classificationSheet.mergeCells(3, 1, 3, classAnalytics.subjects.length + 1);
      classificationSheet.getCell(3, 1).value = 'DEPARTMENT OF EDUCATION';
      classificationSheet.getCell(3, 1).alignment = { horizontal: 'center' };
      classificationSheet.getCell(3, 1).font = { bold: true, size: 11 };

      classificationSheet.mergeCells(4, 1, 4, classAnalytics.subjects.length + 1);
      classificationSheet.getCell(4, 1).value = 'Region III';
      classificationSheet.getCell(4, 1).alignment = { horizontal: 'center' };
      classificationSheet.getCell(4, 1).font = { size: 11 };

      classificationSheet.mergeCells(5, 1, 5, classAnalytics.subjects.length + 1);
      classificationSheet.getCell(5, 1).value = 'TAPINAC ELEMENTARY SCHOOL';
      classificationSheet.getCell(5, 1).alignment = { horizontal: 'center' };
      classificationSheet.getCell(5, 1).font = { bold: true, size: 11 };

      classificationSheet.mergeCells(6, 1, 6, classAnalytics.subjects.length + 1);
      classificationSheet.getCell(6, 1).value = `S.Y. ${selectedSchoolYear}`;
      classificationSheet.getCell(6, 1).alignment = { horizontal: 'center' };
      classificationSheet.getCell(6, 1).font = { size: 11 };

      classificationSheet.mergeCells(8, 1, 8, classAnalytics.subjects.length + 1);
      classificationSheet.getCell(8, 1).value = `${classData?.grade_level || 'GRADE'} ${classData?.section || 'SECTION'} CLASSIFICATION OF GRADES Q${selectedQuarter} S.Y. ${selectedSchoolYear}`;
      classificationSheet.getCell(8, 1).style = titleStyle;
      classificationSheet.getRow(8).height = 25;

      row = 10;
      const headers = ['GRADES', ...classAnalytics.subjects.map(s => s.name.toUpperCase())];
      headers.forEach((header, i) => {
        const cell = classificationSheet.getCell(row, i + 1);
        cell.value = header;
        cell.style = headerStyle;
      });

      const gradeRanges = ['98-100', '95-97', '90-94', '85-89', '80-84', '75-79'];
      gradeRanges.forEach(range => {
        row++;
        classificationSheet.getCell(row, 1).value = range;
        classificationSheet.getCell(row, 1).font = { bold: true };
        classificationSheet.getCell(row, 1).border = cellBorder;
        classificationSheet.getCell(row, 1).alignment = { horizontal: 'center' };

        classAnalytics.subjects.forEach((subject, i) => {
          let count = 0;
          classAnalytics.students.forEach(student => {
            const grade = parseFloat(resolveSubjectGrade(student, subject));
            if (grade && !isNaN(grade)) {
              const [min, max] = range.split('-').map(Number);
              if (grade >= min && grade <= max) count++;
            }
          });
          const cell = classificationSheet.getCell(row, i + 2);
          cell.value = count;
          cell.border = cellBorder;
          cell.alignment = { horizontal: 'center' };
        });
      });

      row++;
      classificationSheet.getCell(row, 1).value = 'TOTAL';
      classificationSheet.getCell(row, 1).style = headerStyle;
      classAnalytics.subjects.forEach((subject, i) => {
        let total = 0;
        classAnalytics.students.forEach(student => {
          const grade = parseFloat(resolveSubjectGrade(student, subject));
          if (grade && !isNaN(grade)) total++;
        });
        const cell = classificationSheet.getCell(row, i + 2);
        cell.value = total;
        cell.style = headerStyle;
      });

      classificationSheet.columns = [
        { width: 12 },
        ...classAnalytics.subjects.map(s => ({ width: Math.max(15, s.name.length + 2) }))
      ];

      // Sheet 3: Student Performance
      const studentSheet = workbook.addWorksheet('Student Performance');
      studentSheet.addImage(schoolLogoId, { tl: { col: 0, row: 0 }, ext: { width: 80, height: 80 } });
      studentSheet.addImage(myLogoId, { tl: { col: classAnalytics.subjects.length + 5, row: 0 }, ext: { width: 80, height: 80 } });

      const studentHeaderLength = 6 + classAnalytics.subjects.length;
      studentSheet.mergeCells(2, 1, 2, studentHeaderLength);
      studentSheet.getCell(2, 1).value = 'Republic of the Philippines';
      studentSheet.getCell(2, 1).alignment = { horizontal: 'center' };
      studentSheet.getCell(2, 1).font = { size: 11 };

      studentSheet.mergeCells(3, 1, 3, studentHeaderLength);
      studentSheet.getCell(3, 1).value = 'DEPARTMENT OF EDUCATION';
      studentSheet.getCell(3, 1).alignment = { horizontal: 'center' };
      studentSheet.getCell(3, 1).font = { bold: true, size: 11 };

      studentSheet.mergeCells(4, 1, 4, studentHeaderLength);
      studentSheet.getCell(4, 1).value = 'Region III';
      studentSheet.getCell(4, 1).alignment = { horizontal: 'center' };
      studentSheet.getCell(4, 1).font = { size: 11 };

      studentSheet.mergeCells(5, 1, 5, studentHeaderLength);
      studentSheet.getCell(5, 1).value = 'TAPINAC ELEMENTARY SCHOOL';
      studentSheet.getCell(5, 1).alignment = { horizontal: 'center' };
      studentSheet.getCell(5, 1).font = { bold: true, size: 11 };

      studentSheet.mergeCells(6, 1, 6, studentHeaderLength);
      studentSheet.getCell(6, 1).value = `S.Y. ${selectedSchoolYear}`;
      studentSheet.getCell(6, 1).alignment = { horizontal: 'center' };
      studentSheet.getCell(6, 1).font = { size: 11 };

      studentSheet.mergeCells(8, 1, 8, studentHeaderLength);
      studentSheet.getCell(8, 1).value = `${classData?.grade_level || 'GRADE'} ${classData?.section || 'SECTION'} - STUDENT PERFORMANCE REPORT`;
      studentSheet.getCell(8, 1).style = titleStyle;
      studentSheet.getRow(8).height = 25;

      studentSheet.getCell(9, 1).value = 'Quarter:';
      studentSheet.getCell(9, 2).value = `Q${selectedQuarter}`;
      studentSheet.getCell(9, 3).value = 'School Year:';
      studentSheet.getCell(9, 4).value = selectedSchoolYear;
      studentSheet.getCell(9, 5).value = 'Generated:';
      studentSheet.getCell(9, 6).value = new Date().toLocaleDateString();

      row = 11;
      const studentHeaders = ['#', 'Student Name', 'LRN', ...classAnalytics.subjects.map(s => s.code || s.name), 'Average', 'Distinction', 'Rank'];
      studentHeaders.forEach((header, i) => {
        const cell = studentSheet.getCell(row, i + 1);
        cell.value = header;
        cell.style = headerStyle;
      });

      const sortedStudents = [...classAnalytics.students].sort((a, b) => parseFloat(b.average || 0) - parseFloat(a.average || 0));
      sortedStudents.forEach((student, index) => {
        row++;
        const avg = parseFloat(student.average || 0);
        let distinction = '';
        if (avg >= 97.5) distinction = 'WITH HIGHEST HONORS';
        else if (avg >= 94.5) distinction = 'WITH HIGH HONORS';
        else if (avg >= 89.5) distinction = 'WITH HONORS';
        else if (avg >= 74.5) distinction = 'SATISFACTORY';
        else if (avg > 0) distinction = 'NEEDS IMPROVEMENT';

        const rowData = [
          index + 1,
          formatStudentName(student),
          student.lrn,
          ...classAnalytics.subjects.map(subject => resolveSubjectGrade(student, subject) || '-'),
          student.average || '-',
          distinction,
          avg > 0 ? index + 1 : '-'
        ];

        rowData.forEach((val, i) => {
          const cell = studentSheet.getCell(row, i + 1);
          cell.value = val;
          cell.border = cellBorder;
          if (i === 0 || i === rowData.length - 1) cell.alignment = { horizontal: 'center' };
          if (i >= 3 && i < rowData.length - 2) cell.alignment = { horizontal: 'center' };
        });
      });

      studentSheet.columns = [
        { width: 5 },
        { width: 30 },
        { width: 15 },
        ...classAnalytics.subjects.map(() => ({ width: 10 })),
        { width: 10 },
        { width: 25 },
        { width: 8 }
      ];

      // Sheet 4: Subject Grade Distribution
      const subjectDistSheet = workbook.addWorksheet('Subject Distribution');
      subjectDistSheet.addImage(schoolLogoId, { tl: { col: 0, row: 0 }, ext: { width: 80, height: 80 } });
      subjectDistSheet.addImage(myLogoId, { tl: { col: 7, row: 0 }, ext: { width: 80, height: 80 } });

      subjectDistSheet.mergeCells('A2:I2');
      subjectDistSheet.getCell('A2').value = 'Republic of the Philippines';
      subjectDistSheet.getCell('A2').alignment = { horizontal: 'center' };
      subjectDistSheet.getCell('A2').font = { size: 11 };

      subjectDistSheet.mergeCells('A3:I3');
      subjectDistSheet.getCell('A3').value = 'DEPARTMENT OF EDUCATION';
      subjectDistSheet.getCell('A3').alignment = { horizontal: 'center' };
      subjectDistSheet.getCell('A3').font = { bold: true, size: 11 };

      subjectDistSheet.mergeCells('A4:I4');
      subjectDistSheet.getCell('A4').value = 'Region III';
      subjectDistSheet.getCell('A4').alignment = { horizontal: 'center' };
      subjectDistSheet.getCell('A4').font = { size: 11 };

      subjectDistSheet.mergeCells('A5:I5');
      subjectDistSheet.getCell('A5').value = 'TAPINAC ELEMENTARY SCHOOL';
      subjectDistSheet.getCell('A5').alignment = { horizontal: 'center' };
      subjectDistSheet.getCell('A5').font = { bold: true, size: 11 };

      subjectDistSheet.mergeCells('A6:I6');
      subjectDistSheet.getCell('A6').value = `S.Y. ${selectedSchoolYear}`;
      subjectDistSheet.getCell('A6').alignment = { horizontal: 'center' };
      subjectDistSheet.getCell('A6').font = { size: 11 };

      subjectDistSheet.mergeCells('A8:I8');
      subjectDistSheet.getCell('A8').value = 'SUBJECT GRADE DISTRIBUTION';
      subjectDistSheet.getCell('A8').style = titleStyle;
      subjectDistSheet.getRow(8).height = 25;

      subjectDistSheet.getCell('A9').value = 'Quarter:';
      subjectDistSheet.getCell('B9').value = `Q${selectedQuarter}`;
      subjectDistSheet.getCell('C9').value = 'School Year:';
      subjectDistSheet.getCell('D9').value = selectedSchoolYear;

      row = 11;
      const distHeaders = ['Subject', '98-100', '95-97', '90-94', '85-89', '80-84', '75-79', 'Below 75', 'Total'];
      distHeaders.forEach((header, i) => {
        const cell = subjectDistSheet.getCell(row, i + 1);
        cell.value = header;
        cell.style = headerStyle;
      });

      stackedSubjectData.forEach(subject => {
        row++;
        const data = [
          subject.subject,
          subject['98-100'] || 0,
          subject['95-97'] || 0,
          subject['90-94'] || 0,
          subject['85-89'] || 0,
          subject['80-84'] || 0,
          subject['75-79'] || 0,
          subject['Below 75'] || 0,
          subject.TOTAL || 0
        ];
        data.forEach((val, i) => {
          const cell = subjectDistSheet.getCell(row, i + 1);
          cell.value = val;
          cell.border = cellBorder;
          if (i === 0) cell.font = { bold: true };
          if (i > 0) cell.alignment = { horizontal: 'center' };
        });
      });

      subjectDistSheet.columns = [
        { width: 25 },
        { width: 10 },
        { width: 10 },
        { width: 10 },
        { width: 10 },
        { width: 10 },
        { width: 10 },
        { width: 12 },
        { width: 10 }
      ];

      // Sheet 5: Honor Students
      const honorSheet = workbook.addWorksheet('Honor Students');
      honorSheet.addImage(schoolLogoId, { tl: { col: 0, row: 0 }, ext: { width: 80, height: 80 } });
      honorSheet.addImage(myLogoId, { tl: { col: 4, row: 0 }, ext: { width: 80, height: 80 } });

      honorSheet.mergeCells('A2:E2');
      honorSheet.getCell('A2').value = 'Republic of the Philippines';
      honorSheet.getCell('A2').alignment = { horizontal: 'center' };
      honorSheet.getCell('A2').font = { size: 11 };

      honorSheet.mergeCells('A3:E3');
      honorSheet.getCell('A3').value = 'DEPARTMENT OF EDUCATION';
      honorSheet.getCell('A3').alignment = { horizontal: 'center' };
      honorSheet.getCell('A3').font = { bold: true, size: 11 };

      honorSheet.mergeCells('A4:E4');
      honorSheet.getCell('A4').value = 'Region III';
      honorSheet.getCell('A4').alignment = { horizontal: 'center' };
      honorSheet.getCell('A4').font = { size: 11 };

      honorSheet.mergeCells('A5:E5');
      honorSheet.getCell('A5').value = 'TAPINAC ELEMENTARY SCHOOL';
      honorSheet.getCell('A5').alignment = { horizontal: 'center' };
      honorSheet.getCell('A5').font = { bold: true, size: 11 };

      honorSheet.mergeCells('A6:E6');
      honorSheet.getCell('A6').value = `S.Y. ${selectedSchoolYear}`;
      honorSheet.getCell('A6').alignment = { horizontal: 'center' };
      honorSheet.getCell('A6').font = { size: 11 };

      honorSheet.mergeCells('A8:E8');
      honorSheet.getCell('A8').value = 'HONOR ROLL - STUDENTS WITH HONORS';
      honorSheet.getCell('A8').style = titleStyle;
      honorSheet.getRow(8).height = 25;

      honorSheet.getCell('A9').value = 'Quarter:';
      honorSheet.getCell('B9').value = `Q${selectedQuarter}`;
      honorSheet.getCell('C9').value = 'School Year:';
      honorSheet.getCell('D9').value = selectedSchoolYear;
      honorSheet.getCell('A10').value = 'Class:';
      honorSheet.getCell('B10').value = `${classData?.grade_level || ''} - ${classData?.section || ''}`;;

      row = 12;
      const honorHeaders = ['Rank', 'Student Name', 'LRN', 'Average', 'Distinction'];
      honorHeaders.forEach((header, i) => {
        const cell = honorSheet.getCell(row, i + 1);
        cell.value = header;
        cell.style = headerStyle;
      });

      classAnalytics.students
        .filter(student => parseFloat(student.average || 0) >= 89.5)
        .sort((a, b) => parseFloat(b.average || 0) - parseFloat(a.average || 0))
        .forEach((student, index) => {
          row++;
          const avg = parseFloat(student.average || 0);
          let distinction = '';
          if (avg >= 97.5) distinction = 'WITH HIGHEST HONORS';
          else if (avg >= 94.5) distinction = 'WITH HIGH HONORS';
          else if (avg >= 89.5) distinction = 'WITH HONORS';

          const data = [index + 1, formatStudentName(student), student.lrn, student.average, distinction];
          data.forEach((val, i) => {
            const cell = honorSheet.getCell(row, i + 1);
            cell.value = val;
            cell.border = cellBorder;
            if (i === 0 || i === 3) cell.alignment = { horizontal: 'center' };
          });
        });

      honorSheet.columns = [
        { width: 8 },
        { width: 30 },
        { width: 15 },
        { width: 10 },
        { width: 25 }
      ];

      // Generate and download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${classData?.grade_level || 'Grade'}_${classData?.section || 'Section'}_Q${selectedQuarter}_${selectedSchoolYear}_Analytics.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);

      toast.success('Professional analytics exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export analytics: ' + error.message);
    }
  };

  // Helper function to format adviser name
  const formatAdviserName = (user) => {
    if (!user) return 'ADVISER NAME';
    
    let adviserName = '';
    
    // Check for user_fullname first (as used in navbar)
    if (user.user_fullname && user.user_fullname.trim()) {
      adviserName = user.user_fullname.trim().toUpperCase();
    } else if (user.full_name && user.full_name.trim()) {
      adviserName = user.full_name.trim().toUpperCase();
    } else {
      // Build name from separate fields
      const firstName = (user.first_name || '').trim();
      const middleName = (user.middle_name || user.middle_initial || '').trim();
      const lastName = (user.last_name || '').trim();
      
      // Format middle name as initial (skip if it's just a dash)
      let middleInitial = '';
      if (middleName && middleName !== '-') {
        if (middleName.length <= 2 && middleName.includes('.')) {
          middleInitial = middleName.toUpperCase();
        } else if (middleName.length === 1) {
          middleInitial = middleName.toUpperCase() + '.';
        } else {
          middleInitial = middleName.charAt(0).toUpperCase() + '.';
        }
      }
      
      adviserName = [firstName, middleInitial, lastName]
        .filter(name => name && name.trim())
        .join(' ')
        .trim()
        .toUpperCase();
    }
    
    return adviserName || 'ADVISER NAME';
  };

  // Certificate generator states
  const [certificateSettings, setCertificateSettings] = useState({
    studentName: '',
    distinction: 'WITH HONORS',
    quarter: 'FIRST QUARTER',
    date: '29th day of August, 2025',
    adviser: formatAdviserName(user),
    schoolYear: 'SY 2025-2026'
  });
  const [selectedStudent, setSelectedStudent] = useState('');
  const [certificateImage, setCertificateImage] = useState(null);
  const [selectedCertificateTemplate, setSelectedCertificateTemplate] = useState('template1');
  const [bulkDownloadProgress, setBulkDownloadProgress] = useState({ show: false, current: 0, total: 0, type: '' });
  const [gradeRangeModal, setGradeRangeModal] = useState({ open: false, subject: '', range: '', students: [] });
  
  // Ensure school years are loaded and selected year is initialized
  useEffect(() => {
    // Load years list once
    if (!years || years.length === 0) {
      fetchYears().catch(() => {/* noop - handled in store */});
    }
    // If no local selection yet, use global or compute fallback
    if (!selectedSchoolYear) {
      if (globalSchoolYear) {
        setSelectedSchoolYear(globalSchoolYear);
      } else {
        const curr = new Date().getFullYear();
        setSelectedSchoolYear(`${curr}-${curr + 1}`);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep local selection in sync if global changes (e.g., user switches year from navbar)
  useEffect(() => {
    if (globalSchoolYear && globalSchoolYear !== selectedSchoolYear) {
      setSelectedSchoolYear(globalSchoolYear);
    }
  }, [globalSchoolYear]);

  // Build year options from store; fallback to +/- 2 years around current
  const getYearOptions = () => {
    if (years && years.length > 0) {
      return years.map((y) => y.name);
    }
    const currentYear = new Date().getFullYear();
    const opts = [];
    for (let i = -2; i <= 2; i++) {
      const startYear = currentYear + i;
      opts.push(`${startYear}-${startYear + 1}`);
    }
    return opts;
  };

  // Get quarter text
  const getQuarterText = (quarter) => {
    const quarters = {
      '1': 'FIRST QUARTER',
      '2': 'SECOND QUARTER',
      '3': 'THIRD QUARTER',
      '4': 'FOURTH QUARTER'
    };
    return quarters[quarter] || 'FIRST QUARTER';
  };

  const getQuarterLabel = (quarter) => {
    const labels = {
      '1': '1st Quarter',
      '2': '2nd Quarter',
      '3': '3rd Quarter',
      '4': '4th Quarter'
    };
    return labels[quarter] || '1st Quarter';
  };

  // Get distinction based on student's average - Updated to handle decimal grades
  const getStudentDistinction = (average) => {
    if (average >= 97.5) return 'WITH HIGHEST HONORS'; // 97.5+ counts as 98+
    if (average >= 94.5) return 'WITH HIGH HONORS';    // 94.5+ counts as 95+
    if (average >= 89.5) return 'WITH HONORS';         // 89.5+ counts as 90+
    return 'FOR ACADEMIC EXCELLENCE';
  };

  // Load selected certificate template
  useEffect(() => {
    const paths = CERTIFICATE_TEMPLATE_PATHS[selectedCertificateTemplate] || CERTIFICATE_TEMPLATE_PATHS.template1;
    let isCancelled = false;

    const loadPathAt = (index) => {
      if (index >= paths.length) {
        console.error('All image paths failed for template:', selectedCertificateTemplate);
        if (!isCancelled) setCertificateImage(null);
        return;
      }

      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        if (!isCancelled) {
          console.log('Certificate image loaded successfully:', paths[index]);
          setCertificateImage(img);
        }
      };

      img.onerror = () => {
        loadPathAt(index + 1);
      };

      img.src = paths[index];
    };

    loadPathAt(0);

    return () => {
      isCancelled = true;
    };
  }, [selectedCertificateTemplate]);

  const drawTemplateOneText = (ctx, targetWidth, studentName, distinction) => {
    const centerX = targetWidth / 2;
    const awardedDistinction = distinction || 'HONORS';

    // Student name
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 190px Anton, serif';
    ctx.fillText(studentName, centerX + 280, 1100);

    const nameWidth = ctx.measureText(studentName).width;
    ctx.beginPath();
    ctx.moveTo(centerX + 280 - nameWidth / 2, 1190);
    ctx.lineTo(centerX + 280 + nameWidth / 2, 1190);
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#000000';
    ctx.stroke();

    // Distinction
    ctx.fillStyle = '#1E3A8A';
    ctx.font = 'bold 130px "Archivo Black", serif';
    ctx.fillText(distinction, centerX + 280, 1280);

    // Body text
    ctx.fillStyle = '#2D3748';
    ctx.font = 'bold 64px "Tex Gyre Termes", serif';
    const textOffsetX = 280;
    const baseY = 1600;
    const lineSpacing = 85;

    ctx.fillText(
      `for exemplary academic performance and outstanding achievement in attaining ${awardedDistinction} during`,
      centerX + textOffsetX,
      baseY
    );

    ctx.fillText(
      `the ${certificateSettings.quarter} of ${certificateSettings.schoolYear}. Your dedication and responsibility are truly`,
      centerX + textOffsetX,
      baseY + lineSpacing
    );

    ctx.fillText(
      'commendable, serving as an inspiration to your classmates.',
      centerX + textOffsetX,
      baseY + lineSpacing * 2
    );

    // Date
    ctx.fillStyle = '#4A5568';
    ctx.font = 'bold 53px Georgia, "Times New Roman", serif';
    ctx.fillText(
      `Given this ${certificateSettings.date} at Tapinac Elementary School`,
      centerX + 280,
      1980
    );

    // Adviser
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 55px Georgia, "Times New Roman", serif';
    ctx.fillText(certificateSettings.adviser, centerX + 280, 2150);
    ctx.font = '32px Georgia, "Times New Roman", serif';
    ctx.fillText('ADVISER', centerX + 280, 2200);
  };

  const drawTemplateTwoText = (ctx, targetWidth, studentName, distinction) => {
    const centerX = targetWidth / 2;
    const contentX = centerX + 500;
    const awardedDistinction = distinction || 'HONORS';

    // Name and distinction styling based on the provided sample look.
    ctx.shadowColor = '#c5b9e5';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 8;
    ctx.shadowOffsetY = 8;

    ctx.fillStyle = '#5A4500';
    ctx.font = 'bold 185px Anton, serif';
    ctx.fillText(studentName, contentX, 1120);

    ctx.font = 'bold 145px Anton, serif';
    ctx.fillText(distinction, contentX, 1300);

    ctx.shadowColor = 'transparent';
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    ctx.fillStyle = '#111111';
    ctx.font = '500 56px "Poppins", "Trebuchet MS", sans-serif';
    ctx.fillText('for exemplary academic performance and outstanding achievement', contentX, 1495);
    ctx.fillText(`in attaining ${awardedDistinction} during the ${certificateSettings.quarter} of ${certificateSettings.schoolYear}.`, contentX, 1610);
    ctx.fillText('Your dedication and responsibility are truly commendable, serving', contentX, 1725);
    ctx.fillText('as an inspiration to your classmates.', contentX, 1840);

    ctx.fillStyle = '#1A1A1A';
    ctx.font = '500 64px "Poppins", "Trebuchet MS", sans-serif';
    ctx.fillText(`Given this ${certificateSettings.date} at Tapinac Elementary School`, contentX, 2070);

    ctx.fillStyle = '#5A4500';
    ctx.font = 'bold 58px "Poppins", "Trebuchet MS", sans-serif';
    ctx.fillText(certificateSettings.adviser, contentX, 2260);
    ctx.fillStyle = '#4D3C00';
    ctx.font = 'bold 48px "Poppins", "Trebuchet MS", sans-serif';
    ctx.fillText('ADVISER', contentX, 2330);
  };

  const drawCertificateTextByTemplate = (ctx, targetWidth, studentName, distinction) => {
    if (selectedCertificateTemplate === 'template2') {
      drawTemplateTwoText(ctx, targetWidth, studentName, distinction);
      return;
    }

    drawTemplateOneText(ctx, targetWidth, studentName, distinction);
  };

  // Update the helper function to format student names with middle initial only
  const formatStudentName = (student) => {
    // If the student object has separate first_name, middle_name, last_name fields
    if (student.first_name || student.last_name) {
      const firstName = student.first_name || '';
      const middleName = student.middle_name || student.middle_initial || '';
      const lastName = student.last_name || '';
      
      // Format middle name as initial only (skip if it's just a dash)
      let middleInitial = '';
      if (middleName && middleName.trim() && middleName !== '-') {
        // If it's already an initial with a dot, use as is
        if (middleName.length <= 2 && middleName.includes('.')) {
          middleInitial = middleName.toUpperCase();
        } 
        // If it's a single character, add a dot
        else if (middleName.length === 1) {
          middleInitial = middleName.toUpperCase() + '.';
        }
        // If it's a full middle name, take first character and add dot
        else {
          middleInitial = middleName.charAt(0).toUpperCase() + '.';
        }
      }
      
      // Format: "FIRST M. LAST" (remove extra spaces)
      return [firstName, middleInitial, lastName]
        .filter(name => name && name.trim()) // Remove empty/null values
        .join(' ')
        .trim()
        .toUpperCase();
    }
    
    // If only full_name is available, use it as is
    return (student.full_name || '').toUpperCase();
  };

  // Handle student selection for certificate
  const handleStudentSelect = (studentId) => {
    if (!classAnalytics) return;
    
    const student = classAnalytics.students.find(s => s.student_id === parseInt(studentId));
    if (student) {
      const distinction = getStudentDistinction(parseFloat(student.average || 0));
      const formattedName = formatStudentName(student);
      
      setCertificateSettings(prev => ({
        ...prev,
        studentName: formattedName,
        distinction: distinction,
        quarter: getQuarterText(selectedQuarter),
        schoolYear: `SY ${selectedSchoolYear}`
      }));
      setSelectedStudent(studentId);
    }
  };

  // Update the generateCertificate function with better text positioning
  const generateCertificate = () => {
    if (!certificateImage || !canvasRef.current) {
      console.log('Missing requirements:', { 
        certificateImage: !!certificateImage, 
        canvas: !!canvasRef.current 
      });
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // A4 landscape dimensions at 300 DPI for print quality
    const targetWidth = 3508;   // A4 landscape width (11.69" * 300 DPI)
    const targetHeight = 2480;  // A4 landscape height (8.27" * 300 DPI)
    
    // Set canvas size for high-resolution output
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    
    // Enable high-quality rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    // Clear canvas
    ctx.clearRect(0, 0, targetWidth, targetHeight);
    
    // Draw background image to fill entire canvas
    ctx.drawImage(certificateImage, 0, 0, targetWidth, targetHeight);
    
    // Text settings
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    drawCertificateTextByTemplate(
      ctx,
      targetWidth,
      certificateSettings.studentName,
      certificateSettings.distinction
    );
    
    console.log('High-resolution A4 certificate generated');
  };

  // Update the printCertificate function to print directly without opening new tab
  const printCertificate = () => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const dataUrl = canvas.toDataURL('image/png', 1.0);
    
    // Create a hidden iframe for printing
    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = 'none';
    
    document.body.appendChild(printFrame);
    
    const frameDoc = printFrame.contentWindow.document;
    frameDoc.open();
    frameDoc.write(`
      <html>
        <head>
          <title>Certificate - ${certificateSettings.studentName}</title>
          <style>
            @page {
              size: A4 landscape;
              margin: 0;
            }
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            html, body {
              margin: 0;
              padding: 0;
              width: 100%;
              height: 100%;
            }
            .certificate-container {
              width: 100vw;
              height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              background: white;
            }
            img {
              width: 100%;
              height: 100%;
              object-fit: fill;
              border: none;
            }
            @media print {
              .certificate-container {
                width: 100%;
                height: 100%;
              }
              img {
                width: 100% !important;
                height: 100% !important;
                object-fit: fill !important;
                page-break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <div class="certificate-container">
            <img src="${dataUrl}" alt="Certificate of Recognition" onload="window.print();" />
          </div>
        </body>
      </html>
    `);
    frameDoc.close();
    
    // Clean up the iframe after printing
    setTimeout(() => {
      document.body.removeChild(printFrame);
      toast.success('Certificate sent to printer!');
    }, 1000);
  };

  // Download certificate
  const downloadCertificate = () => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const link = document.createElement('a');
    link.download = `Certificate_${certificateSettings.studentName.replace(/\s+/g, '_')}.png`;
    link.href = canvas.toDataURL();
    link.click();
    
    toast.success('Certificate downloaded successfully!');
  };

  // Generate certificate for a specific student without updating UI
  const generateCertificateForStudent = (student, canvas, options = {}) => {
    if (!certificateImage || !canvas) return null;

    const {
      mimeType = 'image/png',
      quality = 1.0
    } = options;

    const ctx = canvas.getContext('2d');
    const targetWidth = 3508;
    const targetHeight = 2480;
    
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.clearRect(0, 0, targetWidth, targetHeight);
    ctx.drawImage(certificateImage, 0, 0, targetWidth, targetHeight);
    
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const avg = parseFloat(student.average || 0);
    const studentName = formatStudentName(student);
    let distinction = '';
    if (avg >= 97.5) distinction = 'WITH HIGHEST HONORS';
    else if (avg >= 94.5) distinction = 'WITH HIGH HONORS';
    else if (avg >= 89.5) distinction = 'WITH HONORS';
    
    drawCertificateTextByTemplate(ctx, targetWidth, studentName, distinction);
    
    return canvas.toDataURL(mimeType, quality);
  };

  // Download all certificates as ZIP
  const downloadAllCertificatesAsZip = async () => {
    const honorStudents = classAnalytics.students.filter(
      student => parseFloat(student.average || 0) >= 89.5
    );
    
    if (honorStudents.length === 0) {
      toast.error('No honor students to generate certificates for');
      return;
    }
    
    setBulkDownloadProgress({ show: true, current: 0, total: honorStudents.length, type: 'ZIP' });
    
    try {
      const zip = new JSZip();
      const tempCanvas = document.createElement('canvas');
      
      for (let i = 0; i < honorStudents.length; i++) {
        const student = honorStudents[i];
        setBulkDownloadProgress({ show: true, current: i + 1, total: honorStudents.length, type: 'ZIP' });
        
        // Small delay to allow UI to update
        await new Promise(resolve => setTimeout(resolve, 10));
        
        const dataUrl = generateCertificateForStudent(student, tempCanvas);
        if (dataUrl) {
          const base64Data = dataUrl.split(',')[1];
          const studentName = formatStudentName(student).replace(/\s+/g, '_');
          zip.file(`Certificate_${studentName}.png`, base64Data, { base64: true });
        }
      }
      
      const blob = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Certificates_${classData?.grade_level}_${classData?.section}_Q${selectedQuarter}.zip`;
      link.click();
      
      toast.success(`${honorStudents.length} certificates downloaded as ZIP!`);
    } catch (error) {
      console.error('Error generating ZIP:', error);
      toast.error('Failed to generate certificates ZIP');
    } finally {
      setBulkDownloadProgress({ show: false, current: 0, total: 0, type: '' });
    }
  };

  // Download all certificates as single PDF
  const downloadAllCertificatesAsPDF = async () => {
    const honorStudents = classAnalytics.students.filter(
      student => parseFloat(student.average || 0) >= 89.5
    );
    
    if (honorStudents.length === 0) {
      toast.error('No honor students to generate certificates for');
      return;
    }
    
    setBulkDownloadProgress({ show: true, current: 0, total: honorStudents.length, type: 'PDF' });
    
    try {
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
        compress: true
      });
      
      const tempCanvas = document.createElement('canvas');
      
      for (let i = 0; i < honorStudents.length; i++) {
        const student = honorStudents[i];
        setBulkDownloadProgress({ show: true, current: i + 1, total: honorStudents.length, type: 'PDF' });
        
        // Small delay to allow UI to update
        await new Promise(resolve => setTimeout(resolve, 10));
        
        const dataUrl = generateCertificateForStudent(student, tempCanvas, {
          mimeType: 'image/jpeg',
          quality: 0.92
        });
        
        if (dataUrl) {
          if (i > 0) pdf.addPage();
          
          // A4 landscape dimensions: 297mm x 210mm
          pdf.addImage(dataUrl, 'JPEG', 0, 0, 297, 210, undefined, 'MEDIUM');
        }
      }
      
      pdf.save(`Certificates_${classData?.grade_level}_${classData?.section}_Q${selectedQuarter}.pdf`);
      
      toast.success(`${honorStudents.length} certificates saved as PDF!`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setBulkDownloadProgress({ show: false, current: 0, total: 0, type: '' });
    }
  };

  // Auto-generate certificate when settings change
  useEffect(() => {
    if (certificateImage && certificateSettings.studentName) {
      generateCertificate();
    }
  }, [certificateSettings, certificateImage, selectedCertificateTemplate]);

  // Add this useEffect to force recalculation when analytics data changes
  useEffect(() => {
    if (classAnalytics?.students) {
      console.log('Recalculating honor roll with new thresholds...');
      
      // Force recalculation of honor stats with new thresholds
      const honorCount = classAnalytics.students.filter(student => 
        parseFloat(student.average || 0) >= 89.5
      ).length;
      
      console.log('Current honor students count:', honorCount);
      console.log('Honor students:', classAnalytics.students
        .filter(student => parseFloat(student.average || 0) >= 89.5)
        .map(s => ({ name: formatStudentName(s), average: s.average }))
      );
    }
  }, [classAnalytics]);

  // Also add this to force refresh analytics data
  const forceRefreshAnalytics = async () => {
    console.log('Force refreshing analytics...');
    if (classId && selectedQuarter && selectedSchoolYear) {
      await getClassAnalytics(classId, selectedQuarter, selectedSchoolYear);
    }
  };

  // Add this effect to refresh when quarter/year changes
  useEffect(() => {
    if (autoQuarterResolved) {
      forceRefreshAnalytics();
    }
  }, [selectedQuarter, selectedSchoolYear, autoQuarterResolved]);

  // Function to get students in a specific grade range for a subject
  const getStudentsInRange = (subjectName, rangeKey) => {
    if (!classAnalytics || !classAnalytics.students) return [];
    
    const rangeMap = {
      '98-100': { min: 97.5, max: 100 },
      '95-97': { min: 94.5, max: 97.4 },
      '90-94': { min: 89.5, max: 94.4 },
      '85-89': { min: 84.5, max: 89.4 },
      '80-84': { min: 79.5, max: 84.4 },
      '75-79': { min: 74.5, max: 79.4 },
      'Below 75': { min: 0, max: 74.4 }
    };
    
    const range = rangeMap[rangeKey];
    if (!range) return [];
    
    return classAnalytics.students.filter(student => {
      const grade = parseFloat(student.grades[subjectName]);
      if (!grade || isNaN(grade)) return false;
      return grade >= range.min && grade <= range.max;
    }).map(student => ({
      name: formatStudentName(student),
      grade: student.grades[subjectName],
      lrn: maskLRN(student.lrn)
    }));
  };

  // Handle clicking on a grade count
  const handleGradeRangeClick = (subjectName, rangeKey, count) => {
    if (count === 0) return; // Don't open modal for zero count
    
    const students = getStudentsInRange(subjectName, rangeKey);
    setGradeRangeModal({
      open: true,
      subject: subjectName,
      range: rangeKey,
      students: students
    });
  };

  // Add this function to prepare stacked chart data
  const prepareStackedSubjectData = () => {
    if (!classAnalytics || !classAnalytics.subjects) return [];
    
    const gradeRanges = [
      { key: '98-100', label: 'Highest Honors (97.5-100)', color: '#10B981' },
      { key: '95-97', label: 'High Honors (94.5-97.4)', color: '#3B82F6' },
      { key: '90-94', label: 'With Honors (89.5-94.4)', color: '#F59E0B' },
      { key: '85-89', label: 'Very Satisfactory (84.5-89.4)', color: '#8B5CF6' },
      { key: '80-84', label: 'Satisfactory (79.5-84.4)', color: '#06B6D4' },
      { key: '75-79', label: 'Fairly Satisfactory (74.5-79.4)', color: '#EF4444' },
      { key: 'Below 75', label: 'Below 74.5', color: '#9CA3AF' }
    ];

    return classAnalytics.subjects.map(subject => {
      const subjectData = { subject: subject.name };
      let total = 0;
      
      // Initialize all grade ranges to 0
      gradeRanges.forEach(range => {
        subjectData[range.key] = 0;
      });
      
      // Count students in each grade range for this subject
      classAnalytics.students.forEach(student => {
        const grade = parseFloat(resolveSubjectGrade(student, subject));
        if (grade && !isNaN(grade)) {
          total++;
          if (grade >= 97.5) subjectData['98-100']++;         // 97.5+ = Highest Honors
          else if (grade >= 94.5) subjectData['95-97']++;     // 94.5+ = High Honors  
          else if (grade >= 89.5) subjectData['90-94']++;     // 89.5+ = With Honors
          else if (grade >= 84.5) subjectData['85-89']++;     // 84.5+ = Very Satisfactory
          else if (grade >= 79.5) subjectData['80-84']++;     // 79.5+ = Satisfactory
          else if (grade >= 74.5) subjectData['75-79']++;     // 74.5+ = Fairly Satisfactory
          else subjectData['Below 75']++;                     // Below 74.5
        }
      });
      
      subjectData.TOTAL = total;
      return subjectData;
    });
  };
  
  // Fetch current user and set as adviser
  useEffect(() => {
    if (user) {
      // Format the adviser name from user data
      let adviserName = user.full_name || `${user.first_name || ''} ${user.middle_name || user.middle_initial || ''} ${user.last_name || ''}`;
      adviserName = adviserName.trim().toUpperCase();
      
      if (adviserName) {
        setCertificateSettings(prev => ({
          ...prev,
          adviser: adviserName
        }));
      }
    }
  }, [user]);

  useEffect(() => {
    const loadClassData = async () => {
      try {
        const data = await fetchClassById(classId);
        setClassData(data);
      } catch (err) {
        toast.error("Failed to load class details");
      }
    };
    
    loadClassData();
  }, [classId, fetchClassById]);
  
  useEffect(() => {
    const loadAnalytics = async () => {
      if (!classId || !selectedQuarter || !autoQuarterResolved) return;
      try {
        await getClassAnalytics(classId, selectedQuarter, selectedSchoolYear);
      } catch (err) {
        toast.error("Failed to load analytics data");
      }
    };
    loadAnalytics();
  }, [classId, selectedQuarter, selectedSchoolYear, getClassAnalytics, autoQuarterResolved]);

  // Auto-select the latest quarter that has grades
  useEffect(() => {
    let cancelled = false;
    const resolveQuarter = async () => {
      if (!classId || !selectedSchoolYear) return;
      const quarters = ['4', '3', '2', '1'];
      let found = false;
      for (const q of quarters) {
        try {
          const data = await getClassAnalytics(classId, q, selectedSchoolYear);
          if (cancelled) return;
          const count = data?.summary?.students_with_grades ?? 0;
          if (count > 0) {
            setSelectedQuarter(q);
            found = true;
            break;
          }
        } catch {
          // ignore and continue checking earlier quarters
        }
      }
      if (!cancelled) setAutoQuarterResolved(true);
      // If none found, selectedQuarter remains as default '1' and UI will show whatever data returned
    };
    setAutoQuarterResolved(false);
    resolveQuarter();
    return () => { cancelled = true; };
  }, [classId, selectedSchoolYear, getClassAnalytics]);
  
  const handleBack = () => {
    navigate(`/class/${classId}/students`);
  };
  
  const handleExport = () => {
    if (!classAnalytics) return;
    
    const exportData = prepareAnalyticsExport(classAnalytics, 'quarterly');
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `${exportData.className}_Q${selectedQuarter}_${selectedSchoolYear}_Analytics.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    toast.success('Analytics data exported successfully!');
  };

  
  
  // Prepare chart data
  const gradeDistributionData = classAnalytics ? 
    getGradeDistributionChartData(classAnalytics.gradeClassification) : [];
  
  const honorRollStats = classAnalytics ? 
    getHonorRollStats(classAnalytics.students) : null;
  const honorStudents = classAnalytics ? classAnalytics.students.filter(s => parseFloat(s.average || 0) >= 89.5) : [];

  // Distinction helper and filtered list for Students tab
  const getDistinctionForAvg = (avg) => {
    if (avg >= 97.5) return 'WITH HIGHEST HONORS';
    if (avg >= 94.5) return 'WITH HIGH HONORS';
    if (avg >= 89.5) return 'WITH HONORS';
    if (avg >= 74.5) return 'SATISFACTORY';
    if (avg > 0) return 'NEEDS IMPROVEMENT';
    return '';
  };

  const filteredStudents = classAnalytics ? classAnalytics.students.filter((s) => {
    if (selectedDistinction === 'ALL') return true;
    const d = getDistinctionForAvg(parseFloat(s.average || 0));
    return d === selectedDistinction;
  }) : [];

  // Students for a clicked grade bucket (rounded integer match)
  const getStudentsByGradeBucket = (bucket) => {
    if (!classAnalytics || !bucket) return [];
    const target = parseInt(bucket, 10);
    return classAnalytics.students.filter((s) => {
      const avg = parseFloat(s.average || 0);
      if (isNaN(avg)) return false;
      return Math.round(avg) === target; // aligns with 89.5+ thresholding
    });
  };

  // Precompute bucket -> students and honor category -> students for tooltips
  const bucketStudents = useMemo(() => {
    const map = {};
    if (!classAnalytics?.students) return map;
    classAnalytics.students.forEach((s) => {
      const avg = parseFloat(s.average || 0);
      if (!isNaN(avg)) {
        const b = String(Math.round(avg));
        if (!map[b]) map[b] = [];
        map[b].push(s);
      }
    });
    return map;
  }, [classAnalytics]);

  const honorCategoryStudents = useMemo(() => {
    const map = {
      'WITH HIGHEST HONORS': [],
      'WITH HIGH HONORS': [],
      'WITH HONORS': [],
      'BELOW HONORS': []
    };
    if (!classAnalytics?.students) return map;
    classAnalytics.students.forEach((s) => {
      const avg = parseFloat(s.average || 0);
      if (isNaN(avg)) return;
      const d = getDistinctionForAvg(avg);
      if (d) map[d]?.push(s); else map['BELOW HONORS'].push(s);
    });
    return map;
  }, [classAnalytics]);
  
  const subjectPerformance = classAnalytics ? 
    getSubjectPerformanceSummary(classAnalytics.subjectPerformance) : [];

  // Add this after the existing data preparation
  const stackedSubjectData = prepareStackedSubjectData();
  
  // Colors for charts
  const GRADE_COLORS = {
    '100': '#10B981', // Green
    '99': '#10B981',
    '98': '#10B981',
    '97': '#3B82F6', // Blue
    '96': '#3B82F6',
    '95': '#3B82F6',
    '94': '#F59E0B', // Amber
    '93': '#F59E0B',
    '92': '#F59E0B',
    '91': '#F59E0B',
    '90': '#F59E0B'
  };
  
  const HONOR_COLORS = ['#10B981', '#3B82F6', '#F59E0B'];
  
  const isLoading = classLoading || analyticsLoading;
  
  if (isLoading && !classData) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4 pt-20 sm:pt-24">
        <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full"></div>
        <span className="ml-3 text-gray-600">Loading analytics...</span>
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
      <div className="bg-gradient-to-r from-purple-600 to-purple-800 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden mb-8">
        <div className="absolute top-0 right-0 opacity-10 pointer-events-none">
          <BarChart3 size={200} />
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
          <div>
            <button 
              onClick={handleBack}
              className="flex items-center text-purple-100 hover:text-white mb-2 transition-colors"
            >
              <ChevronLeft size={20} className="mr-1" />
              <span>Back to Students</span>
            </button>
            <h1 className="text-2xl sm:text-3xl font-bold">
              Class Analytics
            </h1>
            <div className="flex items-center text-purple-100 mt-1">
              <BarChart3 size={16} className="mr-1.5" />
              <span>{classData ? `${classData.grade_level} - ${classData.section}` : 'Loading...'}</span>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <select 
              value={selectedQuarter}
              onChange={(e) => setSelectedQuarter(e.target.value)}
              className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-2 rounded-lg text-sm font-medium border border-white border-opacity-20"
            >
              <option value="1" className="text-gray-800">1st Quarter</option>
              <option value="2" className="text-gray-800">2nd Quarter</option>
              <option value="3" className="text-gray-800">3rd Quarter</option>
              <option value="4" className="text-gray-800">4th Quarter</option>
            </select>
            <select 
              value={selectedSchoolYear}
              onChange={(e) => setSelectedSchoolYear(e.target.value)}
              className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-2 rounded-lg text-sm font-medium border border-white border-opacity-20"
            >
              {getYearOptions().map((year) => (
                <option key={year} value={year} className="text-gray-800">{year}</option>
              ))}
            </select>
            
            {/* Export Buttons */}
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleExportExcel}
              disabled={!classAnalytics}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-300 flex items-center shadow-md"
            >
              <FileSpreadsheet className="h-5 w-5 mr-2" /> 
              Export Excel
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleExport}
              disabled={!classAnalytics}
              className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-300 flex items-center shadow-md disabled:opacity-50"
            >
              <Download className="h-5 w-5 mr-2" /> Export JSON
            </motion.button>
          </div>
        </div>
      </div>
      
      {/* Navigation Tabs */}
      <div className="bg-white rounded-2xl shadow-md mb-6 p-1">
        <div className="flex flex-wrap gap-1">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'students', label: 'Students', icon: Users },
            { id: 'subjects', label: 'Subjects', icon: BookOpen },
            { id: 'certificate', label: 'Certificate', icon: Award }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setSelectedView(id)}
              className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedView === id
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Icon size={16} className="mr-2" />
              {label}
            </button>
          ))}
        </div>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}
      
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full"></div>
          <span className="ml-3 text-gray-600">Loading analytics...</span>
        </div>
      ) : classAnalytics ? (
        <>
          {/* Overview Tab */}
          {selectedView === 'overview' && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-white rounded-2xl shadow-md p-6 border border-blue-100 cursor-pointer hover:shadow-lg transition"
                  onClick={() => {
                    setSelectedView('students');
                    // smooth scroll to students section if already on students tab
                    setTimeout(() => {
                      if (studentsSectionRef.current) {
                        studentsSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }
                    }, 0);
                  }}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-gray-500 text-sm font-medium">Total Students</p>
                      <h3 className="text-3xl font-bold text-gray-800 mt-1">
                        {classAnalytics.summary.total_students}
                      </h3>
                    </div>
                    <div className="bg-blue-100 p-3 rounded-lg">
                      <Users className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white rounded-2xl shadow-md p-6 border border-green-100"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-gray-500 text-sm font-medium">Class Average</p>
                      <h3 className="text-3xl font-bold text-gray-800 mt-1">
                        {classAnalytics.summary.class_average || 'N/A'}
                      </h3>
                    </div>
                    <div className="bg-green-100 p-3 rounded-lg">
                      <TrendingUp className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-white rounded-2xl shadow-md p-6 border border-amber-100 cursor-pointer hover:shadow-lg transition"
                  onClick={() => { setHonorFilter(null); setShowHonorModal(true); }}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-gray-500 text-sm font-medium">Honor Students</p>
                      <h3 className="text-3xl font-bold text-gray-800 mt-1">
                        {honorRollStats?.total || 0}
                      </h3>
                    </div>
                    <div className="bg-amber-100 p-3 rounded-lg">
                      <Award className="h-6 w-6 text-amber-600" />
                    </div>
                  </div>
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="bg-white rounded-2xl shadow-md p-6 border border-purple-100"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-gray-500 text-sm font-medium">With Grades</p>
                      <h3 className="text-3xl font-bold text-gray-800 mt-1">
                        {classAnalytics.summary.students_with_grades}
                      </h3>
                    </div>
                    <div className="bg-purple-100 p-3 rounded-lg">
                      <BookOpen className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>
                </motion.div>
              </div>
              
              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Grade Distribution Chart */}
                <div className="bg-white rounded-2xl shadow-md p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2 text-purple-600" />
                    Grade Distribution
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={gradeDistributionData.filter(item => item.count > 0)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="range" />
                      <YAxis />
                      <Tooltip 
                        content={({ active, label }) => {
                          if (!active || !label) return null;
                          const list = (bucketStudents[label] || []).map((s) => formatStudentName(s));
                          return (
                            <div className="bg-white border rounded-lg shadow p-3 text-sm max-w-xs">
                              <div className="font-semibold mb-1">Grade {label}</div>
                              <div className="text-gray-600 mb-2">Students: {list.length}</div>
                              {list.length > 0 && (
                                <ul className="list-disc pl-5 space-y-0.5 max-h-40 overflow-y-auto">
                                  {list.map((n, i) => (<li key={i} className="text-gray-700">{n}</li>))}
                                </ul>
                              )}
                            </div>
                          );
                        }}
                      />
                      <Bar 
                        dataKey="count" 
                        fill="#8B5CF6"
                        radius={[4, 4, 0, 0]}
                        cursor="pointer"
                        onClick={(data) => {
                          const label = data?.payload?.range;
                          if (label) setRangeModal({ open: true, range: label });
                        }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Honor Roll Pie Chart */}
                <div className="bg-white rounded-2xl shadow-md p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <Award className="h-5 w-5 mr-2 text-amber-600" />
                    Honor Roll Distribution
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPieChart>
                      <Pie
                        data={[
                          { key: 'WITH HIGHEST HONORS', name: 'Highest Honors (98-100)', value: honorRollStats?.withHighestHonors || 0, color: '#10B981', students: honorCategoryStudents['WITH HIGHEST HONORS'] },
                          { key: 'WITH HIGH HONORS', name: 'High Honors (95-97)', value: honorRollStats?.withHighHonors || 0, color: '#3B82F6', students: honorCategoryStudents['WITH HIGH HONORS'] },
                          { key: 'WITH HONORS', name: 'With Honors (90-94)', value: honorRollStats?.withHonors || 0, color: '#F59E0B', students: honorCategoryStudents['WITH HONORS'] },
                          { key: 'BELOW HONORS', name: 'Below Honors (<90)', value: (classAnalytics.summary.students_with_grades - (honorRollStats?.total || 0)), color: '#9CA3AF', students: honorCategoryStudents['BELOW HONORS'] }
                        ].filter(item => item.value > 0)}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={120}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        onClick={(data) => {
                          const cat = data?.payload?.key;
                          if (cat && cat !== 'BELOW HONORS') {
                            setHonorFilter(cat);
                            setShowHonorModal(true);
                          }
                        }}
                        cursor="pointer"
                      >
                        {[
                          { color: '#10B981' },
                          { color: '#3B82F6' },
                          { color: '#F59E0B' },
                          { color: '#9CA3AF' }
                        ].slice(0, 4).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (!active || !payload || !payload[0]) return null;
                          const p = payload[0].payload;
                          const list = (p.students || []).map((s) => formatStudentName(s));
                          return (
                            <div className="bg-white border rounded-lg shadow p-3 text-sm max-w-xs">
                              <div className="font-semibold mb-1">{p.name}</div>
                              <div className="text-gray-600 mb-2">Students: {list.length}</div>
                              {list.length > 0 && (
                                <ul className="list-disc pl-5 space-y-0.5 max-h-40 overflow-y-auto">
                                  {list.map((n, i) => (<li key={i} className="text-gray-700">{n}</li>))}
                                </ul>
                              )}
                            </div>
                          );
                        }}
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              {/* Grade Classification Table - Updated Title */}
              <div className="bg-white rounded-2xl shadow-md overflow-hidden">
                <div className="p-5 border-b border-gray-200 bg-gray-50">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                    <Award className="h-5 w-5 mr-2 text-red-600" />
                    Classification of Grades
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-red-600 text-white">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                          Grade Range
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                          Distinction
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                          Count
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                          Percentage
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {Object.entries(classAnalytics.gradeClassification).map(([range, data], index) => {
                        const percentage = classAnalytics.summary.students_with_grades > 0 
                          ? ((data.count / classAnalytics.summary.students_with_grades) * 100).toFixed(1)
                          : '0.0';
                        
                        return (
                          <tr key={range} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {range}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {data.label}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <button
                                type="button"
                                onClick={() => setRangeModal({ open: true, range })}
                                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 transition"
                                title="View students in this grade"
                              >
                                {data.count}
                              </button>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {percentage}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
          
          {/* Students Tab */}
          {selectedView === 'students' && (
            <div className="bg-white rounded-2xl shadow-md overflow-hidden" ref={studentsSectionRef}>
              <div className="p-5 border-b border-gray-200 bg-gray-50">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                    <Users className="h-5 w-5 mr-2 text-blue-600" />
                    Student Performance
                  </h3>
                  {/* Student Count */}
                  <div className="text-sm text-gray-600">
                    Showing <span className="font-semibold text-blue-600">{filteredStudents.length}</span> of <span className="font-semibold">{classAnalytics?.students?.length || 0}</span> students
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full divide-y divide-gray-200">
                  <thead className="bg-blue-600 text-white">
                    <tr>
                      <th className="px-3 py-2 text-center text-xs font-medium uppercase tracking-wider">
                        #
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider">
                        Student Name
                      </th>
                      <th className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wider">
                        LRN
                      </th>
                      {classAnalytics.subjects.map(subject => (
                        <th key={subject.id} className="px-2 py-2 text-center text-xs font-medium uppercase tracking-tight" title={subject.name}>
                          {subject.code || subject.name.substring(0, 6).toUpperCase()}
                        </th>
                      ))}
                      <th className="px-2 py-2 text-center text-xs font-medium uppercase tracking-wider">
                        AVG
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          <span>Distinction</span>
                          <select
                            value={selectedDistinction}
                            onChange={(e) => setSelectedDistinction(e.target.value)}
                            className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-medium border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all cursor-pointer backdrop-blur-sm"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <option value="ALL" className="bg-gray-800 text-white">All Students</option>
                            <option value="WITH HIGHEST HONORS" className="bg-gray-800 text-white">With Highest Honors</option>
                            <option value="WITH HIGH HONORS" className="bg-gray-800 text-white">With High Honors</option>
                            <option value="WITH HONORS" className="bg-gray-800 text-white">With Honors</option>
                            <option value="SATISFACTORY" className="bg-gray-800 text-white">Satisfactory</option>
                            <option value="NEEDS IMPROVEMENT" className="bg-gray-800 text-white">Needs Improvement</option>
                          </select>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredStudents.map((student, index) => {
                      const avg = parseFloat(student.average || 0);
                      let distinction = '';
                      let distinctionColor = '';
                      
                      // Updated distinction logic to handle decimal grades
                      if (avg >= 97.5) {
                        distinction = 'WITH HIGHEST HONORS';
                        distinctionColor = 'bg-green-100 text-green-800';
                      } else if (avg >= 94.5) {
                        distinction = 'WITH HIGH HONORS';
                        distinctionColor = 'bg-blue-100 text-blue-800';
                      } else if (avg >= 89.5) {
                        distinction = 'WITH HONORS';
                        distinctionColor = 'bg-amber-100 text-amber-800';
                      } else if (avg >= 74.5) {
                        distinction = 'SATISFACTORY';
                        distinctionColor = 'bg-gray-100 text-gray-800';
                      } else if (avg > 0) {
                        distinction = 'NEEDS IMPROVEMENT';
                        distinctionColor = 'bg-red-100 text-red-800';
                      }
                      
                      return (
                        <tr key={student.student_id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-3 py-2 text-center text-sm font-semibold text-gray-700">
                            {index + 1}
                          </td>
                          <td className="px-3 py-2 text-sm font-medium text-gray-900">
                            {formatStudentName(student)}
                          </td>
                          <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-500">
                            {maskLRN(student.lrn)}
                          </td>
                          {classAnalytics.subjects.map(subject => (
                            <td key={subject.id} className="px-2 py-2 whitespace-nowrap text-xs text-center">
                              {(() => {
                                const gradeValue = resolveSubjectGrade(student, subject);
                                return (
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                                  gradeValue >= 89.5 ? 'bg-green-100 text-green-800' :
                                  gradeValue >= 84.5 ? 'bg-blue-100 text-blue-800' :
                                  gradeValue >= 79.5 ? 'bg-amber-100 text-amber-800' :
                                  gradeValue >= 74.5 ? 'bg-gray-100 text-gray-800' :
                                  gradeValue ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-500'
                              }`}>
                                  {gradeValue || '--'}
                              </span>
                                );
                              })()}
                            </td>
                          ))}
                          <td className="px-2 py-2 whitespace-nowrap text-xs text-center">
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800">
                              {student.average || '--'}
                            </span>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-xs">
                            {distinction && (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-medium ${distinctionColor}`}>
                                {distinction}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {/* Subjects Tab - Updated with Stacked Chart */}
          {selectedView === 'subjects' && (
            <div className="space-y-6">
              {/* Stacked Bar Chart for Subject Grade Distribution */}
              <div className="bg-white rounded-2xl shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2 text-green-600" />
                  Subject Grade Distribution by Distinction
                </h3>
                
                <ResponsiveContainer width="100%" height={500}>
                  <BarChart 
                    data={stackedSubjectData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 100 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="subject" 
                      angle={-45} 
                      textAnchor="end" 
                      height={100}
                      fontSize={12}
                      stroke="#666"
                    />
                    <YAxis 
                      fontSize={12}
                      stroke="#666"
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                      formatter={(value, name) => [
                        `${value} students`, 
                        name
                      ]}
                      labelFormatter={(label) => `Subject: ${label}`}
                    />
                    
                    {/* Stacked Bars for each grade range */}
                    <Bar dataKey="98-100" stackId="grades" fill="#10B981" name="Highest Honors (98-100)" />
                    <Bar dataKey="95-97" stackId="grades" fill="#3B82F6" name="High Honors (95-97)" />
                    <Bar dataKey="90-94" stackId="grades" fill="#F59E0B" name="With Honors (90-94)" />
                    <Bar dataKey="85-89" stackId="grades" fill="#8B5CF6" name="Very Satisfactory (85-89)" />
                    <Bar dataKey="80-84" stackId="grades" fill="#06B6D4" name="Satisfactory (80-84)" />
                    <Bar dataKey="75-79" stackId="grades" fill="#EF4444" name="Fairly Satisfactory (75-79)" />
                    <Bar dataKey="Below 75" stackId="grades" fill="#9CA3AF" name="Below 75" />
                  </BarChart>
                </ResponsiveContainer>
                
                {/* Legend */}
                <div className="mt-6 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
                    <span className="text-xs text-gray-600">98-100 (Highest)</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-blue-500 rounded mr-2"></div>
                    <span className="text-xs text-gray-600">95-97 (High)</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-amber-500 rounded mr-2"></div>
                    <span className="text-xs text-gray-600">90-94 (Honors)</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-purple-500 rounded mr-2"></div>
                    <span className="text-xs text-gray-600">85-89 (V. Sat.)</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-cyan-500 rounded mr-2"></div>
                    <span className="text-xs text-gray-600">80-84 (Sat.)</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-red-500 rounded mr-2"></div>
                    <span className="text-xs text-gray-600">75-79 (F. Sat.)</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-gray-500 rounded mr-2"></div>
                    <span className="text-xs text-gray-600">Below 75</span>
                  </div>
                </div>
              </div>

              {/* Detailed Table */}
              <div className="bg-white rounded-2xl shadow-md overflow-hidden">
                <div className="p-5 border-b border-gray-200 bg-gray-50">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                    <BookOpen className="h-5 w-5 mr-2 text-green-600" />
                    Detailed Subject Grade Distribution
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-green-600 text-white">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                          Subject
                        </th>
                        <th className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider">
                          98-100
                        </th>
                        <th className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider">
                          95-97
                        </th>
                        <th className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider">
                          90-94
                        </th>
                        <th className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider">
                          85-89
                        </th>
                        <th className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider">
                          80-84
                        </th>
                        <th className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider">
                          75-79
                        </th>
                        <th className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider">
                          &lt;75
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {stackedSubjectData.map((subject, index) => (
                        <tr key={subject.subject} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {subject.subject}
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-center">
                            <button
                              onClick={() => handleGradeRangeClick(subject.subject, '98-100', subject['98-100'])}
                              disabled={!subject['98-100']}
                              className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-medium bg-green-100 text-green-800 ${subject['98-100'] ? 'hover:bg-green-200 cursor-pointer transition-colors' : 'cursor-default'}`}
                            >
                              {subject['98-100'] || 0}
                            </button>
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-center">
                            <button
                              onClick={() => handleGradeRangeClick(subject.subject, '95-97', subject['95-97'])}
                              disabled={!subject['95-97']}
                              className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-medium bg-blue-100 text-blue-800 ${subject['95-97'] ? 'hover:bg-blue-200 cursor-pointer transition-colors' : 'cursor-default'}`}
                            >
                              {subject['95-97'] || 0}
                            </button>
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-center">
                            <button
                              onClick={() => handleGradeRangeClick(subject.subject, '90-94', subject['90-94'])}
                              disabled={!subject['90-94']}
                              className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-medium bg-amber-100 text-amber-800 ${subject['90-94'] ? 'hover:bg-amber-200 cursor-pointer transition-colors' : 'cursor-default'}`}
                            >
                              {subject['90-94'] || 0}
                            </button>
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-center">
                            <button
                              onClick={() => handleGradeRangeClick(subject.subject, '85-89', subject['85-89'])}
                              disabled={!subject['85-89']}
                              className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-medium bg-purple-100 text-purple-800 ${subject['85-89'] ? 'hover:bg-purple-200 cursor-pointer transition-colors' : 'cursor-default'}`}
                            >
                              {subject['85-89'] || 0}
                            </button>
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-center">
                            <button
                              onClick={() => handleGradeRangeClick(subject.subject, '80-84', subject['80-84'])}
                              disabled={!subject['80-84']}
                              className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-medium bg-cyan-100 text-cyan-800 ${subject['80-84'] ? 'hover:bg-cyan-200 cursor-pointer transition-colors' : 'cursor-default'}`}
                            >
                              {subject['80-84'] || 0}
                            </button>
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-center">
                            <button
                              onClick={() => handleGradeRangeClick(subject.subject, '75-79', subject['75-79'])}
                              disabled={!subject['75-79']}
                              className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-medium bg-red-100 text-red-800 ${subject['75-79'] ? 'hover:bg-red-200 cursor-pointer transition-colors' : 'cursor-default'}`}
                            >
                              {subject['75-79'] || 0}
                            </button>
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-center">
                            <button
                              onClick={() => handleGradeRangeClick(subject.subject, 'Below 75', subject['Below 75'])}
                              disabled={!subject['Below 75']}
                              className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-medium bg-gray-100 text-gray-800 ${subject['Below 75'] ? 'hover:bg-gray-200 cursor-pointer transition-colors' : 'cursor-default'}`}
                            >
                              {subject['Below 75'] || 0}
                            </button>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-center">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-gray-800 text-white">
                              {subject.TOTAL}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Original Subject Performance Chart - Keep as reference */}
              <div className="bg-white rounded-2xl shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <BookOpen className="h-5 w-5 mr-2 text-blue-600" />
                  Subject Average Performance
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={subjectPerformance}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="subject" angle={-45} textAnchor="end" height={80} />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Bar dataKey="average" fill="#10B981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  
                  <div className="space-y-4">
                    {subjectPerformance.slice(0, 5).map((subject, index) => (
                      <div key={subject.subject} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <h4 className="font-medium text-gray-800">{subject.subject}</h4>
                          <p className="text-sm text-gray-600">{subject.performance}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-gray-800">{subject.average}</div>
                          <div className="text-xs text-gray-500">{subject.totalStudents} students</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Certificate Generator Tab */}
          {selectedView === 'certificate' && (
            <div className="space-y-6">
              {/* Certificate Settings */}
              <div className="bg-white rounded-2xl shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center">
                  <Award className="h-5 w-5 mr-2 text-amber-600" />
                  Certificate Generator
                </h3>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Settings Panel */}
                  <div className="space-y-6">
                    {/* Quick Student Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Certificate Template
                      </label>
                      <select
                        value={selectedCertificateTemplate}
                        onChange={(e) => setSelectedCertificateTemplate(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      >
                        <option value="template1">Template 1</option>
                        <option value="template2">Template 2</option>
                      </select>
                    </div>

                    {/* Quick Student Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Quick Select Student (Honor Students Only)
                      </label>
                      <select
                        value={selectedStudent}
                        onChange={(e) => handleStudentSelect(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      >
                        <option value="">Select a student...</option>
                        {classAnalytics.students
                          .filter(student => parseFloat(student.average || 0) >= 89.5) // Changed from 90 to 89.5
                          .map(student => (
                            <option key={student.student_id} value={student.student_id}>
                              {formatStudentName(student)} - {student.average} ({getStudentDistinction(parseFloat(student.average || 0))})
                            </option>
                          ))}
                      </select>
                    </div>

                    {/* Manual Settings */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Student Name
                        </label>
                        <input
                          type="text"
                          value={certificateSettings.studentName}
                          onChange={(e) => setCertificateSettings(prev => ({
                            ...prev,
                            studentName: e.target.value.toUpperCase()
                          }))}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                          placeholder="Enter student name"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Distinction
                        </label>
                        <select
                          value={certificateSettings.distinction}
                          onChange={(e) => setCertificateSettings(prev => ({
                            ...prev,
                            distinction: e.target.value
                          }))}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        >
                          <option value="WITH HIGHEST HONORS">WITH HIGHEST HONORS</option>
                          <option value="WITH HIGH HONORS">WITH HIGH HONORS</option>
                          <option value="WITH HONORS">WITH HONORS</option>
                          <option value="FOR ACADEMIC EXCELLENCE">FOR ACADEMIC EXCELLENCE</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Quarter
                        </label>
                        <select
                          value={certificateSettings.quarter}
                          onChange={(e) => setCertificateSettings(prev => ({
                            ...prev,
                            quarter: e.target.value
                          }))}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        >
                          <option value="FIRST QUARTER">FIRST QUARTER</option>
                          <option value="SECOND QUARTER">SECOND QUARTER</option>
                          <option value="THIRD QUARTER">THIRD QUARTER</option>
                          <option value="FOURTH QUARTER">FOURTH QUARTER</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          School Year
                        </label>
                        <input
                          type="text"
                          value={certificateSettings.schoolYear}
                          onChange={(e) => setCertificateSettings(prev => ({
                            ...prev,
                            schoolYear: e.target.value
                          }))}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                          placeholder="SY 2025-2026"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Date
                        </label>
                        <input
                          type="text"
                          value={certificateSettings.date}
                          onChange={(e) => setCertificateSettings(prev => ({
                            ...prev,
                            date: e.target.value
                          }))}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                          placeholder="29th day of August, 2025"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Adviser
                        </label>
                        <input
                          type="text"
                          value={certificateSettings.adviser}
                          onChange={(e) => setCertificateSettings(prev => ({
                            ...prev,
                            adviser: e.target.value.toUpperCase()
                          }))}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                          placeholder="ADVISER NAME"
                        />
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-3">
                      {/* Individual Certificate Actions */}
                      <div className="flex flex-col sm:flex-row gap-3">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={printCertificate}
                          disabled={!certificateSettings.studentName}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
                        >
                          <Printer className="h-5 w-5 mr-2" />
                          Print Certificate
                        </motion.button>
                        
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={downloadCertificate}
                          disabled={!certificateSettings.studentName}
                          className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
                        >
                          <Download className="h-5 w-5 mr-2" />
                          Download PNG
                        </motion.button>
                      </div>

                      {/* Bulk Download Actions */}
                      <div className="border-t pt-3">
                        <p className="text-sm font-medium text-gray-700 mb-2">Bulk Download All Honor Students:</p>
                        
                        {/* Progress Bar */}
                        {bulkDownloadProgress.show && (
                          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-blue-900">
                                Generating {bulkDownloadProgress.type}... {bulkDownloadProgress.current} / {bulkDownloadProgress.total}
                              </span>
                              <span className="text-sm font-bold text-blue-900">
                                {Math.round((bulkDownloadProgress.current / bulkDownloadProgress.total) * 100)}%
                              </span>
                            </div>
                            <div className="w-full bg-blue-200 rounded-full h-3 overflow-hidden">
                              <motion.div
                                className="bg-blue-600 h-3 rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${(bulkDownloadProgress.current / bulkDownloadProgress.total) * 100}%` }}
                                transition={{ duration: 0.3 }}
                              />
                            </div>
                            <p className="text-xs text-blue-700 mt-2">Please wait, this may take a moment...</p>
                          </div>
                        )}
                        
                        <div className="flex flex-col sm:flex-row gap-3">
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={downloadAllCertificatesAsZip}
                            disabled={bulkDownloadProgress.show || !classAnalytics?.students || classAnalytics.students.filter(s => parseFloat(s.average || 0) >= 89.5).length === 0}
                            className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
                          >
                            <Package className="h-5 w-5 mr-2" />
                            Download All (ZIP)
                          </motion.button>
                          
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={downloadAllCertificatesAsPDF}
                            disabled={bulkDownloadProgress.show || !classAnalytics?.students || classAnalytics.students.filter(s => parseFloat(s.average || 0) >= 89.5).length === 0}
                            className="flex-1 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
                          >
                            <FileText className="h-5 w-5 mr-2" />
                            Download All (PDF)
                          </motion.button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Certificate Preview */}
                  <div>
                    <h4 className="text-md font-medium text-gray-700 mb-4">Certificate Preview</h4>
                    <div className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50">
                      {certificateImage ? (
                        <div className="w-full max-w-2xl mx-auto">
                          <canvas
                            ref={canvasRef}
                            className="w-full h-auto border border-gray-300 rounded shadow-lg bg-white block"
                            style={{ 
                              aspectRatio: '3508/2480', // A4 landscape aspect ratio
                              maxHeight: '400px'
                            }}
                          />
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-64 bg-gray-100 rounded">
                          <div className="text-center">
                            <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-600">Loading certificate template...</p>
                            <p className="text-sm text-gray-500 mt-2">
                              Make sure your certificate template image is in the public folder
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Honor Students List for Reference */}
              <div className="bg-white rounded-2xl shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <Users className="h-5 w-5 mr-2 text-green-600" />
                  Honor Students ({getQuarterLabel(selectedQuarter)})
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {classAnalytics.students
                    .filter(student => parseFloat(student.average || 0) >= 89.5) // Changed from 90 to 89.5
                    .map(student => {
                      const avg = parseFloat(student.average || 0);
                      const distinction = getStudentDistinction(avg);
                      let bgColor = '';
                      
                      if (avg >= 97.5) bgColor = 'bg-green-100 border-green-300 text-green-800';
                      else if (avg >= 94.5) bgColor = 'bg-blue-100 border-blue-300 text-blue-800';
                      else if (avg >= 89.5) bgColor = 'bg-amber-100 border-amber-300 text-amber-800';
                      
                      return (
                        <motion.div
                          key={student.student_id}
                          whileHover={{ scale: 1.02 }}
                          className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${bgColor} ${
                            selectedStudent === student.student_id.toString() ? 'ring-2 ring-purple-500' : ''
                          }`}
                          onClick={() => handleStudentSelect(student.student_id.toString())}
                        >
                          <div className="text-center">
                            <h4 className="font-semibold text-sm">{formatStudentName(student)}</h4>
                            <p className="text-xs opacity-75 mb-2">{student.lrn}</p>
                            <div className="text-lg font-bold">{student.average}</div>
                            <p className="text-xs font-medium">{distinction}</p>
                          </div>
                        </motion.div>
                      );
                    })}
                </div>
                
                {classAnalytics.students.filter(student => parseFloat(student.average || 0) >= 89.5).length === 0 && (
                  <div className="text-center py-8">
                    <Award className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No honor students found for this quarter</p>
                    <p className="text-gray-400 text-sm mt-2">Students need an average of 89.5 or above</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-16">
          <BarChart3 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-xl">No analytics data available</p>
          <p className="text-gray-400 mt-2">Please ensure students have grades for the selected quarter</p>
        </div>
      )}
      {/* Honor Students Modal */}
      {showHonorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowHonorModal(false)}
          />
          <div className="relative bg-white rounded-xl w-full max-w-2xl shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h4 className="text-lg font-semibold">Honor Students{honorFilter ? ` — ${honorFilter}` : ''}</h4>
                <p className="text-sm text-gray-500">Q{selectedQuarter} • SY {selectedSchoolYear}</p>
              </div>
              <button
                className="px-3 py-1 rounded-lg text-sm bg-gray-100 hover:bg-gray-200"
                onClick={() => setShowHonorModal(false)}
              >
                Close
              </button>
            </div>
            <div className="max-h-[65vh] overflow-y-auto">
              <ul className="divide-y">
                {(honorFilter ? honorStudents.filter(s => getDistinctionForAvg(parseFloat(s.average || 0)) === honorFilter) : honorStudents)
                  .slice()
                  .sort((a,b) => parseFloat(b.average||0) - parseFloat(a.average||0))
                  .map((s) => {
                    const avg = parseFloat(s.average || 0);
                    const d = getDistinctionForAvg(avg);
                    const badgeClass =
                      avg >= 97.5 ? 'bg-green-100 text-green-800' :
                      avg >= 94.5 ? 'bg-blue-100 text-blue-800' :
                      'bg-amber-100 text-amber-800';
                    return (
                      <li key={s.student_id} className="p-4 flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900">{formatStudentName(s)}</div>
                          <div className="text-sm text-gray-500">LRN: {maskLRN(s.lrn)}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
                            {s.average}
                          </span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeClass}`}>
                            {d}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                {(honorFilter ? honorStudents.filter(s => getDistinctionForAvg(parseFloat(s.average || 0)) === honorFilter) : honorStudents).length === 0 && (
                  <li className="p-6 text-center text-gray-500">No honor students found.</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}
      {/* Grade Bucket Modal */}
      {rangeModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setRangeModal({ open: false, range: null })} />
          <div className="relative bg-white rounded-xl w-full max-w-2xl shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h4 className="text-lg font-semibold">Students with average ≈ {rangeModal.range}</h4>
                <p className="text-sm text-gray-500">
                  {classAnalytics?.gradeClassification?.[rangeModal.range]?.label || '—'} • Rounded to {rangeModal.range} • Q{selectedQuarter} • SY {selectedSchoolYear}
                </p>
              </div>
              <button
                className="px-3 py-1 rounded-lg text-sm bg-gray-100 hover:bg-gray-200"
                onClick={() => setRangeModal({ open: false, range: null })}
              >
                Close
              </button>
            </div>
            <div className="max-h-[65vh] overflow-y-auto">
              <ul className="divide-y">
                {getStudentsByGradeBucket(rangeModal.range)
                  .slice()
                  .sort((a,b) => parseFloat(b.average||0) - parseFloat(a.average||0))
                  .map((s) => {
                    const avg = parseFloat(s.average || 0);
                    const d = getDistinctionForAvg(avg);
                    const badgeClass =
                      avg >= 97.5 ? 'bg-green-100 text-green-800' :
                      avg >= 94.5 ? 'bg-blue-100 text-blue-800' :
                      avg >= 89.5 ? 'bg-amber-100 text-amber-800' :
                      avg >= 74.5 ? 'bg-gray-100 text-gray-800' : 'bg-red-100 text-red-800';
                    return (
                      <li key={s.student_id} className="p-4 flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900">{formatStudentName(s)}</div>
                          <div className="text-sm text-gray-500">LRN: {maskLRN(s.lrn)}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
                            {s.average}
                          </span>
                          {d && (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeClass}`}>
                              {d}
                            </span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                {getStudentsByGradeBucket(rangeModal.range).length === 0 && (
                  <li className="p-6 text-center text-gray-500">No students in this bucket.</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Grade Range Detail Modal */}
      {gradeRangeModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold">{gradeRangeModal.subject}</h3>
                  <p className="text-blue-100 mt-1">Grade Range: {gradeRangeModal.range}</p>
                  <p className="text-sm text-blue-200 mt-1">{gradeRangeModal.students.length} student{gradeRangeModal.students.length !== 1 ? 's' : ''}</p>
                </div>
                <button
                  onClick={() => setGradeRangeModal({ open: false, subject: '', range: '', students: [] })}
                  className="text-white hover:bg-blue-500 rounded-lg p-2 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {gradeRangeModal.students.length > 0 ? (
                <div className="space-y-3">
                  {gradeRangeModal.students
                    .sort((a, b) => parseFloat(b.grade) - parseFloat(a.grade))
                    .map((student, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div>
                          <div className="font-medium text-gray-900">{student.name}</div>
                          <div className="text-sm text-gray-500">LRN: {student.lrn}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-blue-100 text-blue-800">
                            {student.grade}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                  <p>No students in this grade range</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 px-6 py-4 flex justify-end">
              <button
                onClick={() => setGradeRangeModal({ open: false, subject: '', range: '', students: [] })}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};

export default ClassAnalyticsPage;
