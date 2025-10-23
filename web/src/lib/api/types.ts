/**
 * API Types
 * TypeScript interfaces matching backend API responses
 */

export interface User {
  id: string;
  email: string;
  name?: string;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface ContentItem {
  id: string;
  title: string;
  author?: string;
  type: 'book' | 'article' | 'pdf' | 'other';
  textContent: string;
  textHash: string;
  coverImageUrl?: string;
  createdAt: string;
}

export interface ConversionJob {
  id: string;
  contentId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  audioUrl?: string;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
}

export interface Voice {
  id: string;
  name: string;
  language: string;
  gender: 'male' | 'female';
  description: string;
}

export interface LibraryItem {
  id: string;
  content: ContentItem;
  addedAt: string;
  isFavorite: boolean;
}

export interface UserProgress {
  id: string;
  contentId: string;
  position: number;
  duration: number;
  completed: boolean;
  lastUpdated: string;
}

export interface UploadResponse {
  content: ContentItem;
}

export interface ConversionRequest {
  contentId: string;
  voiceId: string;
  speed?: number;
  pitch?: number;
}

export interface ConversionResponse {
  job: ConversionJob;
}

export interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
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
