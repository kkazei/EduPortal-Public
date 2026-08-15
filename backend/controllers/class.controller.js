import Class from '../models/class.model.js';
import User from '../models/user.model.js';
import Subject from '../models/subject.model.js'; // Add this import
import { Grade, QuarterlyAverage } from '../models/subject.model.js'; // Add this import
import SchoolYear from '../models/schoolYear.model.js';
import Student from '../models/student.model.js';
import { Attendance, AttendanceSummary } from '../models/attendance.model.js';
import sequelize from '../db/dbConfig.js';

// Create a new class (teacher only)
export const createClass = async (req, res) => {
  try {
    const { userId } = req;
    
    // Check if user exists and is a teacher
    const teacher = await User.findByPk(userId);
    
    if (!teacher) {
      return res.status(404).json({ 
        success: false, 
        message: "Teacher not found" 
      });
    }
    
    if (teacher.user_role !== 'teacher') {
      return res.status(403).json({ 
        success: false, 
        message: "Only teachers can create classes" 
      });
    }
    
    const { grade_level, section, school_year } = req.body;
    
    // Resolve school year: use provided or default to active
    let resolvedYear = school_year;
    if (!resolvedYear) {
      resolvedYear = await SchoolYear.getActiveYearName();
    }

    // Validate required fields
    if (!grade_level || !section) {
      return res.status(400).json({
        success: false,
        message: "Please provide grade level and section"
      });
    }
    
    // Check if class with same grade, section and school year already exists
    const existingClass = await Class.findOne({
      where: { 
        grade_level,
        section,
        school_year: resolvedYear
      }
    });
    
    if (existingClass) {
      return res.status(400).json({
        success: false,
        message: "A class with this grade level and section already exists for the selected school year"
      });
    }
    
    // Create the class
    const newClass = await Class.create({
      grade_level,
      section,
      adviser_id: userId,
      adviser_name: teacher.user_fullname,
      school_year: resolvedYear,
      student_count: 0, // Initially no students
      is_active: true
    });

    // Auto-attach all subjects matching the grade level (active ones only)
    try {
      const gradeLevelSubjects = await Subject.findAll({
        where: { grade_level }
      });
      if (gradeLevelSubjects.length) {
        await newClass.addSubjects(gradeLevelSubjects);
      }
    } catch (attachErr) {
      console.error('Error auto-attaching subjects to new class:', attachErr.message);
    }

    // Return the class including attached subjects and adviser
    const newClassWithSubjects = await Class.findByPk(newClass.id, {
      include: [
        {
          model: Subject,
          as: 'subjects',
          through: { attributes: [] },
          include: [
            {
              model: User,
              as: 'teacher',
              attributes: ['id', 'user_fullname', 'user_email']
            }
          ]
        },
        {
          model: User,
          as: 'adviser',
          attributes: ['id', 'user_fullname', 'user_email']
        }
      ]
    });

    res.status(201).json({ 
      success: true, 
      message: "Class created successfully (subjects auto-attached)",
      data: newClassWithSubjects
    });
    
  } catch (error) {
    console.error("Error creating class:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to create class",
      error: error.message 
    });
  }
};

// Get all classes (for admin or specific teacher)
export const getAllClasses = async (req, res) => {
  try {
    const { userId } = req;
    const user = await User.findByPk(userId);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }
    
    let classes;
    const { school_year, all } = req.query;
    let where = {};
    if (school_year) {
      where.school_year = school_year;
    } else {
      const active = await SchoolYear.getActive();
      if (active?.name) where.school_year = active.name;
    }
    
    // If admin, return all classes; if teacher, return only their classes
    if (user.user_role === 'admin') {
      classes = await Class.findAll({
        where,
        order: [['created_at', 'DESC']]
      });
    } else if (user.user_role === 'teacher') {
      // When all=true, allow teachers to fetch all classes for selection (e.g., promotion target)
      const fetchAll = String(all).toLowerCase() === 'true';
      classes = await Class.findAll({
        where: fetchAll ? { ...where } : { ...where, adviser_id: userId },
        order: [['created_at', 'DESC']]
      });
    } else {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to view classes"
      });
    }
    
    res.status(200).json({
      success: true,
      data: classes
    });
    
  } catch (error) {
    console.error("Error fetching classes:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch classes",
      error: error.message
    });
  }
};

