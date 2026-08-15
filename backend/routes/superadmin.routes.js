import express from 'express';
import { verifyToken } from '../middleware/verifyToken.js';
import { isSuperAdmin } from '../middleware/roleCheck.js';
import { listUsers, updateUserRole, createUser, deleteUser, restoreUser, getSuperadminAnalytics, requestActionCode } from '../controllers/superadmin.controller.js';
import { superadminLogin } from '../controllers/auth.controller.js';

const router = express.Router();

router.get('/users', verifyToken, isSuperAdmin, listUsers);
router.patch('/users/:id/role', verifyToken, isSuperAdmin, updateUserRole);
router.post('/users', verifyToken, isSuperAdmin, createUser);
router.delete('/users/:id', verifyToken, isSuperAdmin, deleteUser);
router.patch('/users/:id/restore', verifyToken, isSuperAdmin, restoreUser);
router.post('/users/action-code', verifyToken, isSuperAdmin, requestActionCode);
router.get('/analytics', verifyToken, isSuperAdmin, getSuperadminAnalytics);
// Optional: superadmin login endpoint here as well under /api/superadmin
router.post('/auth/login', superadminLogin);

export default router;