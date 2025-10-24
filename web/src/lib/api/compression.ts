/**
 * Compression API
 * Content compression and version management
 */

import { fetchAPI } from './client';

export interface CompressionOptions {
  contentId: string;
  ratio: number; // 0.2, 0.4, 0.6
}

export interface CompressionResult {
  compressedContentId: string;
  originalWordCount: number;
  compressedWordCount: number;
  compressionRatio: number;
  processingTimeMs: number;
}

export interface CompressedVersion {
  id: string;
  compression_ratio: number;
  compressed_word_count: number;
  created_at: string;
}

/**
 * Compress content with specified compression ratio
 */
export async function compressContent(options: CompressionOptions): Promise<CompressionResult> {
  return fetchAPI<CompressionResult>('/compression/compress', {
    method: 'POST',
    body: JSON.stringify(options),
  });
}

/**
 * Get compressed content by ID
 */
export async function getCompressedContent(compressedId: string): Promise<any> {
  return fetchAPI<any>(`/compression/${compressedId}`);
}

/**
 * List all compressed versions for a content item
 */
export async function listCompressedVersions(contentId: string): Promise<CompressedVersion[]> {
  return fetchAPI<CompressedVersion[]>(`/compression/versions/${contentId}`);
}

/**
 * Delete a compressed version
 */
export async function deleteCompressedVersion(compressedId: string): Promise<void> {
  return fetchAPI<void>(`/compression/${compressedId}`, {
    method: 'DELETE',
  });
}
