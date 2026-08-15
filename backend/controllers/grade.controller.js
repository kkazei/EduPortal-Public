import { Grade, QuarterlyAverage, updateStudentQuarterlyAverages } from '../models/subject.model.js';
import Student from '../models/student.model.js';
import Class from '../models/class.model.js';
import Subject from '../models/subject.model.js';
import User from '../models/user.model.js';
import SchoolYear from '../models/schoolYear.model.js';

// Get all grades for a specific student
export const getStudentGrades = async (req, res) => {
  try {
    const { studentId } = req.params;
    
    const grades = await Grade.findAll({
      where: { student_id: studentId },
      include: [
        { model: Subject, as: 'subject' },
        { model: Class, as: 'class' }
      ]
    });
    
    return res.status(200).json(grades);
  } catch (error) {
    console.error('Error getting student grades:', error);
    return res.status(500).json({ message: 'Failed to retrieve student grades', error: error.message });
  }
};

// Get all grades for a specific class
export const getClassGrades = async (req, res) => {
  try {
    const { classId } = req.params;
    
    const grades = await Grade.findAll({
      where: { class_id: classId },
      include: [
        { model: Subject, as: 'subject' },
        { model: Student, as: 'student' }
      ]
    });
    
    return res.status(200).json(grades);
  } catch (error) {
    console.error('Error getting class grades:', error);
    return res.status(500).json({ message: 'Failed to retrieve class grades', error: error.message });
  }
};

// Create or update a student's grade for a subject
export const updateStudentGrade = async (req, res) => {
  try {
    const { studentId, subjectId, classId } = req.params;
    const { q1_grade, q2_grade, q3_grade, q4_grade, remarks, school_year } = req.body;
    
    // Check if student exists in the class
    const student = await Student.findOne({
      where: { 
        id: studentId,
        class_id: classId
      }
    });
    
    if (!student) {
      return res.status(404).json({ message: 'Student not found in this class' });
    }
    
    // Find or create the grade record
    const [grade, created] = await Grade.findOrCreate({
      where: { 
        student_id: studentId,
        subject_id: subjectId,
        class_id: classId,
        school_year: school_year || await SchoolYear.getActiveYearName()
      },
      defaults: {
        q1_grade,
        q2_grade,
        q3_grade,
        q4_grade,
        remarks
      }
    });
    
    // If record existed, update it
    if (!created) {
      await grade.update({
        q1_grade: q1_grade !== undefined ? q1_grade : grade.q1_grade,
        q2_grade: q2_grade !== undefined ? q2_grade : grade.q2_grade,
        q3_grade: q3_grade !== undefined ? q3_grade : grade.q3_grade,
        q4_grade: q4_grade !== undefined ? q4_grade : grade.q4_grade,
        remarks: remarks !== undefined ? remarks : grade.remarks
      });
    }
    
    // Reload to get calculated final_grade
    await grade.reload();
    
    // Update quarterly averages
    await updateStudentQuarterlyAverages(
      studentId,
      classId,
      grade.school_year
    );
    
    return res.status(created ? 201 : 200).json(grade);
  } catch (error) {
    console.error('Error updating student grade:', error);
    return res.status(500).json({ message: 'Failed to update grade', error: error.message });
  }
};

