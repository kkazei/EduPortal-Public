import User from '../models/user.model.js';
import Class from '../models/class.model.js';
import Student from '../models/student.model.js';
import Subject, { Grade } from '../models/subject.model.js';
import SchoolYear from '../models/schoolYear.model.js';
import { sendAccountActivationEmail } from '../nodemailer/emails.js';
import { Op, Sequelize } from 'sequelize';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// Create a teacher account (admin only)
export const createTeacherAccount = async (req, res) => {
  try {
    // Check if the requesting user is an admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only administrators can create teacher accounts.'
      });
    }
    
    const { user_email, user_fullname, password, teacher_title } = req.body;
    
    // Basic validation
    if (!user_email || !user_fullname || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email, full name and password are required'
      });
    }
    
    // Validate teacher title if provided
    const validTitles = [
      'Teacher I',
      'Teacher II',
      'Teacher III',
      'Master Teacher I',
      'Master Teacher II',
      'Master Teacher III',
      'Master Teacher IV'
    ];
    
    if (teacher_title && !validTitles.includes(teacher_title)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid teacher title. Please select a valid title.',
        validTitles: validTitles
      });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ where: { user_email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists'
      });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create teacher account
    const newTeacher = await User.create({
      user_email,
      user_fullname,
      password: hashedPassword,
      user_role: 'teacher',
      teacher_title: teacher_title || 'Teacher I'
    });
    
    // Return success without the password
    res.status(201).json({
      success: true,
      message: 'Teacher account created successfully',
      data: {
        id: newTeacher.id,
        user_email: newTeacher.user_email,
        user_fullname: newTeacher.user_fullname,
        user_role: newTeacher.user_role,
        teacher_title: newTeacher.teacher_title,
        createdAt: newTeacher.createdAt
      }
    });
    
  } catch (error) {
    console.error('Error creating teacher account:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create teacher account',
      error: error.message
    });
  }
};

// Get all teachers
export const getAllTeachers = async (req, res) => {
  try {
    // Check if the requesting user is an admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only administrators can view all teacher accounts.'
      });
    }
    
    const teachers = await User.findAll({
      where: { user_role: 'teacher' },
      attributes: ['id', 'user_email', 'user_fullname', 'teacher_title', 'createdAt', 'updatedAt'],
      order: [['user_fullname', 'ASC']]
    });
    
    res.status(200).json({
      success: true,
      count: teachers.length,
      data: teachers
    });
    
  } catch (error) {
    console.error('Error fetching teachers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch teacher accounts',
      error: error.message
    });
  }
};

// Update teacher account (admin only)
export const updateTeacher = async (req, res) => {
  try {
    // Check if the requesting user is an admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only administrators can update teacher accounts.'
      });
    }
    
    const { id } = req.params;
    const { user_fullname, user_email, teacher_title, password } = req.body;
    
    // Find the teacher
    const teacher = await User.findOne({
      where: { 
        id,
        user_role: 'teacher'
      }
    });
    
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }
    
    // Validate teacher title if provided
    const validTitles = [
      'Teacher I',
      'Teacher II',
      'Teacher III',
      'Master Teacher I',
      'Master Teacher II',
      'Master Teacher III',
      'Master Teacher IV'
    ];
    
    if (teacher_title && !validTitles.includes(teacher_title)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid teacher title. Please select a valid title.',
        validTitles: validTitles
      });
    }
    
    // Check if email is being changed and if it already exists
    if (user_email && user_email !== teacher.user_email) {
      const existingUser = await User.findOne({ 
        where: { 
          user_email,
          id: { [Op.ne]: id }
        }
      });
      
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'An account with this email already exists'
        });
      }
    }
    
    // Prepare update object
    const updateData = {};
    if (user_fullname) updateData.user_fullname = user_fullname;
    if (user_email) updateData.user_email = user_email;
    if (teacher_title) updateData.teacher_title = teacher_title;
    
    // Hash new password if provided
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }
    
    // Update teacher account
    await teacher.update(updateData);
    
    // If teacher name or title changed, update associated classes
    if (user_fullname || teacher_title) {
      await Class.update(
        { 
          adviser_name: user_fullname || teacher.user_fullname,
          adviser_title: teacher_title || teacher.teacher_title
        },
        { 
          where: { adviser_id: teacher.id }
        }
      );
    }
    
    // Return updated teacher info (without password)
    const updatedTeacher = await User.findByPk(id, {
      attributes: ['id', 'user_email', 'user_fullname', 'teacher_title', 'user_role', 'createdAt', 'updatedAt']
    });
    
    res.status(200).json({
      success: true,
      message: 'Teacher account updated successfully',
      data: updatedTeacher
    });
    
  } catch (error) {
    console.error('Error updating teacher account:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update teacher account',
      error: error.message
    });
  }
};

