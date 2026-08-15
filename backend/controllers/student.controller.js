import Student from '../models/student.model.js';
import Class from '../models/class.model.js';
import User from '../models/user.model.js';
import { Grade, QuarterlyAverage } from '../models/subject.model.js'; // Import the Grade model if you have it
import { Attendance, AttendanceSummary, updateAttendanceSummary } from '../models/attendance.model.js';
import { Op } from 'sequelize';
import SchoolYear from '../models/schoolYear.model.js';
import sequelize from '../db/dbConfig.js'; // Add this import for transaction support
import bcrypt from 'bcryptjs';

// Helper: recompute and persist the accurate student_count for a class
const syncClassStudentCount = async (classId, transaction = null) => {
  if (!classId) return;
  const activeCount = await Student.count({
    where: { class_id: classId, is_deleted: false, status: 'Active' },
    transaction,
  });
  await Class.update(
    { student_count: activeCount },
    { where: { id: classId }, transaction }
  );
};

// Create a new student
export const createStudent = async (req, res) => {
    try {
      const { 
        lrn, first_name, middle_name, last_name, 
        age, sex, birthdate, address, contact_number, 
        email, class_id 
      } = req.body;
  
      // Basic validation
      if (!lrn || !first_name || !last_name || !age || !sex || !birthdate) {
        return res.status(400).json({
          success: false,
          message: "Required fields missing: LRN, first name, last name, age, sex, and birthdate are required"
        });
      }
  
      // Validate LRN format (12 digits)
      if (!/^\d{12}$/.test(lrn)) {
        return res.status(400).json({
          success: false,
          message: "LRN must be exactly 12 digits"
        });
      }
  
      // Check if student with this LRN already exists
      const existingStudent = await Student.findOne({ where: { lrn } });
      if (existingStudent) {
        return res.status(400).json({
          success: false,
          message: "A student with this LRN already exists"
        });
      }
  
      // If class_id is provided, check if the class exists
      if (class_id) {
        const classExists = await Class.findByPk(class_id);
        if (!classExists) {
          return res.status(400).json({
            success: false,
            message: "The specified class does not exist"
          });
        }
      }
  
      // Clean up and validate email
      let validatedEmail = null;
      if (email && email.trim() !== '') {
        // Check if it's a valid email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          return res.status(400).json({
            success: false,
            message: "Invalid email format"
          });
        }
        validatedEmail = email.trim();
    } else {
        // Generate a default email using the LRN
        validatedEmail = `${lrn}@gmail.com`;
      }
  
      // Create student - User account is auto-created via hooks
      const newStudent = await Student.create({
        lrn,
        first_name,
        middle_name,
        last_name,
        age,
        sex,
        birthdate,
        address,
        contact_number,
        email: validatedEmail, // Use the validated email or null
        class_id,
        status: 'Active',
      });
  
      // Ensure the class student_count is accurate
      if (class_id) {
        await syncClassStudentCount(class_id);
      }

      res.status(201).json({
        success: true,
        message: "Student created successfully",
        data: newStudent
      });
  
    } catch (error) {
      console.error("Error creating student:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create student",
        error: error.message
      });
    }
  };

