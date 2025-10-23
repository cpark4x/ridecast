import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import * as controller from './controller';
import { authenticateToken } from '../../shared/middleware/auth';
import { validateQuery, validateParams } from '../../shared/middleware/validation';
import { getContentQuerySchema, contentIdParamSchema } from './schemas';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, '/tmp/uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.epub', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, EPUB, and TXT files are allowed'));
    }
  }
});

// All routes require authentication
router.use(authenticateToken);

// Content routes
router.post('/upload', upload.single('file'), controller.uploadContent);
router.get('/', validateQuery(getContentQuerySchema), controller.listContent);
router.get('/:id', validateParams(contentIdParamSchema), controller.getContent);
router.delete('/:id', validateParams(contentIdParamSchema), controller.deleteContent);

export default router;
