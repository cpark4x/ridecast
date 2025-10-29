import Queue from 'bull';
import { promises as fs } from 'fs';
import path from 'path';
import redis from '../../config/redis';
import { query } from '../../config/database';
import { TTSConfig } from '../../shared/types';
import { generateContentHash } from '../../shared/utils/hash';
import { convertTextToSpeech, chunkText } from './ttsEngine';
import { uploadToS3, generateS3Key } from '../content/s3Client';
import { stitchAudioFiles } from './audioStitcher';
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

// Create Bull queue with timeout configuration
const audioQueue = new Queue<AudioConversionJobData>('audio-conversion', {
  redis: redisConfig,
  defaultJobOptions: {
    attempts: 3,
    timeout: 30 * 60 * 1000, // 30 minutes
    removeOnComplete: 100,
    removeOnFail: 500,
    backoff: {
      type: 'exponential',
      delay: 5000
    }
  }
});

// Process audio conversion jobs with concurrency limit
audioQueue.process(5, async (job) => {
  const { jobId, contentId, userId, text, voiceId, config } = job.data;

  // Track start time for timeout monitoring
  const startTime = Date.now();
  const timeoutMs = 30 * 60 * 1000;

  logger.info('Processing audio conversion job', { jobId, contentId, startTime });

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

    // Determine if chunking is needed
    const wordCount = text.split(/\s+/).length;
    const requiresChunking = wordCount > 1400;

    let finalAudioPath: string;
    let durationSeconds: number;
    let fileSizeBytes: number;

    if (requiresChunking) {
      logger.info('Text requires chunking', { jobId, wordCount });

      // Chunk the text
      const chunks = chunkText(text, 1400);
      await query('UPDATE conversion_jobs SET progress = $1 WHERE id = $2', [10, jobId]);

      logger.info('Text chunked', { jobId, chunkCount: chunks.length });

      // Convert each chunk to audio
      const chunkPaths: string[] = [];
      const progressPerChunk = 60 / chunks.length;

      for (let i = 0; i < chunks.length; i++) {
        const chunkPath = `/tmp/audio-${jobId}-chunk-${i}.mp3`;
        const chunkProgress = 10 + Math.round((i + 1) * progressPerChunk);

        logger.info('Converting chunk', { jobId, chunkIndex: i, totalChunks: chunks.length });

        try {
          await convertTextToSpeech(chunks[i], {
            voiceId,
            config,
            outputPath: chunkPath
          });

          chunkPaths.push(chunkPath);

          await query('UPDATE conversion_jobs SET progress = $1 WHERE id = $2', [chunkProgress, jobId]);
        } catch (error) {
          logger.error('Chunk conversion failed', { jobId, chunkIndex: i, error });

          // Clean up any created chunks
          for (const path of chunkPaths) {
            await fs.unlink(path).catch(() => {});
          }

          throw new Error(`Chunk ${i} conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Stitch audio files together
      await query('UPDATE conversion_jobs SET progress = $1 WHERE id = $2', [70, jobId]);

      logger.info('Stitching audio chunks', { jobId, chunkCount: chunkPaths.length });

      const stitchedPath = `/tmp/audio-${jobId}.mp3`;

      try {
        const stitchResult = await stitchAudioFiles(chunkPaths, stitchedPath);

        finalAudioPath = stitchResult.filePath;
        durationSeconds = stitchResult.durationSeconds;
        fileSizeBytes = stitchResult.fileSizeBytes;

        await query('UPDATE conversion_jobs SET progress = $1 WHERE id = $2', [80, jobId]);
      } catch (error) {
        logger.error('Audio stitching failed', { jobId, error });

        // Keep chunks for debugging
        logger.info('Preserving chunk files for debugging', { jobId, chunkPaths });

        throw new Error(`Audio stitching failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        // Clean up chunk files
        for (const chunkPath of chunkPaths) {
          await fs.unlink(chunkPath).catch(err => {
            logger.warn('Failed to clean up chunk file', { chunkPath, error: err });
          });
        }
      }
    } else {
      // Single chunk conversion (existing flow)
      await query('UPDATE conversion_jobs SET progress = $1 WHERE id = $2', [30, jobId]);

      const tempPath = `/tmp/audio-${jobId}.mp3`;
      const result = await convertTextToSpeech(text, {
        voiceId,
        config,
        outputPath: tempPath
      });

      finalAudioPath = result.audioPath;
      durationSeconds = result.durationSeconds;
      fileSizeBytes = result.fileSizeBytes;

      await query('UPDATE conversion_jobs SET progress = $1 WHERE id = $2', [70, jobId]);
    }

    // Upload to S3
    const s3Key = generateS3Key(userId, `${contentId}.mp3`, 'audio');
    const audioUrl = await uploadToS3(finalAudioPath, s3Key, 'audio/mpeg');

    await query('UPDATE conversion_jobs SET progress = $1 WHERE id = $2', [90, jobId]);

    // Save to audio cache
    const audioCacheResult = await query(
      `INSERT INTO audio_cache
        (content_hash, voice_id, audio_url, duration_seconds, file_size_bytes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [contentHash, voiceId, audioUrl, durationSeconds, fileSizeBytes]
    );

    const audioCacheId = audioCacheResult.rows[0].id;

    // Update job as completed
    await query(
      'UPDATE conversion_jobs SET status = $1, progress = $2, audio_cache_id = $3, completed_at = NOW() WHERE id = $4',
      ['completed', 100, audioCacheId, jobId]
    );

    // Clean up final temp file
    await fs.unlink(finalAudioPath).catch(err => {
      logger.warn('Failed to clean up final audio file', { finalAudioPath, error: err });
    });

    logger.info('Audio conversion completed', {
      jobId,
      audioCacheId,
      durationSeconds
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
