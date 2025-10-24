import { query } from '../../config/database';
import { executeCompression } from './amplifierClient';
import { CompressedContent, CompressRequest } from './types';
import logger from '../../shared/utils/logger';

/**
 * Core business logic for compression operations
 */

/**
 * Find existing compressed content for a given content and ratio
 */
export async function findExistingCompressed(
  contentId: string,
  userId: string,
  ratio: number
): Promise<CompressedContent | null> {
  try {
    const result = await query(
      `SELECT * FROM compressed_content
       WHERE parent_content_id = $1
         AND user_id = $2
         AND compression_ratio = $3`,
      [contentId, userId, ratio]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0] as CompressedContent;
  } catch (error) {
    logger.error('Error finding existing compressed content', { error, contentId, ratio });
    throw error;
  }
}

/**
 * Compress content using the amplifier CLI
 */
export async function compressContent(
  userId: string,
  request: CompressRequest
): Promise<CompressedContent> {
  const { contentId, ratio } = request;

  try {
    // Check if compression already exists
    const existing = await findExistingCompressed(contentId, userId, ratio);
    if (existing) {
      logger.info('Returning existing compressed content', {
        compressedId: existing.id,
        contentId,
        ratio
      });

      // Update access tracking
      await updateAccessTracking(existing.id);

      return existing;
    }

    // Fetch the original content
    const contentResult = await query(
      `SELECT id, text_content, word_count
       FROM content
       WHERE id = $1 AND user_id = $2`,
      [contentId, userId]
    );

    if (contentResult.rows.length === 0) {
      throw new Error('Content not found or access denied');
    }

    const content = contentResult.rows[0];

    // Execute compression
    logger.info('Starting compression', { contentId, ratio, wordCount: content.word_count });

    const compressionResult = await executeCompression({
      ratio,
      inputText: content.text_content
    });

    // Save compressed content to database
    const insertResult = await query(
      `INSERT INTO compressed_content
        (parent_content_id, user_id, compression_ratio, compressed_text,
         original_word_count, compressed_word_count, processing_time_ms, quality_score)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        contentId,
        userId,
        ratio,
        compressionResult.compressed_text,
        compressionResult.metadata.original_word_count,
        compressionResult.metadata.compressed_word_count,
        compressionResult.metadata.processing_time_ms,
        compressionResult.metadata.quality_score || null
      ]
    );

    const compressedContent = insertResult.rows[0] as CompressedContent;

    logger.info('Compression saved', {
      compressedId: compressedContent.id,
      originalWords: compressedContent.original_word_count,
      compressedWords: compressedContent.compressed_word_count
    });

    return compressedContent;
  } catch (error) {
    logger.error('Compression failed', { error, contentId, ratio });
    throw error;
  }
}

/**
 * Get compressed content by ID
 */
export async function getCompressedContent(
  compressedId: string,
  userId: string
): Promise<CompressedContent | null> {
  try {
    const result = await query(
      `SELECT * FROM compressed_content
       WHERE id = $1 AND user_id = $2`,
      [compressedId, userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const compressed = result.rows[0] as CompressedContent;

    // Update access tracking
    await updateAccessTracking(compressedId);

    return compressed;
  } catch (error) {
    logger.error('Error getting compressed content', { error, compressedId });
    throw error;
  }
}

/**
 * List all compressed versions for a content item
 */
export async function listCompressedVersions(
  contentId: string,
  userId: string,
  page: number = 1,
  limit: number = 20
): Promise<{ data: CompressedContent[]; total: number }> {
  try {
    const offset = (page - 1) * limit;

    // Verify user owns the content
    const ownerCheck = await query(
      'SELECT id FROM content WHERE id = $1 AND user_id = $2',
      [contentId, userId]
    );

    if (ownerCheck.rows.length === 0) {
      throw new Error('Content not found or access denied');
    }

    // Get compressed versions
    const [versionsResult, countResult] = await Promise.all([
      query(
        `SELECT * FROM compressed_content
         WHERE parent_content_id = $1 AND user_id = $2
         ORDER BY created_at DESC
         LIMIT $3 OFFSET $4`,
        [contentId, userId, limit, offset]
      ),
      query(
        `SELECT COUNT(*) FROM compressed_content
         WHERE parent_content_id = $1 AND user_id = $2`,
        [contentId, userId]
      )
    ]);

    return {
      data: versionsResult.rows as CompressedContent[],
      total: parseInt(countResult.rows[0].count, 10)
    };
  } catch (error) {
    logger.error('Error listing compressed versions', { error, contentId });
    throw error;
  }
}

/**
 * Delete a compressed version
 */
export async function deleteCompressedContent(
  compressedId: string,
  userId: string
): Promise<boolean> {
  try {
    const result = await query(
      'DELETE FROM compressed_content WHERE id = $1 AND user_id = $2 RETURNING id',
      [compressedId, userId]
    );

    if (result.rows.length === 0) {
      return false;
    }

    logger.info('Compressed content deleted', { compressedId, userId });
    return true;
  } catch (error) {
    logger.error('Error deleting compressed content', { error, compressedId });
    throw error;
  }
}

/**
 * Update access tracking for a compressed content item
 */
async function updateAccessTracking(compressedId: string): Promise<void> {
  try {
    await query(
      `UPDATE compressed_content
       SET accessed_at = CURRENT_TIMESTAMP,
           access_count = access_count + 1
       WHERE id = $1`,
      [compressedId]
    );
  } catch (error) {
    logger.warn('Failed to update access tracking', { error, compressedId });
    // Don't throw - this is non-critical
  }
}
