import { Router } from 'express';
import { login, me } from '../controllers/authController.js';
import { authRequired } from '../middleware/auth.js';

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const router = Router();
router.post('/login', asyncHandler(login));
router.get('/me', authRequired, me);
export default router;