// Get report card data for a student (all subjects and grades)
export const getStudentReportCard = async (req, res) => {
  try {
    const { studentId, schoolYear } = req.params;
    
    // Get current school year if not provided
  const targetSchoolYear = schoolYear || await SchoolYear.getActiveYearName();
    
    // Get student basic info (with current class)
    const student = await Student.findByPk(studentId, {
      include: [{ model: Class, as: 'class' }]
    });
    
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    // Get all grades for this student in this specific school year (regardless of class)
    const grades = await Grade.findAll({
      where: { 
        student_id: studentId,
        school_year: targetSchoolYear
      },
      include: [
        { model: Subject, as: 'subject' },
        { model: Class, as: 'class' }
      ]
    });
    
    // For past school years, use the class from the grades
    // For current school year, use the student's current class if no grades exist
    let classId = null;
    let classInfo = null;
    
    if (grades.length > 0) {
      // Use class from historical grades for this school year
      classId = grades[0].class_id;
      classInfo = grades[0].class;
    } else {
      // If no grades yet (especially for current year), use current class
      classId = student.class_id;
      classInfo = student.class;
    }
    
    // Get quarterly averages for this student in this school year
    let quarterlyAverages = await QuarterlyAverage.findOne({
      where: {
        student_id: studentId,
        school_year: targetSchoolYear
      }
    });
    
    // If no quarterly averages but we have grades, calculate them
    if (!quarterlyAverages && grades.length > 0) {
      quarterlyAverages = await updateStudentQuarterlyAverages(
        studentId,
        classId,
        targetSchoolYear
      );
    }
    
    // Create subjects array from the grades for past school years
    // or from the current class for current school year if no grades exist
    let subjects = [];
    
    if (grades.length > 0) {
      // Map subjects from grades (for past school years)
      // Use Set to filter unique subjects (in case multiple grade entries per subject)
      const subjectIds = new Set();
      subjects = grades.reduce((acc, grade) => {
        if (!subjectIds.has(grade.subject_id)) {
          subjectIds.add(grade.subject_id);
          acc.push({
            id: grade.subject_id,
            subject_code: grade.subject.subject_code,
            subject_name: grade.subject.subject_name,
            q1_grade: grade.q1_grade || null,
            q2_grade: grade.q2_grade || null,
            q3_grade: grade.q3_grade || null,
            q4_grade: grade.q4_grade || null,
            final_grade: grade.final_grade || null,
            remarks: grade.remarks || null
          });
        }
        return acc;
      }, []);
    } else if (classId) {
      // For any school year with no grades, get subjects from the class
      // This is particularly important for current school year
      const classWithSubjects = await Class.findByPk(classId, {
        include: [{ model: Subject, as: 'subjects' }]
      });
      
      if (classWithSubjects?.subjects) {
        subjects = classWithSubjects.subjects.map(subject => ({
          id: subject.id,
          subject_code: subject.subject_code,
          subject_name: subject.subject_name,
          q1_grade: null,
          q2_grade: null,
          q3_grade: null,
          q4_grade: null,
          final_grade: null,
          remarks: null
        }));
      }
    }
    
    // Calculate GPA if any final grades exist
    let gpa = null;
    let totalGrade = 0;
    let gradedSubjects = 0;
    
    subjects.forEach(subject => {
      if (subject.final_grade) {
        totalGrade += parseFloat(subject.final_grade);
        gradedSubjects++;
      }
    });
    
    if (gradedSubjects > 0) {
      gpa = (totalGrade / gradedSubjects).toFixed(2);
    }
    
    // Construct the report card response
    const reportCard = {
      student: {
        id: student.id,
        student_id: student.student_id,
        first_name: student.first_name,
        last_name: student.last_name
      },
      class: classInfo ? {
        id: classInfo.id,
        section: classInfo.section,
        adviser_name: classInfo.adviser_name,
        grade_level: classInfo.grade_level
      } : null,
      school_year: targetSchoolYear,
      subjects: subjects,
      quarterlyAverages: quarterlyAverages ? {
        q1_average: quarterlyAverages.q1_average || null,
        q2_average: quarterlyAverages.q2_average || null,
        q3_average: quarterlyAverages.q3_average || null,
        q4_average: quarterlyAverages.q4_average || null,
        final_average: quarterlyAverages.final_average || null,
        remarks: quarterlyAverages.remarks || null
      } : {
        q1_average: null,
        q2_average: null,
        q3_average: null,
        q4_average: null,
        final_average: null,
        remarks: null
      },
      gpa
    };
    
    return res.status(200).json(reportCard);
  } catch (error) {
    console.error('Error getting student report card:', error);
    return res.status(500).json({ 
      message: 'Failed to retrieve report card', 
      error: error.message 
    });
  }
};

