import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { CompressionOptions, AmplifierOutput } from './types';
import logger from '../../shared/utils/logger';

/**
 * Client for interacting with the amplifier audio-compressor CLI
 */

// Python 3 with the audio_compressor module from amplifier toolkit
const PYTHON_CMD = process.env.PYTHON_CMD || 'python3';
const AMPLIFIER_PATH = process.env.AMPLIFIER_PATH || path.join(process.cwd(), '..', 'amplifier');

/**
 * Execute the amplifier CLI to compress text
 */
export async function executeCompression(
  options: CompressionOptions
): Promise<AmplifierOutput> {
  const startTime = Date.now();
  let inputFile: string | null = null;
  let outputFile: string | null = null;

  try {
    // Create temp directory if it doesn't exist
    const tempDir = path.join(os.tmpdir(), 'ridecast-compression');
    await fs.mkdir(tempDir, { recursive: true });

    // Write input text to temp file
    inputFile = path.join(tempDir, `input-${Date.now()}-${Math.random().toString(36).slice(2)}.txt`);
    await fs.writeFile(inputFile, options.inputText, 'utf-8');

    // Define output file path
    outputFile = path.join(tempDir, `output-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);

    logger.info('Executing amplifier CLI', {
      ratio: options.ratio,
      inputLength: options.inputText.length,
      inputFile,
      outputFile
    });

    // Execute the Python CLI command
    // Construct command: python3 -m scenarios.audio_compressor.main --input X --output Y --ratio Z
    const audioCompressorPath = path.join(AMPLIFIER_PATH, 'scenarios', 'audio_compressor');
    const ratioMap: { [key: number]: string } = {
      0.2: 'light',
      0.4: 'medium',
      0.6: 'heavy'
    };
    const ratioStr = ratioMap[options.ratio] || 'medium';

    const args = [
      '-m', 'scenarios.audio_compressor.main',
      '--input', inputFile,
      '--output', outputFile,
      '--ratio', ratioStr
    ];

    await executeCLI(PYTHON_CMD, args, AMPLIFIER_PATH);

    // Read the output file (plain text, not JSON)
    const compressedText = await fs.readFile(outputFile, 'utf-8');

    const processingTime = Date.now() - startTime;

    // Calculate word counts
    const originalWordCount = options.inputText.split(/\s+/).filter(w => w.length > 0).length;
    const compressedWordCount = compressedText.split(/\s+/).filter(w => w.length > 0).length;
    const actualRatio = originalWordCount > 0 ? compressedWordCount / originalWordCount : 0;

    // Construct result matching AmplifierOutput interface
    const result: AmplifierOutput = {
      compressed_text: compressedText,
      metadata: {
        original_word_count: originalWordCount,
        compressed_word_count: compressedWordCount,
        target_ratio: options.ratio,
        actual_ratio: actualRatio,
        processing_time_ms: processingTime
      }
    };

    logger.info('Compression completed', {
      originalWords: originalWordCount,
      compressedWords: compressedWordCount,
      processingTime
    });

    return result;
  } catch (error) {
    logger.error('Amplifier CLI execution failed', { error });
    throw new Error(`Failed to execute compression: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    // Clean up temp files
    try {
      if (inputFile) await fs.unlink(inputFile);
      if (outputFile) await fs.unlink(outputFile);
    } catch (cleanupError) {
      logger.warn('Failed to clean up temp files', { cleanupError });
    }
  }
}

/**
 * Execute CLI command as a child process
 */
function executeCLI(command: string, args: string[], cwd?: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      cwd: cwd || process.cwd()
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('error', (error) => {
      logger.error('CLI process error', { error, command, args });
      reject(new Error(`Failed to spawn process: ${error.message}`));
    });

    child.on('close', (code) => {
      if (code === 0) {
        logger.debug('CLI process completed successfully', { stdout: stdout.trim() });
        resolve();
      } else {
        logger.error('CLI process exited with error', { code, stderr, stdout });
        reject(new Error(`CLI process exited with code ${code}: ${stderr || stdout}`));
      }
    });

    // Set timeout for long-running processes (5 minutes)
    const timeout = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error('CLI process timed out after 5 minutes'));
    }, 5 * 60 * 1000);

    child.on('close', () => {
      clearTimeout(timeout);
    });
  });
}

/**
 * Validate that the amplifier CLI is available
 */
export async function validateAmplifierCLI(): Promise<boolean> {
  try {
    // Try to run the audio_compressor module to validate it's available
    const args = ['-m', 'scenarios.audio_compressor.main', '--help'];
    await executeCLI(PYTHON_CMD, args, AMPLIFIER_PATH);
    return true;
  } catch (error) {
    logger.error('Amplifier CLI validation failed', { error, python: PYTHON_CMD, amplifier: AMPLIFIER_PATH });
    return false;
  }
}
