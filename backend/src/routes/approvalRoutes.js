/**
 * Author: Igor Michel
 * Purpose: Routes for approving and rejecting procurement requests.
 * Last updated: 2026-03-11
 */
import { Router } from 'express';
import { authRequired } from '../middleware/auth.js';
import { approve, reject, listApprovals } from '../controllers/approvalController.js';

const router = Router();

router.use(authRequired);

router.post('/:id/approve', approve);
router.post('/:id/reject', reject);
router.get('/:id/approvals', listApprovals);

export default router;
