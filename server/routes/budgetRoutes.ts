import { Router } from 'express';
import { getBudgets, setBudget, deleteBudget } from '../controllers/budgetController';
import { authenticateToken } from '../middleware/auth';
import { budgetValidator } from '../validators/budget';

const router = Router();

router.use(authenticateToken);

router.get('/', getBudgets);
router.post('/', budgetValidator, setBudget);
router.delete('/:id', deleteBudget);

export default router;
