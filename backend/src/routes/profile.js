/**
 * Author: Igor Michel
 * Purpose: Self-service profile routes — available to any authenticated user.
 */
import { Router } from 'express';
import { authRequired } from '../middleware/auth.js';
import {
  getSignatureStatus,
  getSignatureData,
  saveSignature,
  deleteSignature,
} from '../controllers/profileController.js';

const router = Router();

router.use(authRequired);

router.get('/signature', getSignatureStatus);
router.get('/signature/data', getSignatureData);
router.put('/signature', saveSignature);
router.delete('/signature', deleteSignature);

export default router;
