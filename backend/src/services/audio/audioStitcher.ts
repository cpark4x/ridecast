import ffmpeg from 'fluent-ffmpeg';
import { promises as fs } from 'fs';
import path from 'path';
import logger from '../../shared/utils/logger';

export interface StitchedAudio {
  filePath: string;
  durationSeconds: number;
  fileSizeBytes: number;
}

export async function stitchAudioFiles(
  inputPaths: string[],
  outputPath: string
): Promise<StitchedAudio> {
  const startTime = Date.now();

  logger.debug('Starting audio stitching', {
    inputCount: inputPaths.length,
    outputPath
  });

  try {
    await validateInputFiles(inputPaths);

    const manifestPath = await createConcatManifest(inputPaths);

    try {
      await performStitching(manifestPath, outputPath);

      const stats = await fs.stat(outputPath);
      const durationSeconds = await getAudioDuration(outputPath);

      const elapsedMs = Date.now() - startTime;

      logger.info('Audio stitching completed', {
        inputCount: inputPaths.length,
        durationSeconds,
        fileSizeBytes: stats.size,
        elapsedMs
      });

      return {
        filePath: outputPath,
        durationSeconds,
        fileSizeBytes: stats.size
      };
    } finally {
      await fs.unlink(manifestPath).catch(err => {
        logger.warn('Failed to clean up manifest file', { manifestPath, error: err });
      });
    }
  } catch (error) {
    logger.error('Audio stitching failed', {
      inputPaths,
      outputPath,
      error
    });
    throw error;
  }
}

async function validateInputFiles(inputPaths: string[]): Promise<void> {
  if (!inputPaths || inputPaths.length === 0) {
    throw new Error('No input files provided for stitching');
  }

  for (const inputPath of inputPaths) {
    try {
      await fs.access(inputPath);
    } catch (error) {
      throw new Error(`Input file does not exist: ${inputPath}`);
    }
  }
}

async function createConcatManifest(inputPaths: string[]): Promise<string> {
  const manifestPath = `/tmp/concat-${Date.now()}-${Math.random().toString(36).substring(7)}.txt`;

  const manifestContent = inputPaths
    .map(filePath => `file '${filePath.replace(/'/g, "'\\''")}'`)
    .join('\n');

  await fs.writeFile(manifestPath, manifestContent, 'utf-8');

  logger.debug('Created concat manifest', { manifestPath, fileCount: inputPaths.length });

  return manifestPath;
}

async function performStitching(manifestPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(manifestPath)
      .inputOptions(['-f', 'concat', '-safe', '0'])
      .outputOptions(['-c', 'copy'])
      .output(outputPath)
      .on('start', (commandLine) => {
        logger.debug('FFmpeg command started', { command: commandLine });
      })
      .on('progress', (progress) => {
        logger.debug('FFmpeg progress', { progress });
      })
      .on('end', () => {
        logger.debug('FFmpeg stitching completed');
        resolve();
      })
      .on('error', (err, stdout, stderr) => {
        logger.error('FFmpeg stitching error', {
          error: err.message,
          stdout,
          stderr
        });
        reject(new Error(`Audio stitching failed: ${err.message}`));
      })
      .run();
  });
}

async function getAudioDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        logger.error('Failed to get audio duration', { filePath, error: err });
        reject(new Error(`Failed to get audio duration: ${err.message}`));
        return;
      }

      const duration = metadata.format.duration || 0;
      resolve(Math.round(duration));
    });
  });
}
