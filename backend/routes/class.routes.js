import express from 'express';
import { 
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
} from '../controllers/class.controller.js';
import { verifyToken } from '../middleware/verifyToken.js';
import { isTeacher, isAdmin } from '../middleware/roleCheck.js';

const router = express.Router();

// Class routes
router.post('/', verifyToken, isTeacher, createClass);
router.get('/', verifyToken, getAllClasses);
router.get('/:classId', verifyToken, getClassById);
router.put('/:classId', verifyToken, isTeacher, updateClass);

// Archive/Restore/Delete routes (admin)
router.patch('/:classId/archive', verifyToken, isAdmin, archiveClass);
router.patch('/:classId/restore', verifyToken, isAdmin, restoreClass);
router.delete('/:classId/permanent', verifyToken, isAdmin, deleteClassPermanent);

// Class-Subject relationship routes
router.get('/:classId/subjects', verifyToken, getClassSubjects);
// Allow adviser teachers or admins (permission checked in controller)
router.post('/:classId/subjects', verifyToken, addSubjectToClass);
router.delete('/:classId/subjects/:subjectId', verifyToken, removeSubjectFromClass);

export default router;