// Get a specific class by ID
export const getClassById = async (req, res) => {
  try {
    const { classId } = req.params;
    
    // Include the subjects relationship when fetching the class
    const classData = await Class.findByPk(classId, {
      include: [
        {
          model: Subject,
          as: 'subjects', // Make sure this matches your association alias in the model
          through: { attributes: [] }, // Don't include junction table fields
          include: [
            {
              model: User,
              as: 'teacher',
              attributes: ['id', 'user_fullname', 'user_email']
            }
          ]
        },
        {
          model: User,
          as: 'adviser',
          attributes: ['id', 'user_fullname', 'user_email']
        }
      ]
    });
    
    if (!classData) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }
    
    // Add console logging to debug
    console.log('Class data with subjects:', JSON.stringify(classData, null, 2));
    
    res.status(200).json({
      success: true,
      data: classData
    });
  } catch (error) {
    console.error('Error fetching class:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch class',
      error: error.message
    });
  }
};

// Update class details
export const updateClass = async (req, res) => {
  try {
    const { classId } = req.params;
    const { userId } = req;
    const { grade_level, section, school_year } = req.body;

    const classData = await Class.findByPk(classId);
    if (!classData) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.user_role !== 'admin' && classData.adviser_id !== userId) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to update this class"
      });
    }

    if (grade_level || section || school_year) {
      const checkDuplicate = await Class.findOne({
        where: {
          grade_level: grade_level || classData.grade_level,
          section: section || classData.section,
          school_year: school_year || classData.school_year
        }
      });
      if (checkDuplicate && checkDuplicate.id !== parseInt(classId)) {
        return res.status(400).json({
          success: false,
          message: 'A class with this grade level and section already exists for the selected school year'
        });
      }
    }

    await classData.update({
      grade_level: grade_level || classData.grade_level,
      section: section || classData.section,
      school_year: school_year || classData.school_year
    });

    return res.status(200).json({
      success: true,
      message: 'Class updated successfully',
      data: classData
    });
  } catch (error) {
    console.error('Error updating class:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update class',
      error: error.message
    });
  }
};

// Archive a class (admin or adviser)
export const archiveClass = async (req, res) => {
  try {
    const { classId } = req.params;
    const { userId } = req;

    const classData = await Class.findByPk(classId);
    if (!classData) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.user_role !== 'admin' && classData.adviser_id !== userId) {
      return res.status(403).json({ success: false, message: "You don't have permission to archive this class" });
    }

    await classData.update({ is_active: false, archived_at: new Date() });
    return res.status(200).json({ success: true, message: 'Class archived', data: classData });
  } catch (error) {
    console.error('Error archiving class:', error);
    return res.status(500).json({ success: false, message: 'Failed to archive class', error: error.message });
  }
};

// Restore a class from archive
export const restoreClass = async (req, res) => {
  try {
    const { classId } = req.params;
    const { userId } = req;

    const classData = await Class.findByPk(classId);
    if (!classData) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.user_role !== 'admin' && classData.adviser_id !== userId) {
      return res.status(403).json({ success: false, message: "You don't have permission to restore this class" });
    }

    if (classData.is_deleted) {
      return res.status(400).json({ success: false, message: 'Cannot restore a permanently deleted class' });
    }

    await classData.update({ is_active: true, archived_at: null });
    return res.status(200).json({ success: true, message: 'Class restored', data: classData });
  } catch (error) {
    console.error('Error restoring class:', error);
    return res.status(500).json({ success: false, message: 'Failed to restore class', error: error.message });
  }
};

