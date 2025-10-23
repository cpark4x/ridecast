import { Router } from 'express';
import * as controller from './controller';
import { authenticateToken } from '../../shared/middleware/auth';
import { validateRequest, validateQuery, validateParams } from '../../shared/middleware/validation';
import {
  updateProfileSchema,
  addToLibrarySchema,
  updateProgressSchema,
  contentIdParamSchema,
  libraryQuerySchema
} from './schemas';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Profile routes
router.get('/profile', controller.getProfile);
router.put('/profile', validateRequest(updateProfileSchema), controller.updateProfile);

// Library routes
router.get('/library', validateQuery(libraryQuerySchema), controller.getLibrary);
router.post('/library', validateRequest(addToLibrarySchema), controller.addToLibrary);
router.delete(
  '/library/:contentId',
  validateParams(contentIdParamSchema),
  controller.removeFromLibrary
);
router.post(
  '/library/:contentId/favorite',
  validateParams(contentIdParamSchema),
  controller.toggleFavorite
);

// Playback progress routes
router.get(
  '/progress/:contentId',
  validateParams(contentIdParamSchema),
  controller.getProgress
);
router.put(
  '/progress/:contentId',
  validateParams(contentIdParamSchema),
  validateRequest(updateProgressSchema),
  controller.updateProgress
);

export default router;
