import { Router } from 'express';
import { getUsers, createUser, updateUser, deleteUser } from '../controllers/adminController';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

// Apply auth protection and admin check to all admin routes
router.use(authenticateToken);
router.use(requireAdmin);

router.get('/users', getUsers);
router.post('/users', createUser);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

export default router;