export const getStudentCard = async (req, res) => {
  try {
    const { studentId, schoolYear } = req.params;
    
    // Get current school year if not provided
  const targetSchoolYear = schoolYear || await SchoolYear.getActiveYearName();
    
    // Get student basic info
    const student = await Student.findByPk(studentId);
    
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    // Get all grades for this student in this specific school year (regardless of class)
    const grades = await Grade.findAll({
      where: { 
        student_id: studentId,
        school_year: targetSchoolYear
      },
      include: [
        { model: Subject, as: 'subject' },
        { 
          model: Class, 
          as: 'class',
          include: [
            {
              model: User,
              as: 'adviser',
              attributes: ['id', 'user_fullname', 'teacher_title']
            }
          ]
        }
      ]
    });
    
    // For past school years, use the class from the grades
    // For current school year, use the student's current class if no grades exist
    let classId = null;
    let classInfo = null;
    
    if (grades.length > 0) {
      // Use class from historical grades for this school year
      classId = grades[0].class_id;
      classInfo = grades[0].class;
    } else {
      // If no grades yet (especially for current year), use current class
      classId = student.class_id;
      // Update this line to include the adviser relationship
      classInfo = await Class.findByPk(student.class_id, {
        include: [
          {
            model: User,
            as: 'adviser',
            attributes: ['id', 'user_fullname', 'teacher_title']
          }
        ]
      });
    }
    
    // Get quarterly averages for this student in this school year
    let quarterlyAverages = await QuarterlyAverage.findOne({
      where: {
        student_id: studentId,
        school_year: targetSchoolYear
      }
    });
    
    // Create subjects array from the grades for past school years
    // or from the current class for current school year if no grades exist
    let subjects = [];

    if (grades.length > 0) {
      // Map subjects from grades (for past school years)
      const subjectIds = new Set();
      subjects = grades.reduce((acc, grade) => {
        if (!subjectIds.has(grade.subject_id)) {
          subjectIds.add(grade.subject_id);
          acc.push({
            id: grade.subject_id,
            subject_code: grade.subject.subject_code,
            subject_name: grade.subject.subject_name,
            q1_grade: grade.q1_grade || null,
            q2_grade: grade.q2_grade || null,
            q3_grade: grade.q3_grade || null,
            q4_grade: grade.q4_grade || null,
            final_grade: grade.final_grade || null,
            remarks: grade.remarks || null
          });
        }
        return acc;
      }, []);
    } else if (targetSchoolYear === (await SchoolYear.getActiveYearName()) && classId) {
      // For current school year with no grades, get subjects from current class
      const classWithSubjects = await Class.findByPk(classId, {
        include: [{ model: Subject, as: 'subjects' }]
      });

      if (classWithSubjects?.subjects) {
        subjects = classWithSubjects.subjects.map(subject => ({
          id: subject.id,
          subject_code: subject.subject_code,
          subject_name: subject.subject_name,
          q1_grade: null,
          q2_grade: null,
          q3_grade: null,
          q4_grade: null,
          final_grade: null,
          remarks: null
        }));
      }
    }
    
    // Calculate GPA
    let gpa = null;
    let totalGrade = 0;
    let gradedSubjects = 0;
    
    subjects.forEach(subject => {
      if (subject.final_grade) {
        totalGrade += parseFloat(subject.final_grade);
        gradedSubjects++;
      }
    });
    
    if (gradedSubjects > 0) {
      gpa = (totalGrade / gradedSubjects).toFixed(2);
    }
    
    // Construct the report card response
    const reportCard = {
      student: {
        id: student.id,
        student_id: student.student_id,
        first_name: student.first_name,
        middle_name: student.middle_name,
        last_name: student.last_name,
        birthdate: student.birthdate,
        age: student.age,
        sex: student.sex,
        lrn: student.lrn // Add LRN here
      },
      class: classInfo ? {
        id: classInfo.id,
        class_name: classInfo.class_name,
        grade_level: classInfo.grade_level,
        section: classInfo.section,
        // Add adviser information
        adviser_name: classInfo.adviser?.user_fullname || null,
        adviser_title: classInfo.adviser?.teacher_title || null
      } : null,
      school_year: targetSchoolYear,
      subjects: subjects,
      quarterlyAverages: quarterlyAverages ? {
        q1_average: quarterlyAverages.q1_average || null,
        q2_average: quarterlyAverages.q2_average || null,
        q3_average: quarterlyAverages.q3_average || null,
        q4_average: quarterlyAverages.q4_average || null,
        final_average: quarterlyAverages.final_average || null,
        remarks: quarterlyAverages.remarks || null
      } : {
        q1_average: null,
        q2_average: null,
        q3_average: null,
        q4_average: null,
        final_average: null,
        remarks: null
      },
      gpa
    };
    
    return res.status(200).json(reportCard);
  } catch (error) {
    console.error('Error getting student card:', error);
    return res.status(500).json({ 
      message: 'Failed to retrieve student card', 
      error: error.message 
    });
  }
};

