/**
 * Author: Igor Michel
 * Purpose: API routes for app_settings — admin-configurable values (TOIL multiplier, expiry, etc.)
 */
import { Router } from 'express';
import { authRequired } from '../middleware/auth.js';
import { checkRole, ROLE_IDS } from '../middleware/checkRole.js';
import { getSettings, getSetting, updateSetting } from '../controllers/settingsController.js';

const router = Router();

router.use(authRequired);

// Any authenticated user can read settings (needed by leave form to show TOIL balance)
router.get('/', getSettings);
router.get('/:key', getSetting);

// Only Admins can modify settings
router.put('/:key', checkRole(ROLE_IDS.Admin), updateSetting);

export default router;
