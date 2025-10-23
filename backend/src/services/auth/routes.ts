import { Router } from 'express';
import * as controller from './controller';
import { validateRequest } from '../../shared/middleware/validation';
import { authenticateToken } from '../../shared/middleware/auth';
import { registerSchema, loginSchema, refreshTokenSchema } from './schemas';

const router = Router();

// Public routes
router.post('/register', validateRequest(registerSchema), controller.register);
router.post('/login', validateRequest(loginSchema), controller.login);
router.post('/refresh', validateRequest(refreshTokenSchema), controller.refreshToken);

// Protected routes
router.post('/logout', authenticateToken, controller.logout);
router.get('/me', authenticateToken, controller.getCurrentUser);

export default router;