// Update multiple grades at once
export const updateMultipleGrades = async (req, res) => {
  try {
    const { studentId, classId } = req.params;
    const { gradesData, school_year } = req.body;
    
    // Validate input
    if (!gradesData || typeof gradesData !== 'object') {
      return res.status(400).json({ message: 'Invalid grades data provided' });
    }
    
    // Check if student exists in the class
    const student = await Student.findOne({
      where: { 
        id: studentId,
        class_id: classId
      }
    });
    
    if (!student) {
      return res.status(404).json({ message: 'Student not found in this class' });
    }
    
    // Current school year if not provided
    const currentYear = new Date().getFullYear();
    const defaultSchoolYear = `${currentYear}-${currentYear + 1}`;
    const targetSchoolYear = school_year || defaultSchoolYear;
    
    // Process each subject grade
    const updatePromises = [];
    
    for (const subjectId in gradesData) {
      if (Object.hasOwnProperty.call(gradesData, subjectId)) {
        const gradeData = gradesData[subjectId];
        
        // Find or create the grade record
        const [grade, created] = await Grade.findOrCreate({
          where: { 
            student_id: studentId,
            subject_id: subjectId,
            class_id: classId,
            school_year: targetSchoolYear
          },
          defaults: {
            q1_grade: gradeData.q1_grade || null,
            q2_grade: gradeData.q2_grade || null,
            q3_grade: gradeData.q3_grade || null,
            q4_grade: gradeData.q4_grade || null,
            remarks: gradeData.remarks || null
          }
        });
        
        // If record existed, update it
        if (!created) {
          updatePromises.push(
            grade.update({
              q1_grade: gradeData.q1_grade !== undefined ? gradeData.q1_grade : grade.q1_grade,
              q2_grade: gradeData.q2_grade !== undefined ? gradeData.q2_grade : grade.q2_grade,
              q3_grade: gradeData.q3_grade !== undefined ? gradeData.q3_grade : grade.q3_grade,
              q4_grade: gradeData.q4_grade !== undefined ? gradeData.q4_grade : grade.q4_grade,
              remarks: gradeData.remarks !== undefined ? gradeData.remarks : grade.remarks
            })
          );
        }
      }
    }
    
    // Wait for all updates to complete
    if (updatePromises.length > 0) {
      await Promise.all(updatePromises);
    }
    
    // Update quarterly averages after all grades are updated
    await updateStudentQuarterlyAverages(
      studentId,
      classId,
      targetSchoolYear
    );
    
    return res.status(200).json({ message: 'Grades updated successfully' });
  } catch (error) {
    console.error('Error updating multiple grades:', error);
    return res.status(500).json({ 
      message: 'Failed to update grades', 
      error: error.message 
    });
  }
};

// New endpoint to get quarterly averages for a student
export const getQuarterlyAverages = async (req, res) => {
  try {
    const { studentId, classId, schoolYear } = req.params;
    
    // Get current school year if not provided
  const targetSchoolYear = schoolYear || await SchoolYear.getActiveYearName();
    
    // Get quarterly averages
    let quarterlyAverages = await QuarterlyAverage.findOne({
      where: {
        student_id: studentId,
        class_id: classId,
        school_year: targetSchoolYear
      }
    });
    
    // If no record exists, calculate it now
    if (!quarterlyAverages) {
      quarterlyAverages = await updateStudentQuarterlyAverages(
        studentId,
        classId,
        targetSchoolYear
      );
    }
    
    return res.status(200).json({
      quarterlyAverages: {
        q1_average: quarterlyAverages?.q1_average || null,
        q2_average: quarterlyAverages?.q2_average || null,
        q3_average: quarterlyAverages?.q3_average || null,
        q4_average: quarterlyAverages?.q4_average || null,
        final_average: quarterlyAverages?.final_average || null,
        remarks: quarterlyAverages?.remarks || null
      }
    });
  } catch (error) {
    console.error('Error getting quarterly averages:', error);
    return res.status(500).json({
      message: 'Failed to retrieve quarterly averages',
      error: error.message
    });
  }
};

// Get class rankings based on final averages
export const getClassRankings = async (req, res) => {
  try {
    const { classId, schoolYear } = req.params;
    
    // Get current school year if not provided
  const targetSchoolYear = schoolYear || await SchoolYear.getActiveYearName();
    
    // Get all quarterly averages for students in this class
    const classAverages = await QuarterlyAverage.findAll({
      where: {
        class_id: classId,
        school_year: targetSchoolYear
      },
      include: [
        { 
          model: Student, 
          as: 'student',
          attributes: ['id', 'first_name', 'last_name', 'lrn'] 
        }
      ],
      order: [['final_average', 'DESC']]
    });
    
    // Format the results with rankings
    const rankings = classAverages.map((average, index) => {
      return {
        rank: index + 1,
        student_id: average.student_id,
        student_name: `${average.student.first_name} ${average.student.last_name}`,
        lrn: average.student.lrn,
        q1_average: average.q1_average,
        q2_average: average.q2_average,
        q3_average: average.q3_average,
        q4_average: average.q4_average,
        final_average: average.final_average,
        remarks: average.remarks
      };
    });
    
    return res.status(200).json({
      class_id: classId,
      school_year: targetSchoolYear,
      rankings
    });
  } catch (error) {
    console.error('Error getting class rankings:', error);
    return res.status(500).json({
      message: 'Failed to retrieve class rankings',
      error: error.message
    });
  }
};

