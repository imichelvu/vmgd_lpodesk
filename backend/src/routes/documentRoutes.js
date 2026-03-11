/**
 * Author: Igor Michel
 * Purpose: Routes for document upload and retrieval tied to procurement requests.
 * Last updated: 2026-03-11
 */
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { authRequired } from '../middleware/auth.js';
import { upload, listByRequest } from '../controllers/documentController.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '..', '..', 'uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('File type not allowed'), false);
};

const multerUpload = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });

const router = Router();

router.use(authRequired);

router.post('/upload', multerUpload.single('file'), upload);
router.get('/request/:requestId', listByRequest);

export default router;
