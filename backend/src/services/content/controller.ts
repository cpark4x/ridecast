import { Request, Response } from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { query } from '../../config/database';
import { AuthRequest } from '../../shared/types';
import { successResponse, errorResponse, paginatedResponse } from '../../shared/utils/response';
import { generateTextHash } from '../../shared/utils/hash';
import { extractText } from './textExtractor';
import { uploadToS3, generateS3Key } from './s3Client';
import logger from '../../shared/utils/logger';

export async function uploadContent(req: Request, res: Response): Promise<void> {
  const tempFilePath = req.file?.path;

  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;

    if (!userId) {
      errorResponse(res, 'User not authenticated', 401);
      return;
    }

    if (!req.file) {
      errorResponse(res, 'No file uploaded', 400);
      return;
    }

    const { title, author, type } = req.body;
    const fileExtension = path.extname(req.file.originalname).slice(1).toLowerCase();

    // Extract text from file
    logger.info('Extracting text from file', {
      filename: req.file.originalname,
      type: fileExtension
    });

    const extracted = await extractText(req.file.path, fileExtension);

    // Use extracted or provided metadata
    const contentTitle = title || extracted.title || req.file.originalname;
    const contentAuthor = author || extracted.author || null;
    const contentType = type || fileExtension;

    // Generate text hash for deduplication
    const textHash = generateTextHash(extracted.text);

    // Check if content with same hash already exists for this user
    const existingContent = await query(
      'SELECT id FROM content WHERE user_id = $1 AND text_hash = $2',
      [userId, textHash]
    );

    if (existingContent.rows.length > 0) {
      // Clean up uploaded file
      await fs.unlink(req.file.path);
      errorResponse(res, 'This content already exists in your library', 409);
      return;
    }

    // Upload source file to S3
    const s3Key = generateS3Key(userId, req.file.originalname, 'content');
    const sourceFileUrl = await uploadToS3(
      req.file.path,
      s3Key,
      req.file.mimetype
    );

    // Save content to database
    const result = await query(
      `INSERT INTO content
        (user_id, title, author, type, text_content, text_hash, source_file_url, file_size_bytes, word_count)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, title, author, type, word_count, created_at`,
      [
        userId,
        contentTitle,
        contentAuthor,
        contentType,
        extracted.text,
        textHash,
        sourceFileUrl,
        req.file.size,
        extracted.wordCount
      ]
    );

    const content = result.rows[0];

    // Clean up temporary file
    await fs.unlink(req.file.path);

    logger.info('Content uploaded', { contentId: content.id, userId });

    successResponse(res, content, 'Content uploaded successfully', 201);
  } catch (error) {
    logger.error('Content upload error', { error });

    // Clean up temp file on error
    if (tempFilePath) {
      try {
        await fs.unlink(tempFilePath);
      } catch (unlinkError) {
        logger.warn('Failed to clean up temp file', { unlinkError });
      }
    }

    errorResponse(res, 'Failed to upload content', 500);
  }
}

export async function getContent(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;
    const { id } = req.params;

    if (!userId) {
      errorResponse(res, 'User not authenticated', 401);
      return;
    }

    const result = await query(
      `SELECT id, title, author, type, text_content, word_count, created_at
       FROM content
       WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      errorResponse(res, 'Content not found', 404);
      return;
    }

    // Transform snake_case to camelCase for frontend
    const row = result.rows[0];
    const transformedContent = {
      id: row.id,
      title: row.title,
      author: row.author,
      type: row.type,
      textContent: row.text_content,
      wordCount: row.word_count,
      createdAt: row.created_at
    };

    successResponse(res, transformedContent);
  } catch (error) {
    logger.error('Get content error', { error });
    errorResponse(res, 'Failed to fetch content', 500);
  }
}

export async function listContent(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;

    if (!userId) {
      errorResponse(res, 'User not authenticated', 401);
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const type = req.query.type as string;
    const offset = (page - 1) * limit;

    let queryText = `
      SELECT
        c.id,
        c.title,
        c.author,
        c.type,
        c.word_count,
        c.created_at,
        ac.audio_url,
        ac.duration_seconds,
        cj.id as conversion_job_id
      FROM content c
      LEFT JOIN LATERAL (
        SELECT id, audio_cache_id
        FROM conversion_jobs
        WHERE content_id = c.id AND user_id = $1 AND status = 'completed'
        ORDER BY created_at DESC
        LIMIT 1
      ) cj ON true
      LEFT JOIN audio_cache ac ON cj.audio_cache_id = ac.id
      WHERE c.user_id = $1
    `;
    const queryParams: any[] = [userId];

    if (type) {
      queryText += ` AND c.type = $2`;
      queryParams.push(type);
    }

    queryText += ` ORDER BY c.created_at DESC LIMIT $${queryParams.length + 1} OFFSET $${
      queryParams.length + 2
    }`;
    queryParams.push(limit, offset);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM content WHERE user_id = $1';
    const countParams: any[] = [userId];

    if (type) {
      countQuery += ' AND type = $2';
      countParams.push(type);
    }

    const [contentResult, countResult] = await Promise.all([
      query(queryText, queryParams),
      query(countQuery, countParams)
    ]);

    const total = parseInt(countResult.rows[0].count, 10);

    // Transform snake_case to camelCase for frontend
    const transformedContent = contentResult.rows.map((row: any) => ({
      id: row.id,
      title: row.title,
      author: row.author,
      type: row.type,
      wordCount: row.word_count,
      createdAt: row.created_at,
      audioUrl: row.audio_url || undefined,
      durationSeconds: row.duration_seconds || undefined
    }));

    paginatedResponse(res, transformedContent, page, limit, total);
  } catch (error) {
    logger.error('List content error', { error });
    errorResponse(res, 'Failed to fetch content list', 500);
  }
}

export async function deleteContent(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;
    const { id } = req.params;

    if (!userId) {
      errorResponse(res, 'User not authenticated', 401);
      return;
    }

    const result = await query(
      'DELETE FROM content WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );

    if (result.rows.length === 0) {
      errorResponse(res, 'Content not found', 404);
      return;
    }

    logger.info('Content deleted', { contentId: id, userId });

    successResponse(res, null, 'Content deleted successfully');
  } catch (error) {
    logger.error('Delete content error', { error });
    errorResponse(res, 'Failed to delete content', 500);
  }
}
