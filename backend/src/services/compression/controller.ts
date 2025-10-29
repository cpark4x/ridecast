import { Request, Response } from 'express';
import { AuthRequest } from '../../shared/types';
import { successResponse, errorResponse, paginatedResponse } from '../../shared/utils/response';
import * as compressionService from './compressionService';
import logger from '../../shared/utils/logger';

/**
 * HTTP request handlers for compression endpoints
 */

/**
 * POST /api/v1/compression/compress
 * Compress content with a specified ratio
 */
export async function compressContent(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;

    if (!userId) {
      errorResponse(res, 'User not authenticated', 401);
      return;
    }

    const { contentId, ratio } = req.body;

    // Validate ratio range
    if (ratio < 0.1 || ratio > 0.9) {
      errorResponse(res, 'Compression ratio must be between 0.1 and 0.9', 400);
      return;
    }

    logger.info('Compression request', { userId, contentId, ratio });

    const compressed = await compressionService.compressContent(userId, {
      contentId,
      ratio
    });

    // Return compressed content without the full text (can be fetched separately)
    // Transform to camelCase for frontend
    const response = {
      compressedContentId: compressed.id,
      originalWordCount: compressed.original_word_count,
      compressedWordCount: compressed.compressed_word_count,
      compressionRatio: compressed.compression_ratio,
      processingTimeMs: compressed.processing_time_ms,
      qualityScore: compressed.quality_score,
      createdAt: compressed.created_at,
      accessCount: compressed.access_count
    };

    successResponse(res, response, 'Content compressed successfully', 201);
  } catch (error) {
    logger.error('Compress content error', { error });

    if (error instanceof Error) {
      if (error.message.includes('not found') || error.message.includes('access denied')) {
        errorResponse(res, error.message, 404);
        return;
      }
      if (error.message.includes('Failed to execute compression')) {
        errorResponse(res, 'Compression service failed. Please try again later.', 503);
        return;
      }
    }

    errorResponse(res, 'Failed to compress content', 500);
  }
}

/**
 * GET /api/v1/compression/:compressedId
 * Get a specific compressed content version
 */
export async function getCompressedContent(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;

    if (!userId) {
      errorResponse(res, 'User not authenticated', 401);
      return;
    }

    const { compressedId } = req.params;

    const compressed = await compressionService.getCompressedContent(compressedId, userId);

    if (!compressed) {
      errorResponse(res, 'Compressed content not found', 404);
      return;
    }

    successResponse(res, compressed);
  } catch (error) {
    logger.error('Get compressed content error', { error });
    errorResponse(res, 'Failed to fetch compressed content', 500);
  }
}

/**
 * GET /api/v1/compression/versions/:contentId
 * List all compressed versions for a content item
 */
export async function listCompressedVersions(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;

    if (!userId) {
      errorResponse(res, 'User not authenticated', 401);
      return;
    }

    const { contentId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await compressionService.listCompressedVersions(
      contentId,
      userId,
      page,
      limit
    );

    paginatedResponse(res, result.data, page, limit, result.total);
  } catch (error) {
    logger.error('List compressed versions error', { error });

    if (error instanceof Error &&
        (error.message.includes('not found') || error.message.includes('access denied'))) {
      errorResponse(res, error.message, 404);
      return;
    }

    errorResponse(res, 'Failed to fetch compressed versions', 500);
  }
}

/**
 * DELETE /api/v1/compression/:compressedId
 * Delete a compressed content version
 */
export async function deleteCompressedContent(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;

    if (!userId) {
      errorResponse(res, 'User not authenticated', 401);
      return;
    }

    const { compressedId } = req.params;

    const deleted = await compressionService.deleteCompressedContent(compressedId, userId);

    if (!deleted) {
      errorResponse(res, 'Compressed content not found', 404);
      return;
    }

    logger.info('Compressed content deleted', { compressedId, userId });

    successResponse(res, null, 'Compressed content deleted successfully');
  } catch (error) {
    logger.error('Delete compressed content error', { error });
    errorResponse(res, 'Failed to delete compressed content', 500);
  }
}
