/**
 * Author: Igor Michel
 * Purpose: Admin routes for leave_balance_policies and leave_accrual_tiers CRUD.
 * PK for policies: leave_type (URL-encoded). Tiers PK: (leave_type, min_years).
 */
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
router.use(checkRole(ROLE_IDS.Admin));

// Policies — keyed by leave_type (text, URL-encoded in path)
router.get('/',                             listLeavePolicies);
router.post('/',                            createLeavePolicy);
router.patch('/:leaveType',                 updateLeavePolicy);
router.delete('/:leaveType',               deleteLeavePolicy);

// Accrual tiers — keyed by (leave_type, min_years)
router.get('/:leaveType/tiers',            listAccrualTiers);
router.post('/:leaveType/tiers',           createAccrualTier);
router.patch('/:leaveType/tiers/:minYears', updateAccrualTier);
router.delete('/:leaveType/tiers/:minYears', deleteAccrualTier);

export default router;
