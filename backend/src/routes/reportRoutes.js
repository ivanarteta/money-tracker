import express from 'express';
import { query } from 'express-validator';
import { getWeeklyReport, getMonthlyReport, getRangeReport, getRangeReportPdf, getWeeklyReportPdf, getMonthlyReportPdf } from '../controllers/reportController.js';
import { authenticateToken } from '../middleware/auth.js';
import { handleValidationErrors } from '../middleware/validation.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/weekly', getWeeklyReport);
router.get('/monthly', getMonthlyReport);
router.get('/weekly/pdf', getWeeklyReportPdf);
router.get('/monthly/pdf', getMonthlyReportPdf);
router.get(
  '/range',
  [
    query('startDate').isISO8601().withMessage('startDate inválida'),
    query('endDate').isISO8601().withMessage('endDate inválida')
  ],
  handleValidationErrors,
  getRangeReport
);
router.get(
  '/range/pdf',
  [
    query('startDate').isISO8601().withMessage('startDate inválida'),
    query('endDate').isISO8601().withMessage('endDate inválida')
  ],
  handleValidationErrors,
  getRangeReportPdf
);

export default router;