// Delete a teacher account
export const deleteTeacher = async (req, res) => {
  try {
    // Check if the requesting user is an admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only administrators can delete teacher accounts.'
      });
    }
    
    const { id } = req.params;
    
    // Find the teacher
    const teacher = await User.findOne({
      where: { 
        id,
        user_role: 'teacher'
      }
    });
    
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }
    
    // Check if teacher is assigned to any classes
    const assignedClasses = await Class.findAll({
      where: { adviser_id: id }
    });
    
    if (assignedClasses.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete teacher. Teacher is currently assigned to one or more classes. Please reassign or remove the teacher from all classes first.',
        assignedClasses: assignedClasses.map(cls => ({
          id: cls.id,
          grade_level: cls.grade_level,
          section: cls.section,
          school_year: cls.school_year
        }))
      });
    }
    
    // Delete the teacher account
    await teacher.destroy();
    
    res.status(200).json({
      success: true,
      message: 'Teacher account deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting teacher account:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete teacher account',
      error: error.message
    });
  }
};

// Get valid teacher titles
export const getValidTeacherTitles = async (req, res) => {
  try {
    const validTitles = [
      'Teacher I',
      'Teacher II',
      'Teacher III',
      'Master Teacher I',
      'Master Teacher II',
      'Master Teacher III',
      'Master Teacher IV'
    ];
    
    res.status(200).json({
      success: true,
      data: validTitles
    });
    
  } catch (error) {
    console.error('Error fetching teacher titles:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch teacher titles',
      error: error.message
    });
  }
};

// Create a class (admin only)
export const createClass = async (req, res) => {
  try {
    // Check if the requesting user is an admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only administrators can create classes.'
      });
    }
    
    const { grade_level, section, school_year, teacher_id } = req.body;
    
    // Validate required fields
    if (!grade_level || !section || !school_year) {
      return res.status(400).json({
        success: false,
        message: "Please provide grade level, section, and school year"
      });
    }
    
    // Check if class with same grade, section and school year already exists
    const existingClass = await Class.findOne({
      where: { 
        grade_level,
        section,
        school_year
      }
    });
    
    if (existingClass) {
      return res.status(400).json({
        success: false,
        message: "A class with this grade level and section already exists for the selected school year"
      });
    }
    
    // If teacher_id is provided, verify that the teacher exists
    let teacher = null;
    if (teacher_id) {
      teacher = await User.findOne({
        where: { 
          id: teacher_id,
          user_role: 'teacher'
        }
      });
      
      if (!teacher) {
        return res.status(404).json({
          success: false,
          message: "Teacher not found"
        });
      }
    }
    
    // Create the class
    const newClass = await Class.create({
      grade_level,
      section,
      adviser_id: teacher ? teacher.id : null,
      adviser_name: teacher ? teacher.user_fullname : null,
      adviser_title: teacher ? teacher.teacher_title : null,
      school_year,
      student_count: 0, // Initially no students
      is_active: true
    });
    
    res.status(201).json({ 
      success: true, 
      message: "Class created successfully",
      data: newClass
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

// Get all classes
export const getAllClasses = async (req, res) => {
  try {
    // Check if the requesting user is an admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only administrators can view all classes.'
      });
    }
    
    const { school_year, archived, all } = req.query;
    let where = { is_deleted: false };
    // Filter by requested school_year, or default to active school year if present
    if (school_year) {
      where.school_year = school_year;
    } else {
      const active = await SchoolYear.getActive();
      if (active?.name) {
        where.school_year = active.name;
      }
    }
    // Active vs archived filter; default to active unless all=true
    if (String(archived).toLowerCase() === 'true') {
      where.is_active = false;
    } else if (String(all).toLowerCase() !== 'true') {
      where.is_active = true;
    }

    const classes = await Class.findAll({
      where,
      order: [['created_at', 'DESC']]
    });
    
    res.status(200).json({
      success: true,
      count: classes.length,
      data: classes
    });
    
  } catch (error) {
    console.error('Error fetching classes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch classes',
      error: error.message
    });
  }
};