// Get all students with optional filtering
export const getAllStudents = async (req, res) => {
  try {
    const { 
      search, class_id, grade_level, section, 
      status, sort_by, sort_order, page, limit, 
      all // Add a new parameter to fetch all records
    } = req.query;

    // Build the query conditions
  let whereCondition = {};
  let classWhereCondition = {};
    
    // Search by name or LRN
    if (search) {
      whereCondition[Op.or] = [
        { lrn: { [Op.like]: `%${search}%` } },
        { first_name: { [Op.like]: `%${search}%` } },
        { last_name: { [Op.like]: `%${search}%` } }
      ];
    }

    // Filter by class ID
    if (class_id) {
      whereCondition.class_id = class_id;
    }

    // Filter by grade level and section through class association
    if (grade_level) {
      classWhereCondition.grade_level = grade_level;
    }

    if (section) {
      classWhereCondition.section = section;
    }

    // Filter by status
    if (status && ['Active', 'Inactive', 'Transferred', 'Graduated'].includes(status)) {
      whereCondition.status = status;
    }

    // Don't show deleted students
    whereCondition.is_deleted = false;

    // Set up pagination (only if 'all' is not true)
    const fetchAll = all === 'true';
    const pageNumber = parseInt(page) || 1;
    const pageSize = fetchAll ? null : (parseInt(limit) || 10);
    const offset = fetchAll ? null : (pageNumber - 1) * pageSize;

    // Set up sorting
    const order = [];
    const validSortFields = ['first_name', 'last_name', 'age', 'created_at'];
    if (sort_by && validSortFields.includes(sort_by)) {
      const direction = sort_order?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
      order.push([sort_by, direction]);
    } else {
      // Default sorting
      order.push(['last_name', 'ASC']);
    }

    // If caller specified a school_year, filter by it; otherwise default to active year
    if (req.query.school_year) {
      classWhereCondition.school_year = req.query.school_year;
    } else {
      const active = await SchoolYear.getActive();
      if (active?.name) classWhereCondition.school_year = active.name;
    }

    // Prepare the query options
    const queryOptions = {
      where: whereCondition,
      include: [
        {
          model: Class,
          as: 'class',
          where: Object.keys(classWhereCondition).length > 0 ? classWhereCondition : undefined,
          attributes: ['id', 'grade_level', 'section', 'adviser_name']
        }
      ],
      order,
      distinct: true // Important for accurate count when using includes
    };

    // Add pagination if not fetching all
    if (!fetchAll) {
      queryOptions.limit = pageSize;
      queryOptions.offset = offset;
    }

    // Fetch students with class information
    const { count, rows: students } = await Student.findAndCountAll(queryOptions);

    // Calculate total pages (only relevant if paginating)
    const totalPages = fetchAll ? 1 : Math.ceil(count / pageSize);

    res.status(200).json({
      success: true,
      data: students,
      meta: {
        page: fetchAll ? 1 : pageNumber,
        limit: fetchAll ? count : pageSize,
        total_records: count,
        total_pages: totalPages,
        all_records: fetchAll
      }
    });

  } catch (error) {
    console.error("Error fetching students:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch students",
      error: error.message
    });
  }
};

// Get a student by ID
export const getStudentById = async (req, res) => {
  try {
    const { id } = req.params;

    const student = await Student.findOne({
      where: { 
        id,
        is_deleted: false
      },
      include: [
        {
          model: Class,
          as: 'class',
          attributes: ['id', 'grade_level', 'section', 'adviser_name', 'school_year']
        }
      ]
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }

    res.status(200).json({
      success: true,
      data: student
    });

  } catch (error) {
    console.error("Error fetching student:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch student details",
      error: error.message
    });
  }
};

// Get a student by LRN
export const getStudentByLRN = async (req, res) => {
  try {
    const { lrn } = req.params;

    const student = await Student.findOne({
      where: { 
        lrn,
        is_deleted: false
      },
      include: [
        {
          model: Class,
          as: 'class',
          attributes: ['id', 'grade_level', 'section', 'adviser_name', 'school_year']
        }
      ]
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }

    res.status(200).json({
      success: true,
      data: student
    });

  } catch (error) {
    console.error("Error fetching student by LRN:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch student details",
      error: error.message
    });
  }
};

