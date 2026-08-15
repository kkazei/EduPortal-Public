import { Grade, QuarterlyAverage, Student, Class, Subject, User } from '../models/index.js';
import { Op } from 'sequelize';
import sequelize from '../db/dbConfig.js';

// Get class analytics for a specific quarter
export const getClassAnalytics = async (req, res) => {
  try {
    const { classId, quarter } = req.params;
    const { schoolYear } = req.query;
    
    // Get current school year if not provided
    const currentYear = new Date().getFullYear();
    const defaultSchoolYear = `${currentYear}-${currentYear + 1}`;
    const targetSchoolYear = schoolYear || defaultSchoolYear;
    
    // Validate quarter
    if (!['1', '2', '3', '4'].includes(quarter)) {
      return res.status(400).json({
        success: false,
        message: 'Quarter must be 1, 2, 3, or 4'
      });
    }
    
    // Check if class exists
    const classExists = await Class.findByPk(classId, {
      include: [
        {
          model: User,
          as: 'adviser',
          attributes: ['id', 'user_fullname', 'teacher_title']
        }
      ]
    });
    
    if (!classExists) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }
    
    // Get all grades for students in this class for the specified quarter
    const grades = await Grade.findAll({
      where: {
        class_id: classId,
        school_year: targetSchoolYear
      },
      include: [
        {
          model: Student,
          as: 'student',
          attributes: ['id', 'lrn', 'first_name', 'middle_name', 'last_name']
        },
        {
          model: Subject,
          as: 'subject',
          attributes: ['id', 'subject_name', 'subject_code']
        }
      ]
    });
    
    // Get all subjects for this class
    const classSubjects = await Class.findByPk(classId, {
      include: [
        {
          model: Subject,
          as: 'subjects',
          through: { attributes: [] }
        }
      ]
    });
    
    const subjects = classSubjects?.subjects || [];
    
    // Build the student roster for this class/year from grade records (historical-safe)
    const studentMap = new Map();
    grades.forEach(g => {
      if (g.student) {
        const s = g.student;
        if (!studentMap.has(s.id)) {
          studentMap.set(s.id, {
            id: s.id,
            lrn: s.lrn,
            first_name: s.first_name,
            middle_name: s.middle_name,
            last_name: s.last_name
          });
        }
      }
    });

    const students = Array.from(studentMap.values()).sort((a, b) => {
      const ln = a.last_name.localeCompare(b.last_name);
      if (ln !== 0) return ln;
      return a.first_name.localeCompare(b.first_name);
    });

    const normalizeSubjectKey = (value) => {
      if (value === null || value === undefined) return '';
      return String(value).trim().replace(/\s+/g, '').toLowerCase();
    };

    const subjectById = new Map(subjects.map((s) => [s.id, s]));

    // Process student data for the analytics table
    const studentsData = students.map(student => {
      const studentGrades = {};
      let totalGrades = 0;
      let gradeCount = 0;
      
      // Initialize all subjects with null grades
      subjects.forEach(subject => {
        studentGrades[subject.subject_name] = null;
      });
      
      // Fill in actual grades for the specified quarter
  const studentGradeRecords = grades.filter(grade => grade.student && grade.student.id === student.id);
      
      studentGradeRecords.forEach(grade => {
        const quarterField = `q${quarter}_grade`;
        const gradeValue = grade[quarterField];
        
        if (gradeValue !== null && gradeValue !== undefined) {
          const classSubject = subjectById.get(grade.subject_id);
          const canonicalName = classSubject?.subject_name || grade.subject?.subject_name;
          const canonicalCode = classSubject?.subject_code || grade.subject?.subject_code;

          if (canonicalName) {
            studentGrades[canonicalName] = gradeValue;
            studentGrades[normalizeSubjectKey(canonicalName)] = gradeValue;
          }
          if (canonicalCode) {
            studentGrades[canonicalCode] = gradeValue;
            studentGrades[normalizeSubjectKey(canonicalCode)] = gradeValue;
          }

          const parsedQuarterGrade = parseFloat(gradeValue);
          if (!Number.isNaN(parsedQuarterGrade)) {
            totalGrades += parsedQuarterGrade;
            gradeCount++;
          }
        }
      });
      
      // Calculate average for this quarter
      const average = gradeCount > 0 ? (totalGrades / gradeCount).toFixed(2) : null;
      
      return {
        student_id: student.id,
        lrn: student.lrn,
        first_name: student.first_name,
        middle_name: student.middle_name,
        last_name: student.last_name,
        full_name: `${student.last_name}, ${student.first_name} ${student.middle_name || ''}`.trim(),
        grades: studentGrades,
        average: average
      };
    });
    
    // Updated grade classification based on your specifications
    const gradeClassification = {
      '100': { label: 'WITH HIGHEST HONORS', count: 0, students: [] },
      '99': { label: 'WITH HIGHEST HONORS', count: 0, students: [] },
      '98': { label: 'WITH HIGHEST HONORS', count: 0, students: [] },
      '97': { label: 'WITH HIGH HONORS', count: 0, students: [] },
      '96': { label: 'WITH HIGH HONORS', count: 0, students: [] },
      '95': { label: 'WITH HIGH HONORS', count: 0, students: [] },
      '94': { label: 'WITH HONORS', count: 0, students: [] },
      '93': { label: 'WITH HONORS', count: 0, students: [] },
      '92': { label: 'WITH HONORS', count: 0, students: [] },
      '91': { label: 'WITH HONORS', count: 0, students: [] },
      '90': { label: 'WITH HONORS', count: 0, students: [] }
    };
    
    // Count students in each grade classification
    studentsData.forEach(student => {
      if (student.average !== null) {
        const avg = Math.round(parseFloat(student.average));
        
        if (gradeClassification[avg.toString()]) {
          gradeClassification[avg.toString()].count++;
          gradeClassification[avg.toString()].students.push(student);
        }
      }
    });
    
    // Calculate summary statistics
    const totalStudents = studentsData.length;
    const studentsWithGradesCount = studentsData.filter(s => s.average !== null).length;
    const studentsWithoutGrades = totalStudents - studentsWithGradesCount;
    
    // Calculate class average
    const allAverages = studentsData
      .filter(s => s.average !== null)
      .map(s => parseFloat(s.average));
    
    const classAverage = allAverages.length > 0 
      ? (allAverages.reduce((a, b) => a + b, 0) / allAverages.length).toFixed(2)
      : null;
    
    // Get subject performance (average per subject)
    const subjectPerformance = {};
    subjects.forEach(subject => {
      const subjectGrades = studentsData
        .map(student => {
          const normalizedName = normalizeSubjectKey(subject.subject_name);
          const normalizedCode = normalizeSubjectKey(subject.subject_code);
          return (
            student.grades[subject.subject_name] ??
            student.grades[subject.subject_code] ??
            student.grades[normalizedName] ??
            student.grades[normalizedCode]
          );
        })
        .filter(grade => grade !== null && grade !== undefined)
        .map(grade => parseFloat(grade));
      
      if (subjectGrades.length > 0) {
        subjectPerformance[subject.subject_name] = {
          average: (subjectGrades.reduce((a, b) => a + b, 0) / subjectGrades.length).toFixed(2),
          total_students: subjectGrades.length,
          highest: Math.max(...subjectGrades),
          lowest: Math.min(...subjectGrades)
        };
      } else {
        subjectPerformance[subject.subject_name] = {
          average: null,
          total_students: 0,
          highest: null,
          lowest: null
        };
      }
    });
    
    // Calculate honor roll counts for summary
    const honorRollSummary = {
      withHighestHonors: 0,  // 98-100
      withHighHonors: 0,     // 95-97
      withHonors: 0          // 90-94
    };
    
    studentsData.forEach(student => {
      if (student.average !== null) {
        const avg = parseFloat(student.average);
        if (avg >= 98) honorRollSummary.withHighestHonors++;
        else if (avg >= 95) honorRollSummary.withHighHonors++;
        else if (avg >= 90) honorRollSummary.withHonors++;
      }
    });
    
    res.status(200).json({
      success: true,
      data: {
        class: {
          id: classExists.id,
          grade_level: classExists.grade_level,
          section: classExists.section,
          school_year: targetSchoolYear,
          adviser_name: classExists.adviser?.user_fullname || classExists.adviser_name,
          adviser_title: classExists.adviser?.teacher_title || null
        },
        quarter: quarter,
        subjects: subjects.map(s => ({
          id: s.id,
          name: s.subject_name,
          code: s.subject_code
        })),
        students: studentsData,
        gradeClassification,
        honorRollSummary,
        summary: {
          total_students: totalStudents,
          students_with_grades: studentsWithGradesCount,
          students_without_grades: studentsWithoutGrades,
          class_average: classAverage
        },
        subjectPerformance
      }
    });
    
  } catch (error) {
    console.error('Error fetching class analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch class analytics',
      error: error.message
    });
  }
};

