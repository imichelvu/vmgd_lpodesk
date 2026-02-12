import { Router } from 'express';
import {
  create,
  listMine,
  listForSupervisor,
  listForDirector,
  getById,
  approveOrDisapprove,
  resendPendingNotifications,
} from '../controllers/leaveController.js';
import { authRequired } from '../middleware/auth.js';
import { checkRole, ROLE_IDS } from '../middleware/checkRole.js';

const router = Router();

router.use(authRequired);

router.post('/', create);
router.get('/mine', listMine);
router.get('/supervisor', checkRole([ROLE_IDS.PSO, ROLE_IDS.Manager]), listForSupervisor);
router.get('/director', checkRole(ROLE_IDS.Director), listForDirector);
router.post('/resend-pending-notifications', checkRole(ROLE_IDS.Admin), resendPendingNotifications);
router.get('/:id', getById);
router.patch('/:id/approve', checkRole([ROLE_IDS.PSO, ROLE_IDS.Manager, ROLE_IDS.Director]), approveOrDisapprove);

export default router;