// Update a student
export const updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      first_name, middle_name, last_name, age, 
      sex, birthdate, address, contact_number, email, 
      class_id, status 
    } = req.body;

    // Find the student
    const student = await Student.findByPk(id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }

    if (student.is_deleted) {
      return res.status(400).json({
        success: false,
        message: "Cannot update a deleted student"
      });
    }

    // If class_id is provided, check if the class exists
    if (class_id && class_id !== student.class_id) {
      const classExists = await Class.findByPk(class_id);
      if (!classExists) {
        return res.status(400).json({
          success: false,
          message: "The specified class does not exist"
        });
      }
    }

    // Update student
    await student.update({
      first_name: first_name || student.first_name,
      middle_name: middle_name !== undefined ? middle_name : student.middle_name,
      last_name: last_name || student.last_name,
      age: age || student.age,
      sex: sex || student.sex,
      birthdate: birthdate || student.birthdate,
      address: address !== undefined ? address : student.address,
      contact_number: contact_number !== undefined ? contact_number : student.contact_number,
      email: email !== undefined ? email : student.email,
      class_id: class_id !== undefined ? class_id : student.class_id,
      status: status || student.status
    });

    res.status(200).json({
      success: true,
      message: "Student updated successfully",
      data: student
    });

  } catch (error) {
    console.error("Error updating student:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update student",
      error: error.message
    });
  }
};

// Permanently delete a student
export const permanentlyDeleteStudent = async (req, res) => {
  // Start a transaction to ensure data integrity
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    console.log(`Attempting to permanently delete student with ID: ${id}`);

    // Find the student with paranoid: false to include soft-deleted records
    const student = await Student.findByPk(id, { 
      paranoid: false,
      transaction
    });

    if (!student) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Student not found in archive"
      });
    }

    // Get user ID to delete later
    const userId = student.user_id;
    console.log(`Found student with ID ${id}, user_id: ${userId}`);
    
    // Delete related records first - use Models directly from sequelize
    try {
      // Delete attendance summaries FIRST - this is causing the constraint error
      if (AttendanceSummary) {
        console.log(`Deleting attendance summaries for student ${id}`);
        await AttendanceSummary.destroy({
          where: { student_id: id },
          force: true,
          transaction
        });
      }
      
      // Delete regular attendance records
      if (Attendance) {
        console.log(`Deleting attendance records for student ${id}`);
        await Attendance.destroy({
          where: { student_id: id },
          force: true,
          transaction
        });
      }
      
      // Delete grades
      if (Grade) {
        console.log(`Deleting grades for student ${id}`);
        await Grade.destroy({
          where: { student_id: id },
          force: true,
          transaction
        });
      }
      
      // Delete quarterly averages 
      if (QuarterlyAverage) {
        console.log(`Deleting quarterly averages for student ${id}`);
        await QuarterlyAverage.destroy({
          where: { student_id: id },
          force: true,
          transaction
        });
      }
      
    } catch (relatedError) {
      console.error("Error deleting related records:", relatedError);
      await transaction.rollback();
      throw relatedError;
    }

    // Capture class before deletion for count sync
    const prevClassId = student.class_id;

    // Finally, delete the student record
    console.log(`Permanently deleting student with ID ${id}`);
    await student.destroy({ 
      force: true,
      transaction 
    });

    // Delete the associated user account if it exists
    if (userId) {
      console.log(`Deleting associated user account with ID ${userId}`);
      await User.destroy({
        where: { id: userId },
        force: true,
        transaction
      });
    }

    // If all operations were successful, commit the transaction
    await transaction.commit();
    console.log(`Successfully deleted student with ID ${id} and all related records`);
    // Sync class student count after commit (outside transaction for safety)
    if (prevClassId) {
      await syncClassStudentCount(prevClassId);
    }
    
    res.status(200).json({
      success: true,
      message: "Student permanently deleted successfully"
    });

  } catch (error) {
    // If any error occurs, rollback the transaction
    await transaction.rollback();
    console.error("Error permanently deleting student:", error);
    res.status(500).json({
      success: false,
      message: "Failed to permanently delete student",
      error: error.message,
      details: error.parent ? error.parent.sqlMessage : null
    });
  }
};

