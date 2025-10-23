// User types
export interface User {
  id: string;
  email: string;
  password_hash: string;
  name: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  created_at: Date;
}

// Auth types
export interface AuthTokenPayload {
  userId: string;
  email: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

// Content types
export type ContentType = 'book' | 'article' | 'pdf' | 'epub' | 'txt' | 'other';

export interface Content {
  id: string;
  user_id: string;
  title: string;
  author: string | null;
  type: ContentType;
  text_content: string;
  text_hash: string;
  source_file_url: string | null;
  cover_image_url: string | null;
  file_size_bytes: number | null;
  word_count: number | null;
  created_at: Date;
}

export interface ContentMetadata {
  id: string;
  title: string;
  author: string | null;
  type: ContentType;
  word_count: number | null;
  created_at: Date;
}

// Audio types
export interface AudioCache {
  id: string;
  content_hash: string;
  voice_id: string;
  audio_url: string;
  duration_seconds: number;
  file_size_bytes: number;
  created_at: Date;
  last_accessed_at: Date;
  access_count: number;
}

export interface TTSConfig {
  speed: number; // 0.5 to 2.0
  pitch: number; // -50 to 50
}

export interface Voice {
  id: string;
  name: string;
  locale: string;
  gender: 'Male' | 'Female';
  preview_url?: string;
}

// Conversion job types
export type ConversionJobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface ConversionJob {
  id: string;
  content_id: string;
  user_id: string;
  status: ConversionJobStatus;
  progress: number;
  audio_cache_id: string | null;
  error_message: string | null;
  created_at: Date;
  completed_at: Date | null;
}

// User library types
export interface UserLibraryItem {
  id: string;
  user_id: string;
  content_id: string;
  added_at: Date;
  is_favorite: boolean;
}

// Playback progress types
export interface PlaybackProgress {
  id: string;
  user_id: string;
  content_id: string;
  position_seconds: number;
  duration_seconds: number;
  completed: boolean;
  updated_at: Date;
}

// Request types
export interface AuthRequest extends Express.Request {
  user?: AuthTokenPayload;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
