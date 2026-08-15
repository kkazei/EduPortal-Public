import Subject, { Grade, seedDefaultSubjects, QuarterlyAverage, updateStudentQuarterlyAverages } from '../models/subject.model.js';
import User from '../models/user.model.js';
import Class from '../models/class.model.js';
import Student from '../models/student.model.js';
import { Op } from 'sequelize';

// Get all subjects with optional filtering
export const getAllSubjects = async (req, res) => {
    try {
        const { grade_level, is_core, search, teacher_id } = req.query;
        
        // Build filter conditions
        const whereConditions = {};
        
        if (grade_level) {
            whereConditions.grade_level = grade_level;
        }
        
        if (is_core !== undefined) {
            whereConditions.is_core = is_core === 'true';
        }
        
        if (search) {
            whereConditions[Op.or] = [
                { subject_name: { [Op.like]: `%${search}%` } },
                { subject_code: { [Op.like]: `%${search}%` } }
            ];
        }
        
        if (teacher_id) {
            whereConditions.teacher_id = teacher_id;
        }
        
        const subjects = await Subject.findAll({
            where: whereConditions,
            include: [
                {
                    model: User,
                    as: 'teacher',
                    attributes: ['id', 'user_fullname', 'user_email']
                }
            ],
            order: [['grade_level', 'ASC'], ['subject_name', 'ASC']]
        });
        
        res.status(200).json({
            success: true,
            count: subjects.length,
            data: subjects
        });
    } catch (error) {
        console.error('Error fetching subjects:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch subjects',
            error: error.message
        });
    }
};

// Get a single subject by ID
export const getSubjectById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const subject = await Subject.findByPk(id, {
            include: [
                {
                    model: User,
                    as: 'teacher',
                    attributes: ['id', 'user_fullname', 'user_email']
                },
                {
                    model: Class,
                    as: 'classes',
                    through: { attributes: [] }
                }
            ]
        });
        
        if (!subject) {
            return res.status(404).json({
                success: false,
                message: 'Subject not found'
            });
        }
        
        res.status(200).json({
            success: true,
            data: subject
        });
    } catch (error) {
        console.error('Error fetching subject:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch subject',
            error: error.message
        });
    }
};

// Create a new subject - ADMIN ONLY
export const createSubject = async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Only administrators can create subjects.'
            });
        }
        
        const { 
            subject_code, subject_name, description, grade_level, teacher_id 
        } = req.body;
        
        // Validate required fields
        if (!subject_code || !subject_name || !grade_level) {
            return res.status(400).json({
                success: false,
                message: 'Subject code, name, and grade level are required'
            });
        }
        
        // Check if subject code already exists
        const existingSubject = await Subject.findOne({
            where: { subject_code }
        });
        
        if (existingSubject) {
            return res.status(400).json({
                success: false,
                message: 'Subject code already exists'
            });
        }
        
        // Create new subject
        const newSubject = await Subject.create({
            subject_code: subject_code.toUpperCase(), // Ensure uppercase for consistency
            subject_name,
            description,
            grade_level,
            teacher_id: teacher_id || null
        });
        
        res.status(201).json({
            success: true,
            message: 'Subject created successfully',
            data: newSubject
        });
    } catch (error) {
        console.error('Error creating subject:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to create subject',
            error: error.message
        });
    }
};

// Update a subject - ADMIN ONLY
export const updateSubject = async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Only administrators can update subjects.'
            });
        }
        
        const { id } = req.params;
        const { 
            subject_code, subject_name, description, grade_level, teacher_id, is_active
        } = req.body;
        
        // Find subject to update
        const subject = await Subject.findByPk(id);
        
        if (!subject) {
            return res.status(404).json({
                success: false,
                message: 'Subject not found'
            });
        }
        
        // If subject code is being changed, check if new code exists
        if (subject_code && subject_code !== subject.subject_code) {
            const existingSubject = await Subject.findOne({
                where: { subject_code }
            });
            
            if (existingSubject) {
                return res.status(400).json({
                    success: false,
                    message: 'Subject code already exists'
                });
            }
        }
        
        // Update subject
        await subject.update({
            subject_code: subject_code ? subject_code.toUpperCase() : subject.subject_code, // Ensure uppercase
            subject_name: subject_name || subject.subject_name,
            description: description !== undefined ? description : subject.description,
            grade_level: grade_level || subject.grade_level,
            teacher_id: teacher_id !== undefined ? teacher_id : subject.teacher_id,
            is_active: is_active !== undefined ? is_active : subject.is_active
        });
        
        // Get updated subject with teacher info
        const updatedSubject = await Subject.findByPk(id, {
            include: [
                {
                    model: User,
                    as: 'teacher',
                    attributes: ['id', 'user_fullname', 'user_email']
                }
            ]
        });
        
        res.status(200).json({
            success: true,
            message: 'Subject updated successfully',
            data: updatedSubject
        });
    } catch (error) {
        console.error('Error updating subject:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to update subject',
            error: error.message
        });
    }
};

