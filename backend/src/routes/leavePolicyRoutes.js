import { Router } from 'express';
import {
  listLeavePolicies,
  createLeavePolicy,
  updateLeavePolicy,
  deleteLeavePolicy,
  listAccrualTiers,
  createAccrualTier,
  updateAccrualTier,
  deleteAccrualTier,
} from '../controllers/leavePolicyController.js';
import { authRequired } from '../middleware/auth.js';
import { checkRole, ROLE_IDS } from '../middleware/checkRole.js';

const router = Router();

router.use(authRequired);
router.use(checkRole(ROLE_IDS.Admin)); // Only Admin can manage policies

// Leave Policy Routes
router.get('/', listLeavePolicies);
router.post('/', createLeavePolicy);
router.patch('/:id', updateLeavePolicy);
router.delete('/:id', deleteLeavePolicy);

// Accrual Tier Routes
router.get('/:policyId/tiers', listAccrualTiers);
router.post('/:policyId/tiers', createAccrualTier);
router.patch('/:policyId/tiers/:tierId', updateAccrualTier);
router.delete('/:policyId/tiers/:tierId', deleteAccrualTier);

export default router;