// Update a class (admin only)
export const updateClass = async (req, res) => {
  try {
    // Check if the requesting user is an admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only administrators can update classes.'
      });
    }
    
    const { id } = req.params;
    const { grade_level, section, school_year, teacher_id } = req.body;
    
    // Find the class
    const classToUpdate = await Class.findByPk(id);
    
    if (!classToUpdate) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }
    
    // Check if another class with the same identifiers exists (avoid duplicates)
    if (grade_level || section || school_year) {
      const existingClass = await Class.findOne({
        where: { 
          grade_level: grade_level || classToUpdate.grade_level,
          section: section || classToUpdate.section,
          school_year: school_year || classToUpdate.school_year,
          id: { [Op.ne]: id } // Not the current class
        }
      });
      
      if (existingClass) {
        return res.status(400).json({
          success: false,
          message: "Another class with this grade level and section already exists for the selected school year"
        });
      }
    }
    
    // Handle teacher assignment
    let teacher = null;
    if (teacher_id) {
      // If teacher_id provided, find the teacher
      teacher = await User.findOne({
        where: { 
          id: teacher_id,
          user_role: 'teacher'
        }
      });
      
      if (!teacher) {
        return res.status(404).json({
          success: false,
          message: "Teacher not found"
        });
      }
    }
    
    // Update class details
    await classToUpdate.update({
      grade_level: grade_level || classToUpdate.grade_level,
      section: section || classToUpdate.section,
      school_year: school_year || classToUpdate.school_year,
      adviser_id: teacher_id === null ? null : (teacher ? teacher.id : classToUpdate.adviser_id),
      adviser_name: teacher_id === null ? null : (teacher ? teacher.user_fullname : classToUpdate.adviser_name),
      adviser_title: teacher_id === null ? null : (teacher ? teacher.teacher_title : classToUpdate.adviser_title)
    });
    
    // Fetch the updated class
    const updatedClass = await Class.findByPk(id);
    
    res.status(200).json({
      success: true,
      message: "Class updated successfully",
      data: updatedClass
    });
    
  } catch (error) {
    console.error("Error updating class:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to update class",
      error: error.message 
    });
  }
};

