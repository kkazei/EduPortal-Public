import express from 'express';
import { 
  createStudent, 
  getAllStudents, 
  getStudentById, 
  updateStudent, 
  deleteStudent,
  getStudentByLRN,
  getStudentsByClass,
  getClassStudents, // Add this line
  restoreStudent,
  permanentlyDeleteStudent,
  getDeletedStudents,
  getStudentByUserId,
  bulkCreateStudents,
  resetStudentPassword
} from '../controllers/student.controller.js';
import { verifyToken } from '../middleware/verifyToken.js';
import { isTeacher, isAdmin, isTeacherOrAdmin } from '../middleware/roleCheck.js';

const router = express.Router();

// Create a new student record (teachers only)
router.post('/', verifyToken, isTeacherOrAdmin, createStudent);

// Get all active students (any authenticated user)
router.get('/', verifyToken, getAllStudents);

// Get all soft-deleted students (admin only)
router.get('/deleted', verifyToken, isAdmin, getDeletedStudents);

// Find student by LRN (Learner Reference Number)
router.get('/lrn/:lrn', verifyToken, getStudentByLRN);

// Get all students in a specific class (for navigation)
router.get('/class/:classId/students', verifyToken, getClassStudents);

// Get all students in a specific class
router.get('/class/:classId', verifyToken, getStudentsByClass);

// Find student by associated user account ID
router.get('/user/:userId', verifyToken, getStudentByUserId);

// Get a specific student by ID
router.get('/:id', verifyToken, getStudentById);

// Update a student's information 
router.put('/:id', verifyToken, isTeacherOrAdmin, updateStudent);

// Soft delete a student record 
router.delete('/:id', verifyToken, isAdmin, deleteStudent);

// Restore a previously soft-deleted student (teachers only)
router.patch('/:id/restore', verifyToken, isAdmin, restoreStudent);

// Permanently delete a student from database (admin only)
router.delete('/:id/permanent', verifyToken, isAdmin, permanentlyDeleteStudent);

// Create multiple students at once from CSV/spreadsheet
router.post('/bulk', verifyToken, bulkCreateStudents);

// Reset a student's password (admin only)
router.post('/:id/reset-password', verifyToken, isAdmin, resetStudentPassword);

// Require email-only setup on next login (admin only)
import { requireStudentEmailSetup } from '../controllers/student.controller.js';
router.post('/:id/require-email-setup', verifyToken, isAdmin, requireStudentEmailSetup);

// Promote students (teacher or admin)
import { promoteStudents } from '../controllers/student.controller.js';
router.post('/promote', verifyToken, isTeacherOrAdmin, promoteStudents);

export default router;