// Get yearly analytics for a class (all quarters)
export const getClassYearlyAnalytics = async (req, res) => {
  try {
    const { classId } = req.params;
    const { schoolYear } = req.query;
    
    // Get current school year if not provided
    const currentYear = new Date().getFullYear();
    const defaultSchoolYear = `${currentYear}-${currentYear + 1}`;
    const targetSchoolYear = schoolYear || defaultSchoolYear;
    
    // Check if class exists
    const classExists = await Class.findByPk(classId);
    if (!classExists) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }
    
    // Get quarterly averages for all students in the class
    const quarterlyAverages = await QuarterlyAverage.findAll({
      where: {
        class_id: classId,
        school_year: targetSchoolYear
      },
      include: [
        {
          model: Student,
          as: 'student',
          attributes: ['id', 'lrn', 'first_name', 'middle_name', 'last_name']
        }
      ],
      order: [['final_average', 'DESC']]
    });
    
    // Calculate trends (quarter-to-quarter improvement/decline)
    const trends = {
      improving: 0,
      declining: 0,
      stable: 0
    };
    
    quarterlyAverages.forEach(avg => {
      const quarters = [avg.q1_average, avg.q2_average, avg.q3_average, avg.q4_average]
        .filter(q => q !== null);
      
      if (quarters.length >= 2) {
        const firstQuarter = quarters[0];
        const lastQuarter = quarters[quarters.length - 1];
        const difference = lastQuarter - firstQuarter;
        
        if (difference > 2) trends.improving++;
        else if (difference < -2) trends.declining++;
        else trends.stable++;
      }
    });
    
    res.status(200).json({
      success: true,
      data: {
        class: {
          id: classExists.id,
          grade_level: classExists.grade_level,
          section: classExists.section,
          school_year: targetSchoolYear
        },
        yearlyAverages: quarterlyAverages,
        trends,
        summary: {
          total_students: quarterlyAverages.length,
          class_final_average: quarterlyAverages.length > 0 
            ? (quarterlyAverages.reduce((sum, avg) => sum + (avg.final_average || 0), 0) / quarterlyAverages.length).toFixed(2)
            : null
        }
      }
    });
    
  } catch (error) {
    console.error('Error fetching yearly analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch yearly analytics',
      error: error.message
    });
  }
};

