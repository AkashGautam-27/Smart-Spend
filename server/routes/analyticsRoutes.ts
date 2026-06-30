import { Router } from 'express';
import { getDashboardStats, getMonthlyReports } from '../controllers/analyticsController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/dashboard', getDashboardStats);
router.get('/monthly-reports', getMonthlyReports);

export default router;