// Permanently delete a class and all its related data (students, grades, attendance, etc.)
// The adviser (teacher) account is NOT deleted.
export const deleteClassPermanent = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { classId } = req.params;
    const { userId } = req;

    const classData = await Class.findByPk(classId, { transaction: t });
    if (!classData) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    const user = await User.findByPk(userId, { transaction: t });
    if (!user) { await t.rollback(); return res.status(404).json({ success: false, message: 'User not found' }); }
    if (user.user_role !== 'admin') {
      await t.rollback();
      return res.status(403).json({ success: false, message: 'Only admins can permanently delete classes' });
    }

    // Collect all students in this class so we can delete their user accounts
    const students = await Student.findAll({
      where: { class_id: classId },
      attributes: ['id', 'user_id'],
      transaction: t
    });
    const studentIds = students.map(s => s.id);
    const userIds = students.map(s => s.user_id).filter(Boolean);

    // Delete grades tied to this class
    await Grade.destroy({ where: { class_id: classId }, transaction: t });

    // Delete quarterly averages tied to this class
    await QuarterlyAverage.destroy({ where: { class_id: classId }, transaction: t });

    // Delete attendance records tied to this class
    await Attendance.destroy({ where: { class_id: classId }, transaction: t });

    // Delete attendance summaries tied to this class
    await AttendanceSummary.destroy({ where: { class_id: classId }, transaction: t });

    // Delete all students in this class (this triggers beforeDestroy hooks per student model)
    if (studentIds.length > 0) {
      await Student.destroy({ where: { class_id: classId }, transaction: t });
    }

    // Delete the user accounts that belonged to those students
    if (userIds.length > 0) {
      await User.destroy({ where: { id: userIds }, transaction: t });
    }

    // Remove class-subject associations (junction table)
    await classData.setSubjects([], { transaction: t });

    // Hard-delete the class record itself
    await classData.destroy({ transaction: t });

    await t.commit();
    return res.status(200).json({ success: true, message: 'Class and all related data permanently deleted' });
  } catch (error) {
    await t.rollback();
    console.error('Error permanently deleting class:', error);
    return res.status(500).json({ success: false, message: 'Failed to permanently delete class', error: error.message });
  }
};


// Add subject to class
export const addSubjectToClass = async (req, res) => {
  try {
    const { classId } = req.params;
    const { subject_id } = req.body;
    const { userId } = req;
    
    if (!subject_id) {
      return res.status(400).json({
        success: false,
        message: 'Subject ID is required'
      });
    }

    // Find the class
    const classObj = await Class.findByPk(classId);
    if (!classObj) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    // Permission: allow admin or the adviser teacher
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (user.user_role !== 'admin' && classObj.adviser_id !== userId) {
      return res.status(403).json({ success: false, message: "You don't have permission to modify this class" });
    }
    
    // Find the subject
    const subject = await Subject.findByPk(subject_id);
    if (!subject) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found'
      });
    }
    
    // Check if subject grade level matches class grade level
    if (subject.grade_level !== classObj.grade_level) {
      return res.status(400).json({
        success: false,
        message: `This subject is for ${subject.grade_level} and cannot be added to ${classObj.grade_level}`
      });
    }
    
    // Check if subject is already assigned to the class
    const existingAssignment = await classObj.hasSubject(subject);
    if (existingAssignment) {
      return res.status(400).json({
        success: false,
        message: 'Subject is already assigned to this class'
      });
    }
    
    // Add subject to class
    await classObj.addSubject(subject);
    
    console.log(`Subject ${subject_id} added to class ${classId}`);
    
    // Get updated class with subjects
    const updatedClass = await Class.findByPk(classId, {
      include: [
        {
          model: Subject,
          as: 'subjects',
          through: { attributes: [] },
          include: [
            {
              model: User,
              as: 'teacher',
              attributes: ['id', 'user_fullname', 'user_email']
            }
          ]
        },
        {
          model: User,
          as: 'adviser',
          attributes: ['id', 'user_fullname', 'user_email']
        }
      ]
    });
    
    // Debug log the updated class data
    console.log('Updated class subjects:', updatedClass.subjects.length);
    
    res.status(200).json({
      success: true,
      message: 'Subject added to class successfully',
      data: updatedClass
    });
  } catch (error) {
    console.error('Error adding subject to class:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to add subject to class',
      error: error.message
    });
  }
};

