import { Request, Response } from 'express';
import { promises as fs } from 'fs';
import { query } from '../../config/database';
import { AuthRequest } from '../../shared/types';
import { successResponse, errorResponse } from '../../shared/utils/response';
import { AVAILABLE_VOICES } from '../../config/azure-tts';
import { convertTextToSpeech } from './ttsEngine';
import { uploadToS3, generateS3Key } from '../content/s3Client';
import { generateContentHash } from '../../shared/utils/hash';
import logger from '../../shared/utils/logger';
import audioQueue from './queue';

export async function convertToAudio(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;

    if (!userId) {
      errorResponse(res, 'User not authenticated', 401);
      return;
    }

    const { contentId, voiceId, config } = req.body;

    // Verify content exists and belongs to user
    const contentResult = await query(
      'SELECT id, text_content FROM content WHERE id = $1 AND user_id = $2',
      [contentId, userId]
    );

    if (contentResult.rows.length === 0) {
      errorResponse(res, 'Content not found', 404);
      return;
    }

    const content = contentResult.rows[0];

    // Check if a conversion job already exists for this content
    const existingJobResult = await query(
      `SELECT id, status, audio_cache_id
       FROM conversion_jobs
       WHERE content_id = $1 AND user_id = $2
       AND status IN ('pending', 'processing', 'completed')
       ORDER BY created_at DESC
       LIMIT 1`,
      [contentId, userId]
    );

    if (existingJobResult.rows.length > 0) {
      const existingJob = existingJobResult.rows[0];

      // If job is completed, return the audio cache info
      if (existingJob.status === 'completed' && existingJob.audio_cache_id) {
        const audioCacheResult = await query(
          'SELECT audio_url FROM audio_cache WHERE id = $1',
          [existingJob.audio_cache_id]
        );

        if (audioCacheResult.rows.length > 0) {
          successResponse(res, {
            jobId: existingJob.id,
            status: 'completed',
            audioUrl: audioCacheResult.rows[0].audio_url
          });
          return;
        }
      }

      // If job is pending or processing, return its status
      successResponse(res, {
        jobId: existingJob.id,
        status: existingJob.status,
        message: 'Conversion job already in progress'
      });
      return;
    }

    // Create new conversion job
    const jobResult = await query(
      `INSERT INTO conversion_jobs
        (content_id, user_id, status)
       VALUES ($1, $2, 'queued')
       RETURNING id`,
      [contentId, userId]
    );

    const jobId = jobResult.rows[0].id;
    const ttsConfig = config || { speed: 1.0, pitch: 0 };

    logger.info('Audio conversion job created', { jobId, contentId, userId });

    // Generate content hash for caching
    const contentHash = generateContentHash(content.text_content, voiceId, ttsConfig);

    // Check if audio already exists in cache
    const cacheResult = await query(
      'SELECT id, audio_url, duration_seconds FROM audio_cache WHERE content_hash = $1',
      [contentHash]
    );

    if (cacheResult.rows.length > 0) {
      const cachedAudio = cacheResult.rows[0];

      // Update cache access stats
      await query(
        'UPDATE audio_cache SET last_accessed_at = NOW(), access_count = access_count + 1 WHERE id = $1',
        [cachedAudio.id]
      );

      // Update job as completed
      await query(
        'UPDATE conversion_jobs SET status = $1, progress = $2, audio_cache_id = $3, completed_at = NOW() WHERE id = $4',
        ['completed', 100, cachedAudio.id, jobId]
      );

      logger.info('Using cached audio', { jobId, cacheId: cachedAudio.id });

      successResponse(res, {
        jobId,
        status: 'completed',
        audioUrl: cachedAudio.audio_url,
        durationSeconds: cachedAudio.duration_seconds,
        cached: true
      });
      return;
    }

    // Queue job for async processing
    await audioQueue.add({
      jobId,
      contentId,
      userId,
      text: content.text_content,
      voiceId,
      config: ttsConfig
    });

    logger.info('Audio conversion job queued', { jobId, contentId });

    successResponse(res, {
      jobId,
      status: 'queued',
      message: 'Audio conversion job queued for processing'
    });
  } catch (error) {
    logger.error('Convert to audio error', { error });
    errorResponse(res, 'Failed to start audio conversion', 500);
  }
}

export async function getJobStatus(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;
    const { jobId } = req.params;

    if (!userId) {
      errorResponse(res, 'User not authenticated', 401);
      return;
    }

    const result = await query(
      `SELECT
        cj.id,
        cj.status,
        cj.progress,
        cj.error_message,
        cj.created_at,
        cj.completed_at,
        ac.audio_url,
        ac.duration_seconds
       FROM conversion_jobs cj
       LEFT JOIN audio_cache ac ON cj.audio_cache_id = ac.id
       WHERE cj.id = $1 AND cj.user_id = $2`,
      [jobId, userId]
    );

    if (result.rows.length === 0) {
      errorResponse(res, 'Job not found', 404);
      return;
    }

    const job = result.rows[0];

    successResponse(res, {
      jobId: job.id,
      status: job.status,
      progress: job.progress,
      audioUrl: job.audio_url,
      durationSeconds: job.duration_seconds,
      errorMessage: job.error_message,
      createdAt: job.created_at,
      completedAt: job.completed_at
    });
  } catch (error) {
    logger.error('Get job status error', { error });
    errorResponse(res, 'Failed to fetch job status', 500);
  }
}

export async function getVoices(req: Request, res: Response): Promise<void> {
  try {
    successResponse(res, AVAILABLE_VOICES);
  } catch (error) {
    logger.error('Get voices error', { error });
    errorResponse(res, 'Failed to fetch voices', 500);
  }
}

export async function listJobs(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;

    if (!userId) {
      errorResponse(res, 'User not authenticated', 401);
      return;
    }

    const result = await query(
      `SELECT
        cj.id,
        cj.content_id,
        cj.status,
        cj.progress,
        cj.created_at,
        cj.completed_at,
        c.title as content_title
       FROM conversion_jobs cj
       JOIN content c ON cj.content_id = c.id
       WHERE cj.user_id = $1
       ORDER BY cj.created_at DESC
       LIMIT 50`,
      [userId]
    );

    successResponse(res, result.rows);
  } catch (error) {
    logger.error('List jobs error', { error });
    errorResponse(res, 'Failed to fetch jobs', 500);
  }
}