// Create teacher (admin only)
export const createTeacher = async (req, res) => {
  try {
    const { user_fullname, user_email, teacher_title } = req.body;

    // Check if email already exists
    const existingUser = await User.findOne({ where: { user_email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "A user with this email already exists"
      });
    }

    // Generate activation token
    const activationToken = crypto.randomBytes(32).toString('hex');
    const activationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create teacher with temporary password (they'll set it via activation)
    const tempPassword = crypto.randomBytes(16).toString('hex'); // Temporary password
    const hashedTempPassword = await bcrypt.hash(tempPassword, 12);

    const newTeacher = await User.create({
      user_fullname,
      user_email,
      password: hashedTempPassword, // Temporary password
      user_role: 'teacher',
      teacher_title,
      is_first_login: true,
      resetPasswordToken: activationToken, // Reuse this field for activation
      resetPasswordExpiry: activationTokenExpiry
    });

    // Send activation email
    const activationUrl = `${process.env.CLIENT_URL}/activate-account/${activationToken}`;
    await sendAccountActivationEmail(user_email, user_fullname, activationUrl);

    res.status(201).json({
      success: true,
      message: "Teacher account created successfully. Activation email sent.",
      teacher: {
        id: newTeacher.id,
        user_fullname: newTeacher.user_fullname,
        user_email: newTeacher.user_email,
        teacher_title: newTeacher.teacher_title
      }
    });

  } catch (error) {
    console.error('Create teacher error:', error);
    res.status(500).json({
      success: false,
      message: "Failed to create teacher account"
    });
  }
};

// Get admin analytics
export const getAdminAnalytics = async (req, res) => {
  try {
    // Check if the requesting user is an admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only administrators can access analytics.'
      });
    }

    const { school_year } = req.query;
    const currentSchoolYear = school_year || new Date().getFullYear().toString();

    // Normalize requested year to an exact academic span (YYYY-YYYY+1)
    let targetSpan = null;
    if (school_year && school_year !== 'all') {
      const yearStr = String(school_year);
      if (/^\d{4}$/.test(yearStr)) {
        const y = parseInt(yearStr, 10);
        targetSpan = `${y}-${y + 1}`;
      } else if (/^\d{4}-\d{4}$/.test(yearStr)) {
        targetSpan = yearStr;
      }
    }

    // Filter conditions based on school year
    const yearFilter = {};
    if (targetSpan) {
      yearFilter.school_year = targetSpan;
    }

    // 1. Overall Statistics (filtered by year if specified)
    let totalStudents, totalClasses;

    if (targetSpan) {
      // Get classes for the specific year
      const yearClasses = await Class.findAll({
        where: {
          is_active: true,
          ...yearFilter
        },
        attributes: ['id', 'grade_level', 'section', 'adviser_id', 'adviser_name', 'school_year', 'student_count']
      });

      const classIds = yearClasses.map(cls => cls.id);

      // Always count actual active students enrolled in these classes — never use grade records for this
      if (classIds.length > 0) {
        totalStudents = await Student.count({
          where: { class_id: { [Op.in]: classIds }, status: 'Active', is_deleted: false }
        });
      } else {
        totalStudents = 0;
      }

      totalClasses = yearClasses.length;
    } else {
      // Get all active data (current state)
      totalStudents = await Student.count({
        where: { status: 'Active' }
      });

      totalClasses = await Class.count({
        where: { is_active: true }
      });
    }

    const totalTeachers = await User.count({
      where: { user_role: 'teacher' }
    });

    const totalSubjects = await Subject.count();

    // 2. Get students for the specified year
    let students;
    if (targetSpan) {
      const yearClasses = await Class.findAll({
        where: {
          is_active: true,
          ...yearFilter
        },
        attributes: ['id']
      });

      const classIds = yearClasses.map(cls => cls.id);
      if (classIds.length > 0) {
        // Always fetch all active students enrolled in these classes — never filter by grade records
        students = await Student.findAll({
          where: { class_id: { [Op.in]: classIds }, status: 'Active', is_deleted: false },
          attributes: ['sex', 'age']
        });
      } else {
        students = [];
      }
    } else {
      students = await Student.findAll({
        where: { status: 'Active' },
        attributes: ['sex', 'age']
      });
    }

    // Process demographics
    const genderCount = { Male: 0, Female: 0 };
    const ageCount = {};

    students.forEach(student => {
      // Gender count
      if (student.sex === 'Male' || student.sex === 'M') {
        genderCount.Male++;
      } else if (student.sex === 'Female' || student.sex === 'F') {
        genderCount.Female++;
      }

      // Age count
      if (student.age) {
        ageCount[student.age] = (ageCount[student.age] || 0) + 1;
      }
    });

    const genderDistribution = [
      { sex: 'Male', count: genderCount.Male },
      { sex: 'Female', count: genderCount.Female }
    ];

    const ageDistribution = Object.entries(ageCount)
      .map(([age, count]) => ({ age: parseInt(age), count }))
      .sort((a, b) => a.age - b.age);

    // 3. Class-based statistics (filtered by year)
    const classFilter = {
      is_active: true,
      ...(targetSpan ? yearFilter : {})
    };

    const classes = await Class.findAll({
      where: classFilter,
      attributes: ['id', 'grade_level', 'section', 'adviser_name', 'school_year', 'student_count']
    });

    const gradeCount = {};
    // Build actual enrolled student counts by class_id
    let countsByClassId = {};
    if (targetSpan && classes.length > 0) {
      const classIds = classes.map(c => c.id);
      // Always use actual active student membership — never override with grade records
      // (grade records only reflect students who have had grades entered, not all enrolled students)
      const baseCounts = await Student.findAll({
        where: { class_id: { [Op.in]: classIds }, status: 'Active', is_deleted: false },
        attributes: ['class_id', [Sequelize.fn('COUNT', Sequelize.col('id')), 'cnt']],
        group: ['class_id'],
        raw: true
      });
      classes.forEach(cls => { countsByClassId[cls.id] = 0; });
      baseCounts.forEach(row => { countsByClassId[row.class_id] = parseInt(row.cnt) || 0; });
    }

    classes.forEach(cls => {
      const count = (targetSpan) ? (countsByClassId[cls.id] || 0) : (cls.student_count || 0);
      gradeCount[cls.grade_level] = (gradeCount[cls.grade_level] || 0) + count;
    });

    const gradeDistribution = Object.entries(gradeCount)
      .map(([grade_level, student_count]) => ({ grade_level, student_count }))
      .sort((a, b) => a.grade_level.localeCompare(b.grade_level));

    // 4. Teacher workload (for the specified year)
    const teachers = await User.findAll({
      where: { user_role: 'teacher' },
      attributes: ['id', 'user_fullname', 'teacher_title']
    });

    const teacherWorkload = [];
    for (const teacher of teachers) {
      const teacherClasses = await Class.findAll({
        where: { 
          adviser_id: teacher.id,
          is_active: true,
          ...(targetSpan ? yearFilter : {})
        },
        attributes: ['id', 'student_count']
      });

      const assignedClasses = teacherClasses.length;

      let totalStudentsHandled = 0;
      if (targetSpan && teacherClasses.length > 0) {
        const tClassIds = teacherClasses.map(c => c.id);
        totalStudentsHandled = await Student.count({
          where: {
            class_id: { [Op.in]: tClassIds },
            status: 'Active',
            is_deleted: false
          }
        });
      } else {
        // Current-state fallback: active membership across teacher classes
        const tClassIds = teacherClasses.map(c => c.id);
        totalStudentsHandled = tClassIds.length > 0
          ? await Student.count({ where: { class_id: { [Op.in]: tClassIds }, status: 'Active', is_deleted: false } })
          : 0;
      }

      teacherWorkload.push({
        user_fullname: teacher.user_fullname,
        teacher_title: teacher.teacher_title,
        classes_assigned: assignedClasses,
        total_students_handled: totalStudentsHandled
      });
    }

    teacherWorkload.sort((a, b) => b.classes_assigned - a.classes_assigned || b.total_students_handled - a.total_students_handled);

    // 5. Recent activities (filtered by year if specified)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    let recentStudents;
    if (school_year && school_year !== 'all') {
      const yearClasses = await Class.findAll({
        where: {
          is_active: true,
          ...yearFilter
        },
        attributes: ['id']
      });
      
      const classIds = yearClasses.map(cls => cls.id);
      
      recentStudents = classIds.length > 0 ? await Student.findAll({
        where: {
          created_at: {
            [Op.gte]: thirtyDaysAgo
          },
          status: 'Active',
          class_id: {
            [Op.in]: classIds
          }
        },
        order: [['created_at', 'DESC']],
        limit: 10,
        attributes: ['first_name', 'last_name', 'created_at', 'class_id']
      }) : [];
    } else {
      recentStudents = await Student.findAll({
        where: {
          created_at: {
            [Op.gte]: thirtyDaysAgo
          },
          status: 'Active'
        },
        order: [['created_at', 'DESC']],
        limit: 10,
        attributes: ['first_name', 'last_name', 'created_at', 'class_id']
      });
    }

    const recentActivities = [];
    for (const student of recentStudents) {
      let classInfo = { grade_level: 'N/A', section: 'N/A' };
      if (student.class_id) {
        const studentClass = await Class.findByPk(student.class_id, {
          attributes: ['grade_level', 'section']
        });
        if (studentClass) {
          classInfo = studentClass;
        }
      }

      recentActivities.push({
        activity_type: 'Student Enrolled',
        first_name: student.first_name,
        last_name: student.last_name,
        grade_level: classInfo.grade_level,
        section: classInfo.section,
        activity_date: student.created_at
      });
    }

    // 6. Get available years for the response from valid school year records only
    const schoolYears = await SchoolYear.findAll({
      attributes: ['name'],
      where: {
        name: {
          [Op.ne]: null
        }
      },
      order: [['name', 'DESC']],
      raw: true
    });

    const years = new Set();
    years.add(new Date().getFullYear());

    schoolYears.forEach(({ name }) => {
      if (/^\d{4}-\d{4}$/.test(String(name))) {
        years.add(parseInt(String(name).slice(0, 4), 10));
      }
    });

    const availableYears = Array.from(years).sort((a, b) => b - a);

    // 7. System metrics
    const systemMetrics = {
      averageClassSize: totalStudents > 0 && totalClasses > 0 
        ? Math.round(totalStudents / totalClasses) 
        : 0,
      teacherToStudentRatio: totalTeachers > 0 
        ? Math.round(totalStudents / totalTeachers) 
        : 0,
      classUtilization: totalClasses > 0 
        ? Math.round((totalStudents / (totalClasses * 40)) * 100)
        : 0
    };

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalStudents,
          totalTeachers,
          totalClasses,
          totalSubjects,
          systemMetrics
        },
        demographics: {
          genderDistribution,
          gradeDistribution,
          ageDistribution
        },
        enrollment: {
          classEnrollment: classes.map(cls => ({
            grade_level: cls.grade_level,
            section: cls.section,
            adviser_name: cls.adviser_name,
            total_students: (targetSpan ? (countsByClassId[cls.id] || 0) : (cls.student_count || 0)),
            capacity: (cls.student_count || 0),
            utilization_rate: 100,
            school_year: cls.school_year
          }))
        },
        teachers: teacherWorkload,
        trends: {
          enrollment: [],
          recentActivities
        },
        schoolYear: currentSchoolYear,
        availableYears
      }
    });

  } catch (error) {
    console.error('Error fetching admin analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics data',
      error: error.message
    });
  }
};

