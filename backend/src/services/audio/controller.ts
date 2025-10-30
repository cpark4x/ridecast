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

    const { contentId, voiceId, config, isCompressed } = req.body;

    let textContent: string;
    let actualContentId = contentId;
    let parentContentId = contentId; // For conversion_jobs foreign key

    // Check if this is compressed content
    if (isCompressed) {
      const compressedResult = await query(
        'SELECT compressed_text, parent_content_id FROM compressed_content WHERE id = $1 AND user_id = $2',
        [contentId, userId]
      );

      if (compressedResult.rows.length === 0) {
        errorResponse(res, 'Compressed content not found', 404);
        return;
      }

      textContent = compressedResult.rows[0].compressed_text;
      parentContentId = compressedResult.rows[0].parent_content_id; // Use parent for DB foreign key
      actualContentId = contentId; // Keep compressed ID for response
    } else {
      // Verify regular content exists and belongs to user
      const contentResult = await query(
        'SELECT id, text_content FROM content WHERE id = $1 AND user_id = $2',
        [contentId, userId]
      );

      if (contentResult.rows.length === 0) {
        errorResponse(res, 'Content not found', 404);
        return;
      }

      textContent = contentResult.rows[0].text_content;
    }

    const content = { id: actualContentId, text_content: textContent };

    // Check if a conversion job already exists for this content
    // Skip cache check for compressed content since it has different text
    if (!isCompressed) {
      const existingJobResult = await query(
        `SELECT id, status, audio_cache_id
         FROM conversion_jobs
         WHERE content_id = $1 AND user_id = $2
         AND status IN ('pending', 'processing', 'completed')
         ORDER BY created_at DESC
         LIMIT 1`,
        [parentContentId, userId]
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
    }

    // Create new conversion job
    const jobResult = await query(
      `INSERT INTO conversion_jobs
        (content_id, user_id, status)
       VALUES ($1, $2, 'queued')
       RETURNING id`,
      [parentContentId, userId]
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

export async function getVoices(_req: Request, res: Response): Promise<void> {
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

export async function previewVoice(req: Request, res: Response): Promise<void> {
  const tempFilePath = `${process.cwd()}/temp/preview_${Date.now()}.mp3`;

  try {
    const { voiceId } = req.params;

    // Validate voice ID
    const voice = AVAILABLE_VOICES.find(v => v.id === voiceId);
    if (!voice) {
      errorResponse(res, 'Invalid voice ID', 400);
      return;
    }

    // Sample text for preview (gender-specific)
    const sampleTexts = {
      male: "Hello, I'm a professional voice for your audiobooks. I speak clearly and naturally, perfect for long listening sessions.",
      female: "Hi there! I'm here to bring your stories to life. My voice is warm and engaging, ideal for your favorite books."
    };

    const sampleText = voice.gender === 'Male'
      ? sampleTexts.male
      : sampleTexts.female;

    // Generate content hash for caching
    const contentHash = generateContentHash(sampleText, voiceId, { speed: 1.0, pitch: 0 });

    // Check cache first
    const cacheResult = await query(
      'SELECT audio_url FROM audio_cache WHERE content_hash = $1',
      [contentHash]
    );

    if (cacheResult.rows.length > 0) {
      const cachedAudio = cacheResult.rows[0];

      // Update cache access stats
      await query(
        'UPDATE audio_cache SET last_accessed_at = NOW(), access_count = access_count + 1 WHERE content_hash = $1',
        [contentHash]
      );

      logger.info('Using cached preview', { voiceId });
      successResponse(res, { audioUrl: cachedAudio.audio_url, cached: true });
      return;
    }

    // Generate preview audio
    logger.info('Generating voice preview', { voiceId });

    // Ensure temp directory exists
    await fs.mkdir(`${process.cwd()}/temp`, { recursive: true });

    const result = await convertTextToSpeech(sampleText, {
      voiceId,
      config: { speed: 1.0, pitch: 0 },
      outputPath: tempFilePath
    });

    // Upload to S3
    const s3Key = generateS3Key('previews', `${voiceId}.mp3`, 'audio');
    const audioUrl = await uploadToS3(tempFilePath, s3Key, 'audio/mpeg');

    // Cache the preview
    await query(
      `INSERT INTO audio_cache
        (content_hash, audio_url, duration_seconds, file_size_bytes, voice_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [contentHash, audioUrl, result.durationSeconds, result.fileSizeBytes, voiceId]
    );

    // Clean up temp file
    await fs.unlink(tempFilePath);

    logger.info('Voice preview generated', { voiceId, audioUrl });
    successResponse(res, { audioUrl, cached: false });
  } catch (error) {
    logger.error('Preview voice error', { error });

    // Clean up temp file on error
    try {
      await fs.unlink(tempFilePath);
    } catch {}

    errorResponse(res, 'Failed to generate voice preview', 500);
  }
}
