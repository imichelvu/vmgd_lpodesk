import { Router } from 'express';
import { authRequired } from '../middleware/auth.js';
import {
  createOvertimeEntry,
  listMyOvertimeEntries,
  getMyOvertimeSummary,
  updateMyOvertimeEntry,
  deleteMyOvertimeEntry,
  OVERTIME_TYPES,
} from '../controllers/overtimeController.js';

const router = Router();

// Public-ish: return allowed overtime types (still requires auth for consistency)
router.get('/types', authRequired, (req, res) => res.json(OVERTIME_TYPES));

router.use(authRequired);
router.get('/mine', listMyOvertimeEntries);
router.get('/mine/summary', getMyOvertimeSummary);
router.post('/', createOvertimeEntry);
router.patch('/:id', updateMyOvertimeEntry);
router.delete('/:id', deleteMyOvertimeEntry);

export default router;
