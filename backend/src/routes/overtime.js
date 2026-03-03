import { Router } from 'express';
import { authRequired } from '../middleware/auth.js';
import {
  createOvertimeEntry,
  listMyOvertimeEntries,
  getMyOvertimeSummary,
  updateMyOvertimeEntry,
  deleteMyOvertimeEntry,
} from '../controllers/overtimeController.js';

const router = Router();

router.use(authRequired);
router.get('/mine', listMyOvertimeEntries);
router.get('/mine/summary', getMyOvertimeSummary);
router.post('/', createOvertimeEntry);
router.patch('/:id', updateMyOvertimeEntry);
router.delete('/:id', deleteMyOvertimeEntry);

export default router;
