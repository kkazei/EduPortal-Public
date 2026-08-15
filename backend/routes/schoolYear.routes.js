import express from 'express';
import { listSchoolYears, getCurrentSchoolYear, createSchoolYear, activateSchoolYear, endSchoolYear, updateSchoolYear } from '../controllers/schoolYear.controller.js';
import { verifyToken } from '../middleware/verifyToken.js';
import { isAdmin } from '../middleware/roleCheck.js';

const router = express.Router();

router.get('/', verifyToken, listSchoolYears);
router.get('/current', verifyToken, getCurrentSchoolYear);
router.post('/', verifyToken, isAdmin, createSchoolYear);
router.patch('/:id/activate', verifyToken, isAdmin, activateSchoolYear);
router.patch('/:id/end', verifyToken, isAdmin, endSchoolYear);
router.patch('/:id', verifyToken, isAdmin, updateSchoolYear);

export default router;
