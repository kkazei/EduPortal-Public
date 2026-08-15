import express from 'express';
import { registerVisit, getTotalVisits } from '../controllers/visit.controller.js';

const router = express.Router();

// Public endpoints for unique visit tracking
router.post('/', registerVisit);
router.get('/total', getTotalVisits);

export default router;
