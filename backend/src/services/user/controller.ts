import { Request, Response } from 'express';
import { query } from '../../config/database';
import { AuthRequest } from '../../shared/types';
import { successResponse, errorResponse, paginatedResponse } from '../../shared/utils/response';
import logger from '../../shared/utils/logger';

export async function getProfile(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;

    if (!userId) {
      errorResponse(res, 'User not authenticated', 401);
      return;
    }

    const result = await query(
      'SELECT id, email, name, created_at FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      errorResponse(res, 'User not found', 404);
      return;
    }

    successResponse(res, result.rows[0]);
  } catch (error) {
    logger.error('Get profile error', { error });
    errorResponse(res, 'Failed to fetch profile', 500);
  }
}

export async function updateProfile(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;

    if (!userId) {
      errorResponse(res, 'User not authenticated', 401);
      return;
    }

    const { name, email } = req.body;
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount}`);
      values.push(name);
      paramCount++;
    }

    if (email !== undefined) {
      // Check if email is already taken
      const existingUser = await query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [email, userId]
      );

      if (existingUser.rows.length > 0) {
        errorResponse(res, 'Email already in use', 409);
        return;
      }

      updates.push(`email = $${paramCount}`);
      values.push(email);
      paramCount++;
    }

    if (updates.length === 0) {
      errorResponse(res, 'No fields to update', 400);
      return;
    }

    values.push(userId);

    const result = await query(
      `UPDATE users SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${paramCount}
       RETURNING id, email, name, updated_at`,
      values
    );

    logger.info('Profile updated', { userId });

    successResponse(res, result.rows[0], 'Profile updated successfully');
  } catch (error) {
    logger.error('Update profile error', { error });
    errorResponse(res, 'Failed to update profile', 500);
  }
}

export async function getLibrary(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;

    if (!userId) {
      errorResponse(res, 'User not authenticated', 401);
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const favorites = req.query.favorites === 'true';
    const offset = (page - 1) * limit;

    let queryText = `
      SELECT
        c.id,
        c.title,
        c.author,
        c.type,
        c.word_count,
        c.created_at,
        ul.is_favorite,
        ul.added_at,
        pp.position_seconds,
        pp.duration_seconds,
        pp.completed
      FROM user_library ul
      JOIN content c ON ul.content_id = c.id
      LEFT JOIN playback_progress pp ON pp.content_id = c.id AND pp.user_id = ul.user_id
      WHERE ul.user_id = $1
    `;
    const queryParams: any[] = [userId];

    if (favorites) {
      queryText += ' AND ul.is_favorite = true';
    }

    queryText += ` ORDER BY ul.added_at DESC LIMIT $2 OFFSET $3`;
    queryParams.push(limit, offset);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM user_library WHERE user_id = $1';
    const countParams: any[] = [userId];

    if (favorites) {
      countQuery += ' AND is_favorite = true';
    }

    const [libraryResult, countResult] = await Promise.all([
      query(queryText, queryParams),
      query(countQuery, countParams)
    ]);

    const total = parseInt(countResult.rows[0].count, 10);

    paginatedResponse(res, libraryResult.rows, page, limit, total);
  } catch (error) {
    logger.error('Get library error', { error });
    errorResponse(res, 'Failed to fetch library', 500);
  }
}

export async function addToLibrary(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;

    if (!userId) {
      errorResponse(res, 'User not authenticated', 401);
      return;
    }

    const { contentId } = req.body;

    // Check if content exists and belongs to user
    const contentResult = await query(
      'SELECT id FROM content WHERE id = $1 AND user_id = $2',
      [contentId, userId]
    );

    if (contentResult.rows.length === 0) {
      errorResponse(res, 'Content not found', 404);
      return;
    }

    // Add to library (or update if already exists)
    await query(
      `INSERT INTO user_library (user_id, content_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, content_id) DO NOTHING`,
      [userId, contentId]
    );

    logger.info('Content added to library', { userId, contentId });

    successResponse(res, null, 'Added to library', 201);
  } catch (error) {
    logger.error('Add to library error', { error });
    errorResponse(res, 'Failed to add to library', 500);
  }
}

export async function removeFromLibrary(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;
    const { contentId } = req.params;

    if (!userId) {
      errorResponse(res, 'User not authenticated', 401);
      return;
    }

    const result = await query(
      'DELETE FROM user_library WHERE user_id = $1 AND content_id = $2 RETURNING id',
      [userId, contentId]
    );

    if (result.rows.length === 0) {
      errorResponse(res, 'Content not in library', 404);
      return;
    }

    logger.info('Content removed from library', { userId, contentId });

    successResponse(res, null, 'Removed from library');
  } catch (error) {
    logger.error('Remove from library error', { error });
    errorResponse(res, 'Failed to remove from library', 500);
  }
}

export async function toggleFavorite(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;
    const { contentId } = req.params;

    if (!userId) {
      errorResponse(res, 'User not authenticated', 401);
      return;
    }

    const result = await query(
      `UPDATE user_library
       SET is_favorite = NOT is_favorite
       WHERE user_id = $1 AND content_id = $2
       RETURNING is_favorite`,
      [userId, contentId]
    );

    if (result.rows.length === 0) {
      errorResponse(res, 'Content not in library', 404);
      return;
    }

    logger.info('Favorite toggled', { userId, contentId, isFavorite: result.rows[0].is_favorite });

    successResponse(res, { isFavorite: result.rows[0].is_favorite });
  } catch (error) {
    logger.error('Toggle favorite error', { error });
    errorResponse(res, 'Failed to toggle favorite', 500);
  }
}

export async function updateProgress(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;
    const { contentId } = req.params;

    if (!userId) {
      errorResponse(res, 'User not authenticated', 401);
      return;
    }

    const { positionSeconds, durationSeconds, completed } = req.body;

    // Upsert playback progress
    await query(
      `INSERT INTO playback_progress
        (user_id, content_id, position_seconds, duration_seconds, completed)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, content_id)
       DO UPDATE SET
         position_seconds = $3,
         duration_seconds = $4,
         completed = COALESCE($5, playback_progress.completed),
         updated_at = NOW()`,
      [userId, contentId, positionSeconds, durationSeconds, completed || false]
    );

    logger.debug('Progress updated', { userId, contentId, positionSeconds });

    successResponse(res, null, 'Progress updated');
  } catch (error) {
    logger.error('Update progress error', { error });
    errorResponse(res, 'Failed to update progress', 500);
  }
}

export async function getProgress(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;
    const { contentId } = req.params;

    if (!userId) {
      errorResponse(res, 'User not authenticated', 401);
      return;
    }

    const result = await query(
      `SELECT position_seconds, duration_seconds, completed, updated_at
       FROM playback_progress
       WHERE user_id = $1 AND content_id = $2`,
      [userId, contentId]
    );

    if (result.rows.length === 0) {
      successResponse(res, {
        positionSeconds: 0,
        durationSeconds: 0,
        completed: false
      });
      return;
    }

    successResponse(res, {
      positionSeconds: result.rows[0].position_seconds,
      durationSeconds: result.rows[0].duration_seconds,
      completed: result.rows[0].completed,
      updatedAt: result.rows[0].updated_at
    });
  } catch (error) {
    logger.error('Get progress error', { error });
    errorResponse(res, 'Failed to fetch progress', 500);
  }
}
