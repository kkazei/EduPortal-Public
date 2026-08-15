import express from "express";
import { 
  getAllSubjects, 
  getSubjectById,
  createSubject,
  updateSubject,
  deleteSubject,
  getSubjectsByClass,
  getStudentSubjectsWithGrades,
  updateStudentGrades,
  seedSubjects
} from "../controllers/subject.controller.js";
import { verifyToken } from "../middleware/verifyToken.js";
import { isAdmin } from "../middleware/roleCheck.js";

const router = express.Router();

// Routes requiring teacher or admin privileges
router.post("/", verifyToken, isAdmin, createSubject);
router.post("/seed", verifyToken, isAdmin, seedSubjects);
router.put("/:id", verifyToken, isAdmin, updateSubject);
router.delete("/:id", verifyToken, isAdmin, deleteSubject);
router.put("/student/:studentId/subject/:subjectId/grades", verifyToken, isAdmin, updateStudentGrades);

// Routes for all authenticated users (teachers, admins, students)
router.get("/", verifyToken, getAllSubjects);
router.get("/:id", verifyToken, getSubjectById);
router.get("/class/:classId", verifyToken, getSubjectsByClass);
router.get("/student/:studentId/grades", verifyToken, getStudentSubjectsWithGrades);

export default router;