import { Router } from 'express';
import {
  list,
  getById,
  create,
  update,
  remove,
  removeBulk,
  listRoles,
  listDivisions,
  testSmtp,
  syncFromAd,
  importAdUsers,
} from '../controllers/usersController.js';
import { authRequired } from '../middleware/auth.js';
import { checkRole, ROLE_IDS } from '../middleware/checkRole.js';

const router = Router();

router.get('/divisions', listDivisions);

router.use(authRequired);
router.use(checkRole(ROLE_IDS.Admin));
router.get('/roles', listRoles);
router.post('/test-smtp', testSmtp);
router.post('/sync-ad', syncFromAd);
router.post('/import-ad-users', importAdUsers);
router.post('/bulk-delete', removeBulk);
router.get('/', list);
router.get('/:id', getById);
router.post('/', create);
router.patch('/:id', update);
router.delete('/:id', remove);

export default router;
