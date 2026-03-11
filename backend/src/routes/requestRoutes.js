/**
 * Author: Igor Michel
 * Purpose: Routes for procurement request creation, retrieval, and submission.
 * Last updated: 2026-03-11
 */
import { Router } from 'express';
import { authRequired } from '../middleware/auth.js';
import { create, getById, listMine, listAll, submit } from '../controllers/requestController.js';

const router = Router();

router.use(authRequired);

router.post('/', create);
router.get('/mine', listMine);
router.get('/pending', listAll);
router.get('/:id', getById);
router.post('/:id/submit', submit);

export default router;