// Add this new function to get available school years
export const getAvailableSchoolYears = async (req, res) => {
  try {
    // Check if the requesting user is an admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only administrators can access this data.'
      });
    }

    // Get unique school years from classes table
    const classYears = await Class.findAll({
      attributes: ['school_year'],
      group: ['school_year'],
      where: {
        school_year: {
          [Op.ne]: null // Not null
        }
      },
      raw: true
    });

    // Get years from student creation dates as fallback
    const students = await Student.findAll({
      attributes: ['created_at'],
      where: { 
        status: 'Active',
        created_at: {
          [Op.ne]: null
        }
      },
      raw: true
    });

    // Extract unique years
    const years = new Set();
    
    // Add current year
    years.add(new Date().getFullYear());
    
    // Add years from classes (primary source)
    classYears.forEach(cls => {
      if (cls.school_year) {
        // Handle different formats: "2024", "2024-2025", etc.
        const yearMatch = cls.school_year.toString().match(/\d{4}/);
        if (yearMatch) {
          years.add(parseInt(yearMatch[0]));
        }
      }
    });

    // Add years from student creation dates (fallback)
    students.forEach(student => {
      if (student.created_at) {
        years.add(new Date(student.created_at).getFullYear());
      }
    });

    // Convert to sorted array (most recent first)
    const availableYears = Array.from(years).sort((a, b) => b - a);

    res.status(200).json({
      success: true,
      data: availableYears
    });

  } catch (error) {
    console.error('Error fetching available school years:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch available school years',
      error: error.message
    });
  }
};

