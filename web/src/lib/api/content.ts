/**
 * Content API
 * Content upload and management
 */

import { fetchAPI, uploadFile } from './client';
import { ContentItem, UploadResponse } from './types';

/**
 * Upload a file for text extraction
 */
export async function uploadContent(
  file: File,
  title?: string,
  author?: string
): Promise<ContentItem> {
  const additionalData: Record<string, string> = {};
  if (title) additionalData.title = title;
  if (author) additionalData.author = author;

  const response = await uploadFile<UploadResponse>(
    '/content/upload',
    file,
    additionalData
  );

  return response.content;
}

/**
 * Get content by ID
 */
export async function getContent(contentId: string): Promise<ContentItem> {
  return fetchAPI<ContentItem>(`/content/${contentId}`);
}

/**
 * List all content for the authenticated user
 */
export async function listContent(page: number = 1, limit: number = 20): Promise<ContentItem[]> {
  return fetchAPI<ContentItem[]>(`/content?page=${page}&limit=${limit}`);
}

/**
 * Delete content
 */
export async function deleteContent(contentId: string): Promise<void> {
  return fetchAPI<void>(`/content/${contentId}`, {
    method: 'DELETE',
  });
}
