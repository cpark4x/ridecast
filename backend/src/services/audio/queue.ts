import Queue from 'bull';
import { promises as fs } from 'fs';
import path from 'path';
import redis from '../../config/redis';
import { query } from '../../config/database';
import { TTSConfig } from '../../shared/types';
import { generateContentHash } from '../../shared/utils/hash';
import { convertTextToSpeech } from './ttsEngine';
import { uploadToS3, generateS3Key } from '../content/s3Client';
import logger from '../../shared/utils/logger';

export interface AudioConversionJobData {
  jobId: string;
  contentId: string;
  userId: string;
  text: string;
  voiceId: string;
  config: TTSConfig;
}

// Parse Redis URL for Bull queue (Bull doesn't support rediss:// URLs directly)
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redisConfig = redisUrl.startsWith('rediss://')
  ? {
      // Parse rediss:// URL manually for TLS support
      host: new URL(redisUrl).hostname,
      port: parseInt(new URL(redisUrl).port || '6379', 10),
      password: new URL(redisUrl).password || undefined,
      tls: {
        rejectUnauthorized: false
      }
    }
  : redisUrl;

// Create Bull queue
const audioQueue = new Queue<AudioConversionJobData>('audio-conversion', redisConfig);

// Process audio conversion jobs
audioQueue.process(async (job) => {
  const { jobId, contentId, userId, text, voiceId, config } = job.data;

  logger.info('Processing audio conversion job', { jobId, contentId });

  try {
    // Update job status to processing
    await query(
      'UPDATE conversion_jobs SET status = $1, progress = $2 WHERE id = $3',
      ['processing', 10, jobId]
    );

    // Generate content hash for caching
    const contentHash = generateContentHash(text, voiceId, config);

    // Check if audio already exists in cache
    const cacheResult = await query(
      'SELECT id, audio_url, duration_seconds, file_size_bytes FROM audio_cache WHERE content_hash = $1',
      [contentHash]
    );

    if (cacheResult.rows.length > 0) {
      const cachedAudio = cacheResult.rows[0];

      logger.info('Using cached audio', { jobId, cacheId: cachedAudio.id });

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

      return {
        jobId,
        audioUrl: cachedAudio.audio_url,
        cached: true
      };
    }

    // Generate audio using Azure TTS
    await query('UPDATE conversion_jobs SET progress = $1 WHERE id = $2', [30, jobId]);

    const tempPath = `/tmp/audio-${jobId}.mp3`;
    const result = await convertTextToSpeech(text, {
      voiceId,
      config,
      outputPath: tempPath
    });

    await query('UPDATE conversion_jobs SET progress = $1 WHERE id = $2', [70, jobId]);

    // Upload to S3
    const s3Key = generateS3Key(userId, `${contentId}.mp3`, 'audio');
    const audioUrl = await uploadToS3(tempPath, s3Key, 'audio/mpeg');

    await query('UPDATE conversion_jobs SET progress = $1 WHERE id = $2', [90, jobId]);

    // Save to audio cache
    const audioCacheResult = await query(
      `INSERT INTO audio_cache
        (content_hash, voice_id, audio_url, duration_seconds, file_size_bytes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [contentHash, voiceId, audioUrl, result.durationSeconds, result.fileSizeBytes]
    );

    const audioCacheId = audioCacheResult.rows[0].id;

    // Update job as completed
    await query(
      'UPDATE conversion_jobs SET status = $1, progress = $2, audio_cache_id = $3, completed_at = NOW() WHERE id = $4',
      ['completed', 100, audioCacheId, jobId]
    );

    // Clean up temp file
    await fs.unlink(tempPath);

    logger.info('Audio conversion completed', {
      jobId,
      audioCacheId,
      durationSeconds: result.durationSeconds
    });

    return {
      jobId,
      audioUrl,
      cached: false
    };
  } catch (error) {
    logger.error('Audio conversion job failed', { jobId, error });

    // Update job as failed
    await query(
      'UPDATE conversion_jobs SET status = $1, error_message = $2 WHERE id = $3',
      ['failed', error instanceof Error ? error.message : 'Unknown error', jobId]
    );

    throw error;
  }
});

// Queue event handlers
audioQueue.on('completed', (job, result) => {
  logger.info('Job completed', { jobId: job.data.jobId, result });
});

audioQueue.on('failed', (job, err) => {
  logger.error('Job failed', { jobId: job?.data.jobId, error: err });
});

audioQueue.on('stalled', (job) => {
  logger.warn('Job stalled', { jobId: job.data.jobId });
});

export default audioQueue;
