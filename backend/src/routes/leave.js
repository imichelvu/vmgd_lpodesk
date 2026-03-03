import { Router } from 'express';
import {
  create,
  listBalances,
  listMine,
  listMineHistory,
  listForSupervisor,
  listForDirector,
  listSupervisorHistory,
  listDirectorHistory,
  getById,
  approveOrDisapprove,
  resendPendingNotifications,
  getRecentActionsCount,
  getLeaveTypes,
} from '../controllers/leaveController.js';
import { authRequired } from '../middleware/auth.js';
import { checkRole, ROLE_IDS } from '../middleware/checkRole.js';

const router = Router();

router.use(authRequired);

router.post('/', create);
router.get('/balances', listBalances);
router.get('/mine', listMine);
router.get('/mine/history', listMineHistory);
router.get('/supervisor', checkRole([ROLE_IDS.PSO, ROLE_IDS.Manager]), listForSupervisor);
router.get('/director', checkRole(ROLE_IDS.Director), listForDirector);
router.get('/supervisor/history', checkRole([ROLE_IDS.PSO, ROLE_IDS.Manager]), listSupervisorHistory);
router.get('/director/history', checkRole(ROLE_IDS.Director), listDirectorHistory);
router.post('/resend-pending-notifications', checkRole(ROLE_IDS.Admin), resendPendingNotifications);
router.get('/types', getLeaveTypes);
router.get('/:id', getById);
router.patch('/:id/approve', checkRole([ROLE_IDS.PSO, ROLE_IDS.Manager, ROLE_IDS.Director]), approveOrDisapprove);
router.get('/recent-actions-count', getRecentActionsCount);

export default router;
