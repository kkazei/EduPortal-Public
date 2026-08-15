import express from 'express';
import { 
  getClassAnalytics,
  getClassYearlyAnalytics,
  getSubjectAnalytics,
  getClassComparison
} from '../controllers/analytics.controller.js';
import { verifyToken } from '../middleware/verifyToken.js';
import { isTeacher, isAdmin } from '../middleware/roleCheck.js';

const router = express.Router();

// Get class analytics for a specific quarter
router.get('/class/:classId/quarter/:quarter', 
  verifyToken, 
  isTeacher,
  getClassAnalytics
);

// Get yearly analytics for a class (all quarters)
router.get('/class/:classId/yearly', 
  verifyToken, 
  isTeacher,
  getClassYearlyAnalytics
);

// Get subject performance analytics for a specific class
router.get('/class/:classId/subject/:subjectId', 
  verifyToken, 
  isTeacher,
  getSubjectAnalytics
);

// Get comparison analytics between different classes (admin/teacher)
router.get('/comparison', 
  verifyToken, 
  getClassComparison
);

// Additional route for admin to view any class analytics
router.get('/admin/class/:classId/quarter/:quarter', 
  verifyToken, 
  isAdmin, 
  getClassAnalytics
);

// Route for admin to get school-wide analytics
router.get('/admin/comparison/:gradeLevel?', 
  verifyToken, 
  isAdmin, 
  getClassComparison
);

export default router;