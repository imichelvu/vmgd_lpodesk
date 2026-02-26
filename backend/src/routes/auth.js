import { Router } from 'express';
import { login, me, forgotPassword, resetPassword } from '../controllers/authController.js';
import { authRequired } from '../middleware/auth.js';

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const router = Router();
router.post('/login', asyncHandler(login));
router.get('/me', authRequired, me);
router.post('/forgot-password', asyncHandler(forgotPassword));
router.post('/reset-password', asyncHandler(resetPassword));
export default router;
