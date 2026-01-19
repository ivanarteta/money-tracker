import express from 'express';
import { getWeeklyReport, getMonthlyReport } from '../controllers/reportController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/weekly', getWeeklyReport);
router.get('/monthly', getMonthlyReport);

export default router;