// Soft delete a student
export const deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;

    const student = await Student.findByPk(id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }
    
    // Store class_id before updating
    const classId = student.class_id;

    // Soft delete by setting is_deleted to true
    student.is_deleted = true;
    await student.save();

    // Recompute class student count for accuracy
    if (classId) {
      await syncClassStudentCount(classId);
    }

    res.status(200).json({
      success: true,
      message: "Student deleted successfully"
    });

  } catch (error) {
    console.error("Error deleting student:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete student",
      error: error.message
    });
  }
};

// Restore a soft-deleted student
export const restoreStudent = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find the student with paranoid: false to include soft-deleted records
    const student = await Student.findByPk(id, { paranoid: false });
    
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found in archive"
      });
    }
    
    // Check if student is already active
    if (!student.is_deleted) {
      return res.status(400).json({
        success: false,
        message: "Student is not deleted"
      });
    }
    
    // Restore student by setting is_deleted to false
    student.is_deleted = false;
    await student.save();
    
    // Recompute class student count for accuracy
    if (student.class_id) {
      await syncClassStudentCount(student.class_id);
    }
    
    res.status(200).json({
      success: true,
      message: "Student restored successfully",
      data: student
    });
    
  } catch (error) {
    console.error("Error restoring student:", error);
    res.status(500).json({
      success: false,
      message: "Failed to restore student",
      error: error.message
    });
  }
};

// Get students by class ID
export const getStudentsByClass = async (req, res) => {
  try {
    const { classId } = req.params;
    
    // Check if class exists
    const classExists = await Class.findByPk(classId);
    if (!classExists) {
      return res.status(404).json({
        success: false,
        message: "Class not found"
      });
    }

    // Get students in this class
    const students = await Student.findAll({
      where: {
        class_id: classId,
        is_deleted: false
      },
      order: [['last_name', 'ASC']]
    });

    res.status(200).json({
      success: true,
      data: students,
      meta: {
        class_name: `${classExists.grade_level} - ${classExists.section}`,
        total_students: students.length
      }
    });

  } catch (error) {
    console.error("Error fetching students by class:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch students",
      error: error.message
    });
  }
};

// Update this function to match your Class model's actual field names

export const getDeletedStudents = async (req, res) => {
    try {
      // First, let's check the structure of your Class model
      console.log("Class model attributes:", Object.keys(Class.rawAttributes));
      
      // Find students with is_deleted = true
      const deletedStudents = await Student.findAll({
        where: { is_deleted: true },
        include: [
          {
            model: Class,
            as: 'class',
            // Only include fields that actually exist in your Class model
            // Adjust these field names based on your actual database schema
            attributes: ['id', 'grade_level', 'section']
          }
        ],
        order: [['updated_at', 'DESC']]
      });
  
      res.status(200).json({
        success: true,
        count: deletedStudents.length,
        data: deletedStudents
      });
    } catch (error) {
      console.error("Error fetching deleted students:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch deleted students",
        error: error.message
      });
    }
  };

 // Get a student by user ID
export const getStudentByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    // Find the student with the matching user_id
    const student = await Student.findOne({
      where: { 
        user_id: userId,
        is_deleted: false
      },
      include: [
        {
          model: Class,
          as: 'class',
          attributes: ['id', 'grade_level', 'section', 'school_year'],
          include: [
            {
              model: User,
              as: 'adviser',
              attributes: ['id', 'user_fullname', 'user_email']
            }
          ]
        }
      ]
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found for this user"
      });
    }

    res.status(200).json({
      success: true,
      data: student
    });

  } catch (error) {
    console.error("Error fetching student by user ID:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch student details",
      error: error.message
    });
  }
};