// Get subject performance analytics
export const getSubjectAnalytics = async (req, res) => {
  try {
    const { classId, subjectId } = req.params;
    const { schoolYear } = req.query;
    
    // Get current school year if not provided
    const currentYear = new Date().getFullYear();
    const defaultSchoolYear = `${currentYear}-${currentYear + 1}`;
    const targetSchoolYear = schoolYear || defaultSchoolYear;
    
    // Get all grades for this subject in this class
    const grades = await Grade.findAll({
      where: {
        class_id: classId,
        subject_id: subjectId,
        school_year: targetSchoolYear
      },
      include: [
        {
          model: Student,
          as: 'student',
          attributes: ['id', 'lrn', 'first_name', 'last_name']
        },
        {
          model: Subject,
          as: 'subject',
          attributes: ['id', 'subject_name', 'subject_code']
        }
      ]
    });
    
    // Analyze performance by quarter
    const quarterlyPerformance = {
      q1: { grades: [], average: null, passing: 0, failing: 0 },
      q2: { grades: [], average: null, passing: 0, failing: 0 },
      q3: { grades: [], average: null, passing: 0, failing: 0 },
      q4: { grades: [], average: null, passing: 0, failing: 0 }
    };
    
    grades.forEach(grade => {
      ['q1', 'q2', 'q3', 'q4'].forEach(quarter => {
        const gradeValue = grade[`${quarter}_grade`];
        if (gradeValue !== null) {
          quarterlyPerformance[quarter].grades.push(gradeValue);
          if (gradeValue >= 75) {
            quarterlyPerformance[quarter].passing++;
          } else {
            quarterlyPerformance[quarter].failing++;
          }
        }
      });
    });
    
    // Calculate averages
    Object.keys(quarterlyPerformance).forEach(quarter => {
      const grds = quarterlyPerformance[quarter].grades;
      if (grds.length > 0) {
        quarterlyPerformance[quarter].average = 
          (grds.reduce((a, b) => a + b, 0) / grds.length).toFixed(2);
      }
    });
    
    res.status(200).json({
      success: true,
      data: {
        subject: grades[0]?.subject || null,
        class_id: classId,
        school_year: targetSchoolYear,
        quarterlyPerformance,
        students: grades.map(grade => ({
          student_id: grade.student.id,
          student_name: `${grade.student.first_name} ${grade.student.last_name}`,
          lrn: grade.student.lrn,
          q1_grade: grade.q1_grade,
          q2_grade: grade.q2_grade,
          q3_grade: grade.q3_grade,
          q4_grade: grade.q4_grade,
          final_grade: grade.final_grade,
          remarks: grade.remarks
        }))
      }
    });
    
  } catch (error) {
    console.error('Error fetching subject analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subject analytics',
      error: error.message
    });
  }
};