// Add this function after the existing functions

// Import grades from Excel data
export const importGradesFromExcel = async (req, res) => {
  try {
    const { class_id, students_data, quarter } = req.body;
    
    if (!class_id || !students_data || !quarter) {
      return res.status(400).json({
        success: false,
        message: 'Class ID, students data, and quarter are required'
      });
    }
    
    let importedCount = 0;
    let errorCount = 0;
    const errors = [];
    const skippedSubjects = new Map();
    
  // Current school year
  const defaultSchoolYear = await SchoolYear.getActiveYearName();
    
    const normalizeSubjectKey = (value) => {
      if (value === null || value === undefined) return '';
      return String(value)
        .trim()
        .replace(/\s+/g, ' ')
        .toLowerCase();
    };

    // Load a subject lookup map once per import to avoid per-row DB scans.
    const subjectLookup = new Map();
    const allSubjects = await Subject.findAll({ attributes: ['id', 'subject_name'] });
    for (const s of allSubjects) {
      const key = normalizeSubjectKey(s.subject_name);
      if (key && !subjectLookup.has(key)) subjectLookup.set(key, s);
    }

    // Process each student's data
    for (const studentData of students_data) {
      try {
        const { student_id, subjects } = studentData;
        
        // Find student to verify they exist
        const student = await Student.findByPk(student_id);
        if (!student) {
          errors.push(`Student with ID ${student_id} not found`);
          errorCount++;
          continue;
        }
        
        // Process each subject for this student
        for (const [subjectName, gradeData] of Object.entries(subjects)) {
          try {
            // Find subject by name (robust matching: trim/case-insensitive)
            const normalized = normalizeSubjectKey(subjectName);

            // Primary: normalized match via lookup map (case/space insensitive)
            let subject = normalized ? (subjectLookup.get(normalized) || null) : null;

            // Fallback: exact match (covers rare edge cases)
            if (!subject) {
              subject = await Subject.findOne({ where: { subject_name: subjectName } });
            }
            
            if (!subject) {
              skippedSubjects.set(subjectName, (skippedSubjects.get(subjectName) || 0) + 1);
              errors.push(`Subject '${subjectName}' not found`);
              continue;
            }
            
            // Get the grade for the specified quarter
            const gradeValue = gradeData[`q${quarter}_grade`];
            
            if (gradeValue !== undefined && gradeValue !== null) {
              // Find or create grade record
              const [grade, created] = await Grade.findOrCreate({
                where: {
                  student_id: student_id,
                  subject_id: subject.id,
                  class_id: class_id,
                  school_year: defaultSchoolYear
                },
                defaults: {
                  [`q${quarter}_grade`]: gradeValue
                }
              });
              
              // If record existed, update it
              if (!created) {
                await grade.update({
                  [`q${quarter}_grade`]: gradeValue
                });
              }
            }
          } catch (subjectError) {
            console.error(`Error processing subject ${subjectName} for student ${student_id}:`, subjectError);
            errors.push(`Failed to import ${subjectName} for student ${student_id}`);
          }
        }
        
        // Update quarterly averages for this student
        await updateStudentQuarterlyAverages(
          student_id,
          class_id,
          defaultSchoolYear
        );
        
        importedCount++;
        
      } catch (studentError) {
        console.error(`Error processing student ${studentData.student_id}:`, studentError);
        errorCount++;
        errors.push(`Failed to process student ${studentData.student_id}`);
      }
    }
    
    res.status(200).json({
      success: true,
      message: `Import completed. ${importedCount} students processed successfully.`,
      imported_count: importedCount,
      error_count: errorCount,
      errors: errors.length > 0 ? errors.slice(0, 10) : [], // Limit to first 10 errors
      skipped_subjects: Array.from(skippedSubjects.entries()).map(([name, count]) => ({ name, count }))
    });
    
  } catch (error) {
    console.error('Error importing grades from Excel:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to import grades from Excel',
      error: error.message
    });
  }
};