// Update the bulkCreateStudents function to ensure proper student creation
export const bulkCreateStudents = async (req, res) => {
  try {
    const students = req.body;
    
    if (!Array.isArray(students)) {
      return res.status(400).json({ message: 'Invalid data format. Expected an array of students.' });
    }
    
    if (students.length === 0) {
      return res.status(400).json({ message: 'No students provided for import' });
    }
    
    // Initialize results
    const results = {
      created: [],
      errors: []
    };
    
    // Track classes we touched to sync counts once at the end
    const touchedClassIds = new Set();

    // Process each student
    for (const studentData of students) {
      try {
        // Check if student with this LRN already exists
        const existingStudent = await Student.findOne({ where: { lrn: studentData.lrn } });
        if (existingStudent) {
          results.errors.push({
            data: studentData,
            error: `Student with LRN ${studentData.lrn} already exists`
          });
          continue; // Skip to next student
        }
        
        // Generate a consistent email using gmail domain
        const uniqueEmail = `${studentData.lrn}@gmail.com`;
        
        // Create the student with the generated email
        const student = await Student.create({
          ...studentData,
          email: uniqueEmail,
          status: 'Active'
        });
        if (student.class_id) touchedClassIds.add(student.class_id);
        
        // Fetch the created user to include in the results
        const user = await User.findByPk(student.user_id);
        
        const fullName = `${studentData.first_name} ${studentData.middle_name ? studentData.middle_name + ' ' : ''}${studentData.last_name}`;
        
        results.created.push({
          id: student.id,
          lrn: student.lrn,
          name: fullName,
          email: uniqueEmail,
          user_id: student.user_id
        });
      } catch (error) {
        console.error(`Error creating student:`, error);
        results.errors.push({
          data: studentData,
          error: error.message
        });
      }
    }
    
    console.log(`Created ${results.created.length} students, ${results.errors.length} errors`);
    // Sync counts for all affected classes
    for (const cid of touchedClassIds) {
      await syncClassStudentCount(cid);
    }
    
    return res.status(201).json({
      message: `Successfully imported ${results.created.length} students with ${results.errors.length} errors`,
      results
    });
  } catch (error) {
    console.error('Error in bulk student import:', error);
    return res.status(500).json({
      message: 'Failed to import students',
      error: error.message
    });
  }
};

export const getClassStudents = async (req, res) => {
  try {
    const { classId } = req.params;
    
    // Check if class exists
    const classExists = await Class.findByPk(classId);
    if (!classExists) {
      return res.status(404).json({
        success: false,
        message: "Class not found"
      });
    }

    // Get students in this class with full details
    const students = await Student.findAll({
      where: {
        class_id: classId,
        is_deleted: false,
        status: 'Active' // Only get active students
      },
      include: [
        {
          model: Class,
          as: 'class',
          attributes: ['id', 'grade_level', 'section', 'adviser_name']
        }
      ],
      order: [
        ['sex', 'ASC'], // Male first (assuming 'Male' comes before 'Female' alphabetically)
        ['last_name', 'ASC'],
        ['first_name', 'ASC']
      ]
    });

    res.status(200).json({
      success: true,
      data: students,
      meta: {
        class_name: `${classExists.grade_level} - ${classExists.section}`,
        total_students: students.length
      }
    });

  } catch (error) {
    console.error("Error fetching class students:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch class students",
      error: error.message
    });
  }
};

// Add this new method
export const resetStudentPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const requestingUser = req.user;

    // Only allow admins to reset passwords
    if (requestingUser.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only administrators can reset student passwords.'
      });
    }

    // Find the student
    const student = await Student.findOne({
      where: { 
        id: id,
        is_deleted: false 
      }
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Find the associated user account
    const user = await User.findByPk(student.user_id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Student user account not found'
      });
    }

    // Reset password to LRN
    const newPassword = student.lrn;
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update user password and set first login flag
    await user.update({
      password: hashedPassword,
      is_first_login: true // Force password change on next login
    });

    // Log the password reset action
    console.log(`Admin ${requestingUser.user_fullname} (ID: ${requestingUser.id}) reset password for student ${student.first_name} ${student.last_name} (ID: ${student.id})`);

    res.status(200).json({
      success: true,
      message: `Password reset successfully. New password is: ${newPassword}`,
      data: {
        student_id: student.id,
        student_name: `${student.first_name} ${student.last_name}`,
        new_password: newPassword
      }
    });

  } catch (error) {
    console.error('Error resetting student password:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset student password',
      error: error.message
    });
  }
};

