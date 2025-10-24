import { Router } from 'express';
import * as controller from './controller';
import { authenticateToken } from '../../shared/middleware/auth';
import { validateRequest, validateParams, validateQuery } from '../../shared/middleware/validation';
import {
  compressRequestSchema,
  compressedIdParamSchema,
  contentIdParamSchema,
  listVersionsQuerySchema
} from './schemas';

const router = Router();

/**
 * All routes require authentication
 */
router.use(authenticateToken);

/**
 * POST /api/v1/compression/compress
 * Compress content with a specified ratio
 *
 * Request body:
 * {
 *   contentId: string (uuid),
 *   ratio: number (0.1-0.9)
 * }
 */
router.post(
  '/compress',
  validateRequest(compressRequestSchema),
  controller.compressContent
);

/**
 * GET /api/v1/compression/versions/:contentId
 * List all compressed versions for a content item
 *
 * Query params:
 * - page: number (default: 1)
 * - limit: number (default: 20, max: 100)
 *
 * IMPORTANT: This route MUST come before /:compressedId to avoid route conflicts
 */
router.get(
  '/versions/:contentId',
  validateParams(contentIdParamSchema),
  validateQuery(listVersionsQuerySchema),
  controller.listCompressedVersions
);

/**
 * GET /api/v1/compression/:compressedId
 * Get a specific compressed content version
 *
 * Returns the full compressed text and metadata
 */
router.get(
  '/:compressedId',
  validateParams(compressedIdParamSchema),
  controller.getCompressedContent
);

/**
 * DELETE /api/v1/compression/:compressedId
 * Delete a compressed content version
 */
router.delete(
  '/:compressedId',
  validateParams(compressedIdParamSchema),
  controller.deleteCompressedContent
);

export default router;
