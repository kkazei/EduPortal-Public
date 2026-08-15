import express from 'express';
import {
  getStudentAttendance,
  updateAttendance,
  bulkUpdateAttendance,
  getClassAttendance
} from '../controllers/attendance.controller.js';
import { getMonthlySchoolDays, updateMonthlySchoolDays } from '../controllers/schoolDays.controller.js';
import { verifyToken } from '../middleware/verifyToken.js';
import { isTeacherOrAdmin, isStudent, isTeacher, isAdmin } from '../middleware/roleCheck.js';

const router = express.Router();

// Get attendance for a specific student
router.get('/student/:studentId/:schoolYear?', verifyToken, getStudentAttendance);

// Update attendance for a specific month
router.put('/student/:studentId/class/:classId', verifyToken, isTeacher, updateAttendance);

// Bulk update attendance for multiple months
router.put('/bulk-update/:studentId/class/:classId', verifyToken, isTeacher, bulkUpdateAttendance);

// Get attendance for all students in a class
router.get('/class/:classId/:month?/:schoolYear?', verifyToken, isTeacher, getClassAttendance);

// Monthly school days config endpoints
router.get('/school-days/:schoolYear?', verifyToken, isTeacherOrAdmin, getMonthlySchoolDays);
router.put('/school-days/:schoolYear', verifyToken, isAdmin, updateMonthlySchoolDays);

export default router;