// Get comparison analytics between different classes
export const getClassComparison = async (req, res) => {
  try {
    const { schoolYear, gradeLevel } = req.query;
    
    // Get current school year if not provided
    const currentYear = new Date().getFullYear();
    const defaultSchoolYear = `${currentYear}-${currentYear + 1}`;
    const targetSchoolYear = schoolYear || defaultSchoolYear;
    
    // Build where condition for classes
    let classWhere = {};
    if (gradeLevel) {
      classWhere.grade_level = gradeLevel;
    }
    
    // Get all classes for comparison
    const classes = await Class.findAll({
      where: classWhere,
      include: [
        {
          model: QuarterlyAverage,
          as: 'quarterlyAverages',
          where: {
            school_year: targetSchoolYear
          },
          required: false
        }
      ]
    });
    
    // Calculate comparison data
    const comparisonData = classes.map(cls => {
      const averages = cls.quarterlyAverages || [];
      const totalStudents = averages.length;
      
      if (totalStudents === 0) {
        return {
          class_id: cls.id,
          class_name: `${cls.grade_level} - ${cls.section}`,
          total_students: 0,
          class_average: null,
          with_honors: 0,
          with_high_honors: 0,
          with_highest_honors: 0
        };
      }
      
      const classAverage = averages.reduce((sum, avg) => sum + (avg.final_average || 0), 0) / totalStudents;
      
      // Count honor categories based on exact classifications
      let withHonors = 0;          // 90-94
      let withHighHonors = 0;      // 95-97
      let withHighestHonors = 0;   // 98-100
      
      averages.forEach(avg => {
        const finalAvg = avg.final_average;
        if (finalAvg >= 98) withHighestHonors++;
        else if (finalAvg >= 95) withHighHonors++;
        else if (finalAvg >= 90) withHonors++;
      });
      
      return {
        class_id: cls.id,
        class_name: `${cls.grade_level} - ${cls.section}`,
        total_students: totalStudents,
        class_average: classAverage.toFixed(2),
        with_honors: withHonors,
        with_high_honors: withHighHonors,
        with_highest_honors: withHighestHonors
      };
    });
    
    res.status(200).json({
      success: true,
      data: {
        school_year: targetSchoolYear,
        grade_level: gradeLevel || 'All Grades',
        classes: comparisonData
      }
    });
    
  } catch (error) {
    console.error('Error fetching class comparison:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch class comparison',
      error: error.message
    });
  }
};

export default {
  getClassAnalytics,
  getClassYearlyAnalytics,
  getSubjectAnalytics,
  getClassComparison
};