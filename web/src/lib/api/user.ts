/**
 * User API
 * User profile, library, and progress management
 */

import { fetchAPI } from './client';
import { User, LibraryItem, UserProgress } from './types';

/**
 * Get current user profile
 */
export async function getProfile(): Promise<User> {
  return fetchAPI<User>('/user/profile');
}

/**
 * Update user profile
 */
export async function updateProfile(data: Partial<User>): Promise<User> {
  return fetchAPI<User>('/user/profile', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/**
 * Get user's library
 */
export async function getLibrary(): Promise<LibraryItem[]> {
  return fetchAPI<LibraryItem[]>('/user/library');
}

/**
 * Get playback progress for content
 */
export async function getProgress(contentId: string): Promise<UserProgress> {
  return fetchAPI<UserProgress>(`/user/progress/${contentId}`);
}

/**
 * Update playback progress
 */
export async function updateProgress(
  contentId: string,
  position: number,
  duration: number,
  completed: boolean = false
): Promise<UserProgress> {
  return fetchAPI<UserProgress>(`/user/progress/${contentId}`, {
    method: 'PUT',
    body: JSON.stringify({
      position,
      duration,
      completed,
    }),
  });
}

/**
 * Mark content as favorite
 */
export async function toggleFavorite(
  contentId: string,
  isFavorite: boolean
): Promise<void> {
  return fetchAPI<void>(`/user/library/${contentId}/favorite`, {
    method: 'PUT',
    body: JSON.stringify({ isFavorite }),
  });
}
