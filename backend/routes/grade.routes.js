import express from 'express';
import { 
  getStudentGrades, 
  getClassGrades, 
  updateStudentGrade,
  getStudentReportCard,
  updateMultipleGrades,
  getStudentCard,
  importGradesFromExcel
} from '../controllers/grade.controller.js';
import { verifyToken } from '../middleware/verifyToken.js';
import { isTeacher, isTeacherOrAdmin } from '../middleware/roleCheck.js';

const router = express.Router();

// Get student grades
router.get('/student/:studentId', verifyToken, getStudentGrades);

// Get class grades
router.get('/class/:classId', verifyToken, isTeacher, getClassGrades);

// Update student grade for a subject
router.put('/student/:studentId/subject/:subjectId/class/:classId', 
  verifyToken, 
  isTeacher, 
  updateStudentGrade
);

// Get student report card
router.get('/report-card/:studentId/:schoolYear?', verifyToken, getStudentReportCard);

// Get student card (for student view)
router.get('/student-card/:studentId/:schoolYear?', verifyToken, getStudentCard);

// Update multiple grades at once
router.put('/multiple-grades/:studentId/class/:classId',
  verifyToken,
  isTeacher,
  updateMultipleGrades
);

// Import grades from Excel
router.post('/import-excel', 
  verifyToken, 
  isTeacherOrAdmin, 
  importGradesFromExcel
);

export default router;