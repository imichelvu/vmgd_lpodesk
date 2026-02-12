import { Router } from 'express';
import { list, create, update, remove } from '../controllers/delegationsController.js';
import { authRequired } from '../middleware/auth.js';
import { checkRole, ROLE_IDS } from '../middleware/checkRole.js';

const router = Router();

router.use(authRequired);
router.use(checkRole(ROLE_IDS.Admin));

router.get('/', list);
router.post('/', create);
router.patch('/:id', update);
router.delete('/:id', remove);

export default router;