// Delete a subject - ADMIN ONLY
export const deleteSubject = async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Only administrators can delete subjects.'
            });
        }
        
        const { id } = req.params;
        
        // Find subject to delete
        const subject = await Subject.findByPk(id);
        
        if (!subject) {
            return res.status(404).json({
                success: false,
                message: 'Subject not found'
            });
        }
        
        // Check if subject has associated grades
        const associatedGrades = await Grade.findOne({
            where: { subject_id: id }
        });
        
        if (associatedGrades) {
            // Instead of deleting, mark as inactive
            await subject.update({ is_active: false });
            
            return res.status(200).json({
                success: true,
                message: 'Subject has existing grades. Marked as inactive instead.',
                data: subject
            });
        }
        
        // Delete subject
        await subject.destroy();
        
        res.status(200).json({
            success: true,
            message: 'Subject deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting subject:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to delete subject',
            error: error.message
        });
    }
};

// Get subjects for a specific class
export const getSubjectsByClass = async (req, res) => {
    try {
        const { classId } = req.params;
        
        // Find the class and include subjects
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

// Get subjects for a specific student (with grades)
export const getStudentSubjectsWithGrades = async (req, res) => {
    try {
        const { studentId } = req.params;
        const { school_year } = req.query;
        
        // Current school year if not provided
        const currentYear = new Date().getFullYear();
        const defaultSchoolYear = `${currentYear}-${currentYear + 1}`;
        const targetSchoolYear = school_year || defaultSchoolYear;
        
        // Find the student
        const student = await Student.findByPk(studentId);
        
        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'Student not found'
            });
        }
        
        // Get all grades for this student with subject info
        const grades = await Grade.findAll({
            where: { 
                student_id: studentId,
                school_year: targetSchoolYear
            },
            include: [
                {
                    model: Subject,
                    as: 'subject',
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
        
        // Get quarterly averages for the student
        let quarterlyAverages = await QuarterlyAverage.findOne({
            where: {
                student_id: studentId,
                class_id: student.class_id,
                school_year: targetSchoolYear
            }
        });
        
        // If no quarterly averages exist yet, calculate them
        if (!quarterlyAverages && grades.length > 0) {
            quarterlyAverages = await updateStudentQuarterlyAverages(
                studentId,
                student.class_id,
                targetSchoolYear
            );
        }
        
        res.status(200).json({
            success: true,
            count: grades.length,
            data: grades,
            quarterlyAverages: quarterlyAverages ? {
                q1_average: quarterlyAverages.q1_average,
                q2_average: quarterlyAverages.q2_average,
                q3_average: quarterlyAverages.q3_average,
                q4_average: quarterlyAverages.q4_average,
                final_average: quarterlyAverages.final_average,
                remarks: quarterlyAverages.remarks
            } : null
        });
    } catch (error) {
        console.error('Error fetching student subjects:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch student subjects',
            error: error.message
        });
    }
};

// Update student grades for a subject
export const updateStudentGrades = async (req, res) => {
    try {
        const { studentId, subjectId } = req.params;
        const { q1_grade, q2_grade, q3_grade, q4_grade, remarks, school_year } = req.body;
        
        // Current school year if not provided
        const currentYear = new Date().getFullYear();
        const defaultSchoolYear = `${currentYear}-${currentYear + 1}`;
        const targetSchoolYear = school_year || defaultSchoolYear;
        
        // Find student to get class ID
        const student = await Student.findByPk(studentId);
            
        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'Student not found'
            });
        }
        
        // Find existing grade record
        let grade = await Grade.findOne({
            where: { 
                student_id: studentId,
                subject_id: subjectId,
                school_year: targetSchoolYear
            }
        });
        
        if (!grade) {
            // Create new grade record
            grade = await Grade.create({
                student_id: studentId,
                subject_id: subjectId,
                class_id: student.class_id,
                school_year: targetSchoolYear,
                q1_grade,
                q2_grade,
                q3_grade,
                q4_grade,
                remarks
            });
        } else {
            // Update existing grade
            await grade.update({
                q1_grade: q1_grade !== undefined ? q1_grade : grade.q1_grade,
                q2_grade: q2_grade !== undefined ? q2_grade : grade.q2_grade,
                q3_grade: q3_grade !== undefined ? q3_grade : grade.q3_grade,
                q4_grade: q4_grade !== undefined ? q4_grade : grade.q4_grade,
                remarks: remarks !== undefined ? remarks : grade.remarks
            });
        }
        
        // Update quarterly averages after updating grades
        await updateStudentQuarterlyAverages(
            studentId,
            student.class_id,
            targetSchoolYear
        );
        
        // Get updated grade with subject info
        const updatedGrade = await Grade.findOne({
            where: { 
                student_id: studentId,
                subject_id: subjectId,
                school_year: targetSchoolYear
            },
            include: [
                {
                    model: Subject,
                    as: 'subject'
                }
            ]
        });
        
        // Get updated quarterly averages
        const updatedQuarterlyAverages = await QuarterlyAverage.findOne({
            where: {
                student_id: studentId,
                class_id: student.class_id,
                school_year: targetSchoolYear
            }
        });
        
        res.status(200).json({
            success: true,
            message: 'Grades updated successfully',
            data: updatedGrade,
            quarterlyAverages: updatedQuarterlyAverages ? {
                q1_average: updatedQuarterlyAverages.q1_average,
                q2_average: updatedQuarterlyAverages.q2_average,
                q3_average: updatedQuarterlyAverages.q3_average,
                q4_average: updatedQuarterlyAverages.q4_average,
                final_average: updatedQuarterlyAverages.final_average,
                remarks: updatedQuarterlyAverages.remarks
            } : null
        });
    } catch (error) {
        console.error('Error updating grades:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to update grades',
            error: error.message
        });
    }
};

