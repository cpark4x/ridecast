/**
 * TTS Module - Public API
 * Contract: web/docs/modules/tts-contract.md
 */

export { convertTextToAudio, extractText, validateFile } from './converter';
export { chunkText, estimateDuration } from './chunker';
export { getAvailableVoices, getDefaultVoice, getVoiceById } from './voices';
export type { TTSConfig, ConversionJob, TTSChunk, Voice, ConversionResult } from './types';