// Remove subject from class
export const removeSubjectFromClass = async (req, res) => {
  try {
    const { classId, subjectId } = req.params;
    const { userId } = req;
    
    // Find the class
    const classObj = await Class.findByPk(classId);
    if (!classObj) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }
    
    // Check if user has permission to modify this class
    const user = await User.findByPk(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }
    
    // Allow access if admin or if teacher is the adviser
    if (user.user_role !== 'admin' && classObj.adviser_id !== userId) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to modify this class"
      });
    }
    
    // Find the subject
    const subject = await Subject.findByPk(subjectId);
    if (!subject) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found'
      });
    }
    
    // Check if subject is assigned to the class
    const existingAssignment = await classObj.hasSubject(subject);
    if (!existingAssignment) {
      return res.status(400).json({
        success: false,
        message: 'Subject is not assigned to this class'
      });
    }
    
    // Check if any students have grades for this subject in this class
    const existingGrades = await Grade.findOne({
      where: {
        subject_id: subjectId,
        class_id: classId
      }
    });
    
    if (existingGrades) {
      return res.status(400).json({
        success: false,
        message: 'Cannot remove subject as students have grades recorded for it'
      });
    }
    
    // Remove subject from class
    await classObj.removeSubject(subject);
    
    // Get updated class with subjects
    const updatedClass = await Class.findByPk(classId, {
      include: [
        {
          model: Subject,
          as: 'subjects',
          through: { attributes: [] },
          include: [
            {
              model: User,
              as: 'teacher',
              attributes: ['id', 'user_fullname', 'user_email']
            }
          ]
        },
        {
          model: User,
          as: 'adviser',
          attributes: ['id', 'user_fullname', 'user_email']
        }
      ]
    });
    
    res.status(200).json({
      success: true,
      message: 'Subject removed from class successfully',
      data: updatedClass
    });
  } catch (error) {
    console.error('Error removing subject from class:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to remove subject from class',
      error: error.message
    });
  }
};

// Get all subjects for a specific class
export const getClassSubjects = async (req, res) => {
  try {
    const { classId } = req.params;
    const { userId } = req;
    
    // Find the class
    const classObj = await Class.findByPk(classId);
    if (!classObj) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }
    
    // Check if user has permission to view this class
    const user = await User.findByPk(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }
    
    // Students can only view their own class subjects
    if (user.user_role === 'student') {
      // You might need to check if the student belongs to this class
      // This depends on how your student model is structured
      // Here's a placeholder check:
      /*
      const student = await Student.findOne({
        where: { user_id: userId, class_id: classId }
      });
      
      if (!student) {
        return res.status(403).json({
          success: false,
          message: "You don't have permission to view this class's subjects"
        });
      }
      */
    }
    
    // Get class with subjects
    const classWithSubjects = await Class.findByPk(classId, {
      include: [
        {
          model: Subject,
          as: 'subjects',
          through: { attributes: [] },
          include: [
            {
              model: User,
              as: 'teacher',
              attributes: ['id', 'user_fullname', 'user_email']
            }
          ]
        }
      ]
    });
    
    if (!classWithSubjects) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }
    
    res.status(200).json({
      success: true,
      count: classWithSubjects.subjects.length,
      data: classWithSubjects.subjects
    });
    
  } catch (error) {
    console.error('Error fetching class subjects:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch class subjects',
      error: error.message
    });
  }
};

export default {
  createClass,
  getAllClasses,
  getClassById,
  updateClass,
  addSubjectToClass,
  removeSubjectFromClass,
  getClassSubjects,
  archiveClass,
  restoreClass,
  deleteClassPermanent
};