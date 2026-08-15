import express from "express";
import { 
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
  getAvailableSchoolYears, // Add this import
  archiveClass,
  restoreClass,
  deleteClassPermanent
} from "../controllers/admin.controller.js";
import { verifyToken } from "../middleware/verifyToken.js";
import { isAdmin } from "../middleware/roleCheck.js";

const router = express.Router();

// Teacher management routes
router.post("/teachers", verifyToken, isAdmin, createTeacherAccount);
router.get("/teachers", verifyToken, isAdmin, getAllTeachers);
router.put("/teachers/:id", verifyToken, isAdmin, updateTeacher);
router.delete("/teachers/:id", verifyToken, isAdmin, deleteTeacher);
router.get("/teacher-titles", verifyToken, isAdmin, getValidTeacherTitles);
router.post('/create-teacher', createTeacher);

// Class management routes
router.post("/classes", verifyToken, isAdmin, createClass);
router.get("/classes", verifyToken, isAdmin, getAllClasses);
router.put("/classes/:id", verifyToken, isAdmin, updateClass);
router.patch("/classes/:id/archive", verifyToken, isAdmin, archiveClass);
router.patch("/classes/:id/restore", verifyToken, isAdmin, restoreClass);
router.delete("/classes/:id/permanent", verifyToken, isAdmin, deleteClassPermanent);

// Analytics routes 
router.get('/analytics', verifyToken, isAdmin, getAdminAnalytics);
router.get('/available-years', verifyToken, isAdmin, getAvailableSchoolYears); // Add this route

export default router;