// Update the export to include the new function
export default {
  createTeacherAccount,
  getAllTeachers,
  updateTeacher,
  deleteTeacher,
  getValidTeacherTitles,
  createClass,
  getAllClasses,
  updateClass,
  createTeacher,
  getAdminAnalytics,
  getAvailableSchoolYears // Add this line
};

// Archive class (admin)
export const archiveClass = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied. Only administrators can archive classes.' });
    }
    const { id } = req.params;
    const cls = await Class.findByPk(id);
    if (!cls) return res.status(404).json({ success: false, message: 'Class not found' });
    await cls.update({ is_active: false, archived_at: new Date() });
    return res.status(200).json({ success: true, message: 'Class archived', data: cls });
  } catch (error) {
    console.error('Archive class error:', error);
    return res.status(500).json({ success: false, message: 'Failed to archive class', error: error.message });
  }
};

// Restore class from archive (admin)
export const restoreClass = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied. Only administrators can restore classes.' });
    }
    const { id } = req.params;
    const cls = await Class.findByPk(id);
    if (!cls) return res.status(404).json({ success: false, message: 'Class not found' });
    if (cls.is_deleted) return res.status(400).json({ success: false, message: 'Cannot restore a permanently deleted class' });
    await cls.update({ is_active: true, archived_at: null });
    return res.status(200).json({ success: true, message: 'Class restored', data: cls });
  } catch (error) {
    console.error('Restore class error:', error);
    return res.status(500).json({ success: false, message: 'Failed to restore class', error: error.message });
  }
};

// Permanently delete class (soft-delete row to preserve analytics)
export const deleteClassPermanent = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied. Only administrators can delete classes.' });
    }
    const { id } = req.params;
    const cls = await Class.findByPk(id);
    if (!cls) return res.status(404).json({ success: false, message: 'Class not found' });
    await cls.update({ is_active: false, archived_at: cls.archived_at || new Date(), is_deleted: true, deleted_at: new Date() });
    return res.status(200).json({ success: true, message: 'Class permanently deleted (analytics preserved)', data: cls });
  } catch (error) {
    console.error('Permanent delete class error:', error);
    return res.status(500).json({ success: false, message: 'Failed to permanently delete class', error: error.message });
  }
};