// Update grades for multiple subjects at once
export const updateMultipleSubjectGrades = async (req, res) => {
    try {
        const { studentId } = req.params;
        const { grades, school_year } = req.body;
        
        // Validate input
        if (!Array.isArray(grades) || grades.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid grades data provided. Expected an array of grade objects.'
            });
        }
        
        // Find student to get class ID
        const student = await Student.findByPk(studentId);
            
        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'Student not found'
            });
        }
        
        // Current school year if not provided
        const currentYear = new Date().getFullYear();
        const defaultSchoolYear = `${currentYear}-${currentYear + 1}`;
        const targetSchoolYear = school_year || defaultSchoolYear;
        
        // Process each subject grade
        const updatePromises = grades.map(async (gradeData) => {
            const { subject_id, q1_grade, q2_grade, q3_grade, q4_grade, remarks } = gradeData;
            
            // Find or create grade record
            const [grade, created] = await Grade.findOrCreate({
                where: {
                    student_id: studentId,
                    subject_id: subject_id,
                    class_id: student.class_id,
                    school_year: targetSchoolYear
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
            
            return grade;
        });
        
        // Wait for all updates to complete
        await Promise.all(updatePromises);
        
        // Update quarterly averages after updating all grades
        await updateStudentQuarterlyAverages(
            studentId,
            student.class_id,
            targetSchoolYear
        );
        
        // Get updated quarterly averages
        const updatedQuarterlyAverages = await QuarterlyAverage.findOne({
            where: {
                student_id: studentId,
                class_id: student.class_id,
                school_year: targetSchoolYear
            }
        });
        
        res.status(200).json({
            success: true,
            message: 'All grades updated successfully',
            updatedSubjects: grades.length,
            quarterlyAverages: updatedQuarterlyAverages ? {
                q1_average: updatedQuarterlyAverages.q1_average,
                q2_average: updatedQuarterlyAverages.q2_average,
                q3_average: updatedQuarterlyAverages.q3_average,
                q4_average: updatedQuarterlyAverages.q4_average,
                final_average: updatedQuarterlyAverages.final_average,
                remarks: updatedQuarterlyAverages.remarks
            } : null
        });
    } catch (error) {
        console.error('Error updating multiple grades:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to update grades',
            error: error.message
        });
    }
};

// Get all quarterly averages for a class
export const getClassQuarterlyAverages = async (req, res) => {
    try {
        const { classId } = req.params;
        const { school_year } = req.query;
        
        // Current school year if not provided
        const currentYear = new Date().getFullYear();
        const defaultSchoolYear = `${currentYear}-${currentYear + 1}`;
        const targetSchoolYear = school_year || defaultSchoolYear;
        
        // Find class
        const classExists = await Class.findByPk(classId);
        
        if (!classExists) {
            return res.status(404).json({
                success: false,
                message: 'Class not found'
            });
        }
        
        // Get all quarterly averages for this class
        const averages = await QuarterlyAverage.findAll({
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
        
        res.status(200).json({
            success: true,
            count: averages.length,
            data: averages.map((average, index) => ({
                rank: index + 1,
                id: average.id,
                student_id: average.student_id,
                student_name: `${average.student.first_name} ${average.student.last_name}`,
                lrn: average.student.lrn,
                q1_average: average.q1_average,
                q2_average: average.q2_average,
                q3_average: average.q3_average,
                q4_average: average.q4_average,
                final_average: average.final_average,
                remarks: average.remarks
            }))
        });
    } catch (error) {
        console.error('Error fetching class quarterly averages:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch class quarterly averages',
            error: error.message
        });
    }
};

// Seed default subjects
export const seedSubjects = async (req, res) => {
    try {
        await seedDefaultSubjects();
        
        res.status(200).json({
            success: true,
            message: 'Default subjects seeded successfully'
        });
    } catch (error) {
        console.error('Error seeding subjects:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to seed subjects',
            error: error.message
        });
    }
};