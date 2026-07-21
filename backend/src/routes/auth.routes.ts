import { Router } from 'express';
import { signup, login, me, resetPassword } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Public Routes
router.post('/signup', signup);
router.post('/login', login);
router.post('/reset-password', resetPassword);

// Protected Routes
router.get('/me', requireAuth, me);

export default router;
