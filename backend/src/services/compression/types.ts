/**
 * Types for the compression service
 */

export interface CompressedContent {
  id: string;
  parent_content_id: string;
  user_id: string;
  compression_ratio: number;
  compressed_text: string;
  original_word_count: number;
  compressed_word_count: number;
  processing_time_ms?: number;
  quality_score?: number;
  created_at: Date;
  accessed_at: Date;
  access_count: number;
}

export interface CompressRequest {
  contentId: string;
  ratio: number;
}

export interface CompressResult {
  compressed_text: string;
  original_word_count: number;
  compressed_word_count: number;
  processing_time_ms: number;
  quality_score?: number;
}

export interface AmplifierOutput {
  compressed_text: string;
  metadata: {
    original_word_count: number;
    compressed_word_count: number;
    compression_ratio: number;
    processing_time_ms: number;
    quality_score?: number;
  };
}

export interface CompressionOptions {
  ratio: number;
  inputText: string;
}