// Require email-only setup on next login (admin only)
export const requireStudentEmailSetup = async (req, res) => {
  try {
    const { id } = req.params;
    const requestingUser = req.user;

    if (requestingUser.role !== 'admin' && requestingUser.role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Only admin or superadmin can require email setup' });
    }

    const student = await Student.findOne({ where: { id, is_deleted: false } });
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const user = await User.findByPk(student.user_id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Student user account not found' });
    }

    const expiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    await user.update({
      // Do not change password
      is_first_login: false, // ensure password-change flow is not triggered
      // Clear any previous email verification state
      pending_email: null,
      email_verification_code: null,
      email_verification_expires: null,
      // Mark account to require email-only setup on next login
      resetPasswordToken: 'REQUIRE_EMAIL_ONLY',
      resetPasswordExpiry: expiry,
      is_email_verified: false,
    });

    return res.status(200).json({
      success: true,
      message: 'Student will be required to set and verify an email on next login',
      data: { student_id: student.id, user_id: user.id }
    });
  } catch (error) {
    console.error('Error requiring email setup:', error);
    return res.status(500).json({ success: false, message: 'Failed to require email setup', error: error.message });
  }
};

export default {
  createStudent,
  getAllStudents,
  getStudentById,
  getStudentByLRN,
  getStudentByUserId, // Add this line
  getClassStudents, // Add this line
  updateStudent,
  deleteStudent,
  restoreStudent,
  getStudentsByClass,
  permanentlyDeleteStudent,
  bulkCreateStudents, // Add this line
  resetStudentPassword, // Add this line
  requireStudentEmailSetup,
};

// Promote a set of students from a source class to a target class (next school year)
export const promoteStudents = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { source_class_id, target_class_id, student_ids } = req.body;

    if (!Array.isArray(student_ids) || student_ids.length === 0) {
      return res.status(400).json({ success: false, message: 'No students selected for promotion' });
    }
    if (!source_class_id || !target_class_id) {
      return res.status(400).json({ success: false, message: 'Source and target classes are required' });
    }

    // Validate classes
    const [sourceClass, targetClass] = await Promise.all([
      Class.findByPk(source_class_id),
      Class.findByPk(target_class_id),
    ]);

    if (!sourceClass) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Source class not found' });
    }
    if (!targetClass) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Target class not found' });
    }

    // Authorization: if teacher, must be adviser of the source class
    if (req.user?.role === 'teacher' && sourceClass.adviser_id !== req.userId) {
      await t.rollback();
      return res.status(403).json({ success: false, message: "You don't advise this class" });
    }

    // Perform a single bulk update to avoid per-row locks and hooks
    const [affected] = await Student.update(
      { class_id: target_class_id },
      {
        where: { id: student_ids, class_id: source_class_id, is_deleted: false },
        transaction: t,
        hooks: false, // prevent afterUpdate hooks from incrementing/decrementing per row
      }
    );

    if (!affected || affected === 0) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'No eligible students found in the source class' });
    }

    // Adjust class student counts atomically within the same transaction
    await Class.increment('student_count', { by: affected, where: { id: target_class_id }, transaction: t });
    await Class.decrement('student_count', { by: affected, where: { id: source_class_id }, transaction: t });

    await t.commit();
    // Safety: recompute counts for both classes to avoid drift
    await Promise.all([
      syncClassStudentCount(source_class_id),
      syncClassStudentCount(target_class_id),
    ]);
    return res.status(200).json({
      success: true,
      message: `Promoted ${affected} student(s) to ${targetClass.grade_level} - ${targetClass.section} (${targetClass.school_year})`,
      data: { updated: affected, source_class_id, target_class_id }
    });
  } catch (error) {
    await t.rollback();
    console.error('Error promoting students:', error);
    return res.status(500).json({ success: false, message: 'Failed to promote students', error: error.message